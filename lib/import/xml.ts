import type { FeedCategory, ParsedFeed, RawOffer, RawParam } from "./types"

/**
 * A small, allocation-light reader for product feeds.
 *
 * It does not build a DOM: it walks the tags once, keeps a stack of open
 * elements and, for every product record (<offer>, <item> or <product>),
 * collects the text of its direct children, its attributes and its
 * <param name="…"> values. Child content is taken verbatim between the
 * opening and closing tag, so HTML inside <description> survives whether it
 * is wrapped in CDATA, escaped, or (wrongly) left as raw tags.
 */

export class FeedParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "FeedParseError"
  }
}

const RECORD_TAGS = ["offer", "item", "product"] as const

// Markup we skip, then element tags. Attribute values may contain ">" inside quotes.
const TOKEN =
  /<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<![A-Za-z][^>]*>|<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>/g

const ATTRIBUTE = /([^\s=>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g

const NAMED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }

/**
 * Bytes of a feed → text. Honours a byte-order mark and the encoding in the
 * XML declaration (Ukrainian price lists are often windows-1251).
 */
export function decodeXmlBytes(bytes: Uint8Array): string {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return new TextDecoder("utf-8").decode(bytes.subarray(3))
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes.subarray(2))
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes.subarray(2))

  let head = ""
  for (let index = 0; index < Math.min(bytes.length, 200); index++) head += String.fromCharCode(bytes[index])
  const declared = /<\?xml[^>]*encoding\s*=\s*["']([\w.:-]+)["']/i.exec(head)?.[1]
  if (declared && !/^utf-?8$/i.test(declared)) {
    try {
      return new TextDecoder(declared.toLowerCase()).decode(bytes)
    } catch {
      // Unknown label: fall through to UTF-8.
    }
  }
  return new TextDecoder("utf-8").decode(bytes)
}

/** Decodes XML entities. Unknown named entities are left as written. */
export function decodeEntities(value: string): string {
  if (!value.includes("&")) return value
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? Number.parseInt(body.slice(2), 16) : Number.parseInt(body.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match
  })
}

/** Text content of an element's inner markup: CDATA kept verbatim, entities decoded elsewhere. */
export function innerText(raw: string): string {
  if (!raw.includes("<![CDATA[")) return decodeEntities(raw).trim()
  let result = ""
  let position = 0
  while (position < raw.length) {
    const start = raw.indexOf("<![CDATA[", position)
    if (start === -1) {
      result += decodeEntities(raw.slice(position))
      break
    }
    result += decodeEntities(raw.slice(position, start))
    const end = raw.indexOf("]]>", start + 9)
    if (end === -1) {
      result += raw.slice(start + 9)
      break
    }
    result += raw.slice(start + 9, end)
    position = end + 3
  }
  return result.trim()
}

export function parseAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {}
  if (!source) return attributes
  ATTRIBUTE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = ATTRIBUTE.exec(source))) {
    const value = match[2] ?? match[3] ?? match[4] ?? ""
    attributes[match[1]] = decodeEntities(value).trim()
  }
  return attributes
}

/** Picks the element that holds one product: the most frequent of offer/item/product, preferring offer. */
function detectRecordTag(xml: string): string | null {
  let best: string | null = null
  let bestCount = 0
  for (const tag of RECORD_TAGS) {
    const count = (xml.match(new RegExp(`<${tag}[\\s>/]`, "g")) ?? []).length
    if (count > bestCount) {
      best = tag
      bestCount = count
    }
  }
  return best
}

/** `name` keeps the tag as written (field keys are case-sensitive, as in XML); `tag` is lower-case for matching. */
type OpenChild = { name: string; tag: string; contentStart: number; attrs: Record<string, string>; depth: number }

export function parseFeed(xml: string): ParsedFeed {
  const text = xml.replace(/^﻿/, "")
  const firstMark = text.search(/\S/)
  if (firstMark === -1 || text[firstMark] !== "<") {
    throw new FeedParseError("Це не файл XML. Потрібен файл із товарами від постачальника (.xml або .yml).")
  }

  const recordTag = detectRecordTag(text)
  if (!recordTag) {
    throw new FeedParseError("У файлі не знайдено товарів. Кожен товар має бути записаний як <offer>, <item> або <product>: попросіть у постачальника файл у форматі YML.")
  }

  const warnings: string[] = []
  const categories: FeedCategory[] = []
  const seenCategoryIds = new Set<string>()
  const offers: RawOffer[] = []

  const stack: string[] = []
  let rootTag = ""
  let date: string | null = null
  let shopName = ""

  let record: RawOffer | null = null
  let recordDepth = -1
  let child: OpenChild | null = null
  let category: { attrs: Record<string, string>; contentStart: number; depth: number } | null = null
  let shopNameStart = -1

  TOKEN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = TOKEN.exec(text))) {
    const name = match[2]
    if (!name) continue // CDATA, comment, processing instruction, doctype

    const closing = match[1] === "/"
    const selfClosing = match[4] === "/"
    const tag = name.toLowerCase()

    if (!closing) {
      const attrs = parseAttributes(match[3])
      const depth = stack.length

      if (depth === 0) {
        rootTag = tag
        if (attrs.date) date = attrs.date
      }

      if (!record && tag === recordTag) {
        record = { line: offers.length + 1, attrs, fields: {}, params: [] }
        recordDepth = depth
        if (selfClosing) {
          offers.push(record)
          record = null
          recordDepth = -1
        } else {
          stack.push(tag)
        }
        continue
      }

      if (record && depth === recordDepth + 1 && !child) {
        if (selfClosing) {
          if (tag === "param") {
            if (attrs.name) record.params.push({ name: attrs.name, value: "", ...(attrs.unit ? { unit: attrs.unit } : {}) })
          } else {
            ;(record.fields[name] ??= []).push("")
          }
          continue
        }
        child = { name, tag, contentStart: TOKEN.lastIndex, attrs, depth }
        stack.push(tag)
        continue
      }

      if (!record && tag === "category" && !category && stack.includes("categories")) {
        if (selfClosing) {
          pushCategory(attrs, "")
          continue
        }
        category = { attrs, contentStart: TOKEN.lastIndex, depth }
        stack.push(tag)
        continue
      }

      if (!record && !category && tag === "name" && stack[stack.length - 1] === "shop" && shopNameStart === -1 && !selfClosing) {
        shopNameStart = TOKEN.lastIndex
      }

      if (!selfClosing) stack.push(tag)
      continue
    }

    // Closing tag: pop up to the matching open element (tolerates unclosed children).
    const index = stack.lastIndexOf(tag)
    if (index === -1) continue
    const depth = index
    stack.length = index

    if (child && depth === child.depth && tag === child.tag && record) {
      const value = innerText(text.slice(child.contentStart, match.index))
      if (child.tag === "param") {
        const paramName = child.attrs.name
        if (paramName) {
          const param: RawParam = { name: paramName, value }
          if (child.attrs.unit) param.unit = child.attrs.unit
          record.params.push(param)
        }
      } else {
        ;(record.fields[child.name] ??= []).push(value)
      }
      child = null
      continue
    }
    if (child && depth < child.depth) child = null

    if (record && depth === recordDepth && tag === recordTag) {
      offers.push(record)
      record = null
      recordDepth = -1
      child = null
      continue
    }

    if (category && depth === category.depth && tag === "category") {
      pushCategory(category.attrs, innerText(text.slice(category.contentStart, match.index)))
      category = null
      continue
    }

    if (shopNameStart >= 0 && tag === "name") {
      shopName = innerText(text.slice(shopNameStart, match.index))
      shopNameStart = -2
    }
  }

  if (record) {
    warnings.push("Файл обривається посеред останнього товару, тому цей товар пропущено. Схоже, файл завантажився не повністю: спробуйте завантажити його ще раз.")
  }

  if (offers.length === 0) {
    throw new FeedParseError("У файлі не знайдено жодного товару.")
  }

  return {
    format: rootTag === "yml_catalog" ? "yml" : "generic",
    recordTag,
    shopName,
    date,
    categories,
    offers,
    warnings,
  }

  function pushCategory(attrs: Record<string, string>, name: string) {
    const id = (attrs.id ?? "").trim()
    if (!id) {
      warnings.push(`Категорію «${name || "без назви"}» пропущено: у файлі в неї немає коду.`)
      return
    }
    if (seenCategoryIds.has(id)) {
      warnings.push(`Категорія з кодом «${id}» записана у файлі двічі. Використано перший запис.`)
      return
    }
    seenCategoryIds.add(id)
    const parentId = (attrs.parentId ?? attrs.parentid ?? attrs.parent_id ?? "").trim()
    categories.push({ id, parentId: parentId && parentId !== id ? parentId : null, name: name.replace(/\s+/g, " ").trim() })
  }
}
