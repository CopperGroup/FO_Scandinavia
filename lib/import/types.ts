/**
 * Shapes shared by the XML import: the parser, the mapping, the review and
 * the client wizard. Everything here is plain data (serialisable).
 */

export type RawParam = { name: string; value: string; unit?: string }

/** One product record of the feed, before any mapping. */
export type RawOffer = {
  /** 1-based position in the feed, shown to the admin as "рядок". */
  line: number
  /** Attributes of the record element: id, available, group_id… */
  attrs: Record<string, string>
  /** Child elements by tag name; repeated tags (picture) keep every value. */
  fields: Record<string, string[]>
  params: RawParam[]
}

export type FeedCategory = { id: string; parentId: string | null; name: string }

export type ParsedFeed = {
  /** "yml" for <yml_catalog>/<shop>/<offers>, otherwise "generic". */
  format: "yml" | "generic"
  /** The element that holds one product: offer, item or product. */
  recordTag: string
  shopName: string
  date: string | null
  categories: FeedCategory[]
  offers: RawOffer[]
  warnings: string[]
}

/** What a product field is read from: "@attr" for an attribute of the record, a tag name otherwise, "" for nothing. */
export type SourceKey = string

export const TARGET_FIELDS = [
  "articleNumber",
  "name",
  "price",
  "oldPrice",
  "vendor",
  "category",
  "images",
  "description",
  "available",
  "quantity",
  "url",
] as const

export type TargetField = (typeof TARGET_FIELDS)[number]

export type FieldMapping = Record<TargetField, SourceKey> & {
  /** Import every <param name="…"> as a product characteristic. */
  params: boolean
}

export type FieldInfo = {
  key: SourceKey
  /** Share of records that have a non-empty value, 0..1. */
  coverage: number
  /** A few example values, shortened. */
  examples: string[]
}

/** A feed record turned into product fields. */
export type ImportItem = {
  line: number
  /** Matching key: the article number (falls back to the offer id when the mapped article is empty). */
  key: string
  offerId: string
  articleNumber: string
  name: string
  /** Full price (the store's `price`); equals `priceToShow` when there is no discount. */
  price: number
  /** Selling price (the store's `priceToShow`). */
  priceToShow: number
  vendor: string
  categoryExternalId: string
  images: string[]
  description: string
  isAvailable: boolean
  quantity: number
  url: string
  params: { name: string; value: string }[]
  /** Reasons the record cannot be imported. Empty when it is fine. */
  problems: string[]
  /** Things worth knowing that do not block the import. */
  notes: string[]
}

export type MissingMode = "keep" | "unavailable" | "delete"
export type CategoryMode = "keep" | "feed"

export type ImportOptions = {
  /** Products imported earlier (isFetched) whose article is not in this feed. */
  missing: MissingMode
  /** Whether existing products move to the category the feed gives them. */
  categories: CategoryMode
  /** Quantity for available products when the feed has no quantity field. */
  defaultQuantity: number
}

export const DEFAULT_OPTIONS: ImportOptions = { missing: "keep", categories: "keep", defaultQuantity: 10 }

export type RowStatus = "new" | "update" | "same" | "skip"

/** One line of the review table. */
export type ReviewRow = {
  key: string
  line: number
  name: string
  articleNumber: string
  priceToShow: number
  price: number
  image: string
  category: string
  status: RowStatus
  /** Why it is skipped (status "skip") or what to know about it. */
  reasons: string[]
  /** Labels of the fields that change (status "update"). */
  changes: string[]
}

export type CategoryNode = { id: string; name: string; isNew: boolean; children: CategoryNode[] }

export type ReviewSummary = {
  total: number
  counts: Record<RowStatus, number>
  skipReasons: { reason: string; count: number }[]
  newCategories: CategoryNode[]
  newCategoryCount: number
  missing: { count: number; examples: { articleNumber: string; name: string }[] }
}

export type FeedSummary = {
  token: string
  fileName: string
  bytes: number
  format: ParsedFeed["format"]
  recordTag: string
  shopName: string
  date: string | null
  offerCount: number
  categoryCount: number
  warnings: string[]
  fields: FieldInfo[]
  mapping: FieldMapping
  /** The first records, for the mapping preview. */
  sample: RawOffer[]
  categories: FeedCategory[]
}

export type ImportReport = {
  created: number
  updated: number
  unchanged: number
  skipped: number
  failed: { key: string; name: string; reason: string }[]
  categoriesCreated: number
  missingHandled: number
  missingMode: MissingMode
  ms: number
}

export type JobProgress = {
  jobId: string
  done: number
  total: number
  stage: "categories" | "products" | "missing" | "finishing" | "done" | "failed"
  report: ImportReport | null
  error: string | null
}
