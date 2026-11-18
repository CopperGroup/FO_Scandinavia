import type { FeedCategory, FieldInfo, FieldMapping, ImportItem, ParsedFeed, RawOffer, SourceKey, TargetField } from "./types"

/** Product fields the admin can map, in the order they are shown, with plain-language labels. */
export const TARGET_LABELS: Record<TargetField, { label: string; hint: string; required?: boolean }> = {
  articleNumber: { label: "Артикул", hint: "За артикулом магазин упізнає товар під час наступного імпорту.", required: true },
  name: { label: "Назва", hint: "Товар без назви не імпортується.", required: true },
  price: { label: "Ціна продажу", hint: "Ціна, за якою товар продається зараз.", required: true },
  oldPrice: { label: "Стара ціна", hint: "Ціна до знижки; показується закресленою." },
  vendor: { label: "Виробник", hint: "Бренд або виробник." },
  category: { label: "Категорія", hint: "Код категорії товару з файлу." },
  images: { label: "Фото", hint: "Усі посилання з цього поля стають фото товару." },
  description: { label: "Опис", hint: "Текст опису; оформлення зберігається." },
  available: { label: "Наявність", hint: "Чи є товар у постачальника. Якщо у файлі не вказано, вважаємо, що є." },
  quantity: { label: "Кількість", hint: "Залишок на складі." },
  url: { label: "Посилання на джерело", hint: "Сторінка товару в постачальника." },
}

// Most likely source first. "@x" is an attribute of the record element.
const CANDIDATES: Record<TargetField, SourceKey[]> = {
  articleNumber: ["vendorCode", "vendorcode", "article", "sku", "code", "@id"],
  name: ["name", "model", "title"],
  price: ["price", "price_uah", "retail_price"],
  oldPrice: ["oldprice", "old_price", "price_old", "oldPrice"],
  vendor: ["vendor", "brand", "manufacturer"],
  category: ["categoryId", "categoryid", "category_id", "category"],
  images: ["picture", "image", "images", "photo", "img"],
  description: ["description", "description_ua", "desc"],
  available: ["@available", "available", "in_stock", "instock"],
  quantity: ["stock_quantity", "quantity_in_stock", "quantity", "stock", "count", "amount"],
  url: ["url", "link"],
}

/** Value of a source key on one record: the first value of a tag, or an attribute. */
export function firstValue(offer: RawOffer, key: SourceKey): string {
  if (!key) return ""
  if (key.startsWith("@")) return offer.attrs[key.slice(1)] ?? ""
  return offer.fields[key]?.[0] ?? ""
}

export function allValues(offer: RawOffer, key: SourceKey): string[] {
  if (!key) return []
  if (key.startsWith("@")) {
    const value = offer.attrs[key.slice(1)]
    return value ? [value] : []
  }
  return offer.fields[key] ?? []
}

function shorten(value: string, length = 60): string {
  const plain = value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  return plain.length > length ? `${plain.slice(0, length - 1)}…` : plain
}

/** Every attribute and child tag found on the records, with how many records have it. */
export function detectFields(offers: RawOffer[]): FieldInfo[] {
  const stats = new Map<string, { filled: number; examples: string[] }>()
  for (const offer of offers) {
    const seen = new Set<string>()
    const note = (key: string, value: string) => {
      let entry = stats.get(key)
      if (!entry) stats.set(key, (entry = { filled: 0, examples: [] }))
      if (value && !seen.has(key)) {
        entry.filled += 1
        seen.add(key)
        if (entry.examples.length < 3) {
          const example = shorten(value)
          if (example && !entry.examples.includes(example)) entry.examples.push(example)
        }
      }
    }
    for (const [name, value] of Object.entries(offer.attrs)) note(`@${name}`, value)
    for (const [tag, values] of Object.entries(offer.fields)) note(tag, values.find(Boolean) ?? "")
  }
  const total = Math.max(offers.length, 1)
  return Array.from(stats, ([key, entry]) => ({ key, coverage: entry.filled / total, examples: entry.examples })).sort(
    (a, b) => Number(b.key.startsWith("@")) - Number(a.key.startsWith("@")) || b.coverage - a.coverage || a.key.localeCompare(b.key),
  )
}

/** The mapping that fits a typical YML feed without any clicks. */
export function suggestMapping(fields: FieldInfo[]): FieldMapping {
  const coverage = new Map(fields.map((field) => [field.key.toLowerCase(), field]))
  const pick = (target: TargetField, minCoverage: number): SourceKey => {
    for (const candidate of CANDIDATES[target]) {
      const field = coverage.get(candidate.toLowerCase())
      if (field && field.coverage >= minCoverage) return field.key
    }
    return ""
  }

  return {
    // A vendorCode only works as the key when (almost) every record has one; otherwise the offer id is the key.
    articleNumber: pick("articleNumber", 0.9) || pick("articleNumber", 0),
    name: pick("name", 0),
    price: pick("price", 0),
    oldPrice: pick("oldPrice", 0),
    vendor: pick("vendor", 0),
    category: pick("category", 0),
    images: pick("images", 0),
    description: pick("description", 0),
    available: pick("available", 0),
    quantity: pick("quantity", 0),
    url: pick("url", 0),
    params: true,
  }
}

/** "1 299,50" → 1299.5. NaN when there is no number. */
export function parseNumber(value: string): number {
  const cleaned = value.replace(/[\s ]/g, "").replace(/[^\d,.-]/g, "")
  if (!cleaned) return Number.NaN
  // "1.299,50" (dot thousands, comma decimals) or "1,299.50"
  const lastComma = cleaned.lastIndexOf(",")
  const lastDot = cleaned.lastIndexOf(".")
  let normalised = cleaned
  if (lastComma > -1 && lastDot > -1) {
    normalised = lastComma > lastDot ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned.replace(/,/g, "")
  } else if (lastComma > -1) {
    normalised = cleaned.replace(",", ".")
  }
  const number = Number.parseFloat(normalised)
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : Number.NaN
}

const TRUE_WORDS = new Set(["true", "1", "yes", "y", "так", "+", "в наявності", "є в наявності", "instock", "in stock", "available"])
const FALSE_WORDS = new Set(["false", "0", "no", "n", "ні", "-", "немає", "немає в наявності", "outofstock", "out of stock"])

/** Null when the value says nothing. */
export function parseAvailability(value: string): boolean | null {
  const word = value.trim().toLowerCase()
  if (!word) return null
  if (TRUE_WORDS.has(word)) return true
  if (FALSE_WORDS.has(word)) return false
  return null
}

/** Image URLs from the tag values: splits lists, drops whitespace inside URLs, keeps http(s) and site paths. */
export function parseImages(values: string[]): string[] {
  const result: string[] = []
  for (const raw of values) {
    const value = raw.trim()
    if (!value) continue
    const parts = (value.match(/https?:\/\//g) ?? []).length > 1 ? value.split(/[\s,;|]+(?=https?:\/\/)/) : [value]
    for (const part of parts) {
      const url = part.replace(/\s+/g, "")
      if ((/^https?:\/\/[^/]+/i.test(url) || /^\/[^/]/.test(url)) && !result.includes(url)) result.push(url)
    }
  }
  return result
}

const collapse = (value: string) => value.replace(/\s+/g, " ").trim()

export type MapContext = {
  categoryIds: Set<string>
  defaultQuantity: number
}

/** One record → product fields, with the reasons it cannot be imported. */
export function mapOffer(offer: RawOffer, mapping: FieldMapping, context: MapContext): ImportItem {
  const problems: string[] = []
  const notes: string[] = []

  const offerId = (offer.attrs.id ?? "").trim()
  const mappedArticle = collapse(firstValue(offer, mapping.articleNumber))
  const articleNumber = mappedArticle || offerId
  if (!articleNumber) problems.push("Немає артикула")
  else if (!mappedArticle && mapping.articleNumber && mapping.articleNumber !== "@id") notes.push("Немає артикула: замість нього взято код товару з файлу")

  const name = collapse(firstValue(offer, mapping.name))
  if (!name) problems.push("Немає назви")

  const priceToShow = parseNumber(firstValue(offer, mapping.price))
  if (!(priceToShow > 0)) problems.push("Немає ціни")
  const oldPrice = parseNumber(firstValue(offer, mapping.oldPrice))
  const price = oldPrice > priceToShow ? oldPrice : priceToShow

  const availability = mapping.available ? parseAvailability(firstValue(offer, mapping.available)) : null
  const isAvailable = availability ?? true

  const quantityValue = mapping.quantity ? parseNumber(firstValue(offer, mapping.quantity)) : Number.NaN
  const quantity = Number.isFinite(quantityValue) ? Math.max(0, Math.floor(quantityValue)) : isAvailable ? context.defaultQuantity : 0

  const categoryExternalId = collapse(firstValue(offer, mapping.category))
  if (categoryExternalId && !context.categoryIds.has(categoryExternalId)) {
    notes.push(`Категорії з кодом «${categoryExternalId}» немає у файлі: товар буде без категорії`)
  } else if (!categoryExternalId && mapping.category) {
    notes.push("Без категорії")
  }

  const url = collapse(firstValue(offer, mapping.url))

  const params: { name: string; value: string }[] = []
  if (mapping.params) {
    const seen = new Set<string>()
    for (const param of offer.params) {
      const paramName = collapse(param.name)
      const value = collapse(param.unit && param.value && !param.value.endsWith(param.unit) ? `${param.value} ${param.unit}` : param.value)
      const id = `${paramName.toLowerCase()}\u0000${value.toLowerCase()}`
      if (!paramName || !value || seen.has(id)) continue
      seen.add(id)
      params.push({ name: paramName, value })
    }
  }

  return {
    line: offer.line,
    key: articleNumber,
    offerId,
    articleNumber,
    name,
    price: Number.isFinite(price) ? price : 0,
    priceToShow: Number.isFinite(priceToShow) ? priceToShow : 0,
    vendor: collapse(firstValue(offer, mapping.vendor)),
    categoryExternalId: categoryExternalId && context.categoryIds.has(categoryExternalId) ? categoryExternalId : "",
    images: parseImages(allValues(offer, mapping.images)),
    description: firstValue(offer, mapping.description).trim(),
    isAvailable,
    quantity,
    url: /^https?:\/\//i.test(url) ? url : "",
    params,
    problems,
    notes,
  }
}

/** Marks the second and later records with the same article or the same id. The first one wins. */
export function markDuplicates(items: ImportItem[]): ImportItem[] {
  const byKey = new Map<string, number>()
  const byOfferId = new Map<string, number>()
  for (const item of items) {
    if (item.key) {
      const first = byKey.get(item.key.toLowerCase())
      if (first !== undefined) item.problems.push(`Повторюється артикул «${item.key}» (уперше в записі № ${first})`)
      else byKey.set(item.key.toLowerCase(), item.line)
    }
    if (item.offerId) {
      const first = byOfferId.get(item.offerId)
      if (first !== undefined && !item.problems.some((problem) => problem.startsWith("Повторюється"))) {
        item.problems.push(`Повторюється код товару «${item.offerId}» (уперше в записі № ${first})`)
      } else if (first === undefined) byOfferId.set(item.offerId, item.line)
    }
  }
  return items
}

export function mapFeed(feed: Pick<ParsedFeed, "offers" | "categories">, mapping: FieldMapping, defaultQuantity: number): ImportItem[] {
  const context: MapContext = { categoryIds: new Set(feed.categories.map((category) => category.id)), defaultQuantity }
  return markDuplicates(feed.offers.map((offer) => mapOffer(offer, mapping, context)))
}

/** Problems with the mapping itself, shown before the admin can continue. */
export function mappingProblems(mapping: FieldMapping): string[] {
  const problems: string[] = []
  if (!mapping.name) problems.push("Оберіть, звідки брати назву товару.")
  if (!mapping.price) problems.push("Оберіть, звідки брати ціну.")
  return problems
}

/** Categories keyed by id, for building names and trees. */
export function categoryIndex(categories: FeedCategory[]): Map<string, FeedCategory> {
  return new Map(categories.map((category) => [category.id, category]))
}

/** "Жіночий одяг / Сукні" for the review table. */
export function categoryPath(id: string, index: Map<string, FeedCategory>): string {
  const names: string[] = []
  const seen = new Set<string>()
  let current = index.get(id)
  while (current && !seen.has(current.id) && names.length < 6) {
    seen.add(current.id)
    names.unshift(current.name || current.id)
    current = current.parentId ? index.get(current.parentId) : undefined
  }
  return names.join(" / ")
}
