import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto"

/**
 * Secrets the owner pastes into the admin panel (API keys) are stored in the
 * database sealed with AES-256-GCM. The sealing key never leaves the server:
 * it is derived from SETTINGS_SECRET, or ENCRYPTION_KEY, or NEXTAUTH_SECRET
 * (the first one that is set). Someone with a copy of the database but without
 * the server's environment cannot read the values.
 *
 * A sealed value never goes to the browser. Pages show `maskSecret()` of it.
 *
 * Format: "v1.<iv>.<tag>.<ciphertext>", each part base64url.
 * tools/migrate-settings-from-env.mjs writes the same format.
 */

const PREFIX = "v1"
const SALT = "nordiva-settings-v1"

export class SecretKeyMissing extends Error {
  constructor() {
    super("No server secret to seal settings with: set SETTINGS_SECRET (or ENCRYPTION_KEY, or NEXTAUTH_SECRET) in the server environment.")
    this.name = "SecretKeyMissing"
  }
}

let cached: { source: string; key: Buffer } | null = null

function sealingKey(): Buffer {
  const source = process.env.SETTINGS_SECRET || process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || ""
  if (!source) throw new SecretKeyMissing()
  if (!cached || cached.source !== source) cached = { source, key: scryptSync(source, SALT, 32) }
  return cached.key
}

/** True when the server can seal and open secrets. */
export function canSealSecrets(): boolean {
  return Boolean(process.env.SETTINGS_SECRET || process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET)
}

export function sealSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", sealingKey(), iv)
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  return [PREFIX, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".")
}

/** The plain value, or null when the text is not a sealed value or was sealed with another key. */
export function openSecret(sealed: unknown): string | null {
  if (typeof sealed !== "string") return null
  const [prefix, iv, tag, body] = sealed.split(".")
  if (prefix !== PREFIX || !iv || !tag || body === undefined) return null
  try {
    const decipher = createDecipheriv("aes-256-gcm", sealingKey(), Buffer.from(iv, "base64url"))
    decipher.setAuthTag(Buffer.from(tag, "base64url"))
    return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8")
  } catch {
    return null
  }
}

/** What a page may show of a secret: its last four characters. */
export function maskSecret(plain: string): string {
  const tail = plain.slice(-4)
  return plain.length > 8 ? `••••${tail}` : "••••"
}
