/**
 * Rules for feed URLs the server is allowed to download (SSRF protection).
 * Pure: the server resolves the host name and checks every address with
 * `isPrivateAddress`, on every redirect hop.
 */

export const MAX_FEED_BYTES = 50 * 1024 * 1024

const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home.arpa", ".intranet", ".corp"]

function ipv4ToNumber(ip: string): number | null {
  const parts = ip.split(".")
  if (parts.length !== 4) return null
  let value = 0
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    const octet = Number(part)
    if (octet > 255) return null
    value = value * 256 + octet
  }
  return value
}

const V4_BLOCKED: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
]

function isPrivateV4(ip: string): boolean {
  const value = ipv4ToNumber(ip)
  if (value === null) return true // not a valid address: refuse
  return V4_BLOCKED.some(([base, bits]) => {
    const start = ipv4ToNumber(base) as number
    return value >= start && value < start + 2 ** (32 - bits)
  })
}

/** Expands an IPv6 address to 8 groups of numbers; null when it is not one. */
function parseV6(ip: string): number[] | null {
  let address = ip.toLowerCase()
  const zone = address.indexOf("%")
  if (zone !== -1) address = address.slice(0, zone)

  // Trailing dotted IPv4 ("::ffff:10.0.0.1").
  const dotted = /(\d+\.\d+\.\d+\.\d+)$/.exec(address)
  if (dotted) {
    const v4 = ipv4ToNumber(dotted[1])
    if (v4 === null) return null
    address = `${address.slice(0, -dotted[1].length)}${(v4 >>> 16).toString(16)}:${(v4 & 0xffff).toString(16)}`
  }

  const halves = address.split("::")
  if (halves.length > 2) return null
  const head = halves[0] ? halves[0].split(":") : []
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : []
  const missing = 8 - head.length - tail.length
  if (halves.length === 1 ? head.length !== 8 : missing < 1) return null
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...tail]
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) return null
  return groups.map((group) => Number.parseInt(group, 16))
}

/** True for loopback, private, link-local, CGNAT, multicast, documentation and other non-public addresses. */
export function isPrivateAddress(ip: string): boolean {
  const address = ip.replace(/^\[|\]$/g, "")
  if (/^\d+\.\d+\.\d+\.\d+$/.test(address)) return isPrivateV4(address)

  const groups = parseV6(address)
  if (!groups) return true
  const [g0, g1, g2, , , g5, g6, g7] = groups
  const embeddedV4 = `${g6 >> 8}.${g6 & 255}.${g7 >> 8}.${g7 & 255}`

  if (groups.every((group) => group === 0)) return true // ::
  if (groups.slice(0, 7).every((group) => group === 0) && g7 === 1) return true // ::1
  if (groups.slice(0, 5).every((group) => group === 0) && (g5 === 0xffff || g5 === 0)) return isPrivateV4(embeddedV4) // mapped / compatible
  if (g0 === 0x64 && g1 === 0xff9b) return isPrivateV4(embeddedV4) // NAT64
  if ((g0 & 0xfe00) === 0xfc00) return true // fc00::/7 unique local
  if ((g0 & 0xffc0) === 0xfe80) return true // fe80::/10 link-local
  if ((g0 & 0xffc0) === 0xfec0) return true // fec0::/10 site-local (deprecated)
  if ((g0 & 0xff00) === 0xff00) return true // multicast
  if (g0 === 0x2001 && g1 === 0x0db8) return true // documentation
  if (g0 === 0x2002) return isPrivateV4(`${g1 >> 8}.${g1 & 255}.${g2 >> 8}.${g2 & 255}`) // 6to4
  return false
}

export type UrlCheck = { ok: true; url: URL } | { ok: false; error: string }

/** Checks the shape of a feed URL before any network access. */
export function checkFeedUrl(input: string): UrlCheck {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return { ok: false, error: "Це не схоже на посилання. Вставте повну адресу, що починається з https://" }
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, error: "Посилання має починатися з http:// або https://" }
  }
  if (url.username || url.password) {
    return { ok: false, error: "У посиланні є логін і пароль. Попросіть у постачальника посилання без них або завантажте файл з комп’ютера." }
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, "")
  if (!host || host === "localhost" || BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix)) || !host.includes(".") && !host.startsWith("[")) {
    return { ok: false, error: "Це посилання відкривається лише у внутрішній мережі. Вставте посилання, яке відкривається в браузері з будь-якого комп’ютера." }
  }
  const literal = host.replace(/^\[|\]$/g, "")
  if ((/^\d+\.\d+\.\d+\.\d+$/.test(literal) || literal.includes(":")) && isPrivateAddress(literal)) {
    return { ok: false, error: "Це посилання відкривається лише у внутрішній мережі. Вставте посилання, яке відкривається в браузері з будь-якого комп’ютера." }
  }
  return { ok: true, url }
}
