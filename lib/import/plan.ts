import { categoryIndex, categoryPath } from "./mapping"
import type {
  CategoryNode,
  FeedCategory,
  FieldMapping,
  ImportItem,
  ImportOptions,
  ReviewRow,
  ReviewSummary,
  RowStatus,
} from "./types"

/**
 * The diff between a feed and the database, as pure functions: which records
 * are new, which change (and what), which are unchanged or skipped, which
 * categories must be created and which earlier-imported products are no
 * longer in the feed. The server feeds it plain rows read from MongoDB.
 */

export type ExistingProduct = {
  _id: string
  articleNumber: string
  name: string
  price: number
  priceToShow: number
  isAvailable: boolean
  quantity: number
  images: string[]
  vendor: string
  description: string
  url: string
  params: { name: string; value: string }[]
  category: string[]
  isFetched: boolean
}

export type ExistingCategory = { _id: string; externalId: string; name: string }

export type FetchedProduct = { _id: string; articleNumber: string; name: string }

/** Product fields as they would be written. `category` holds category _ids, or "new:<externalId>" for categories still to create. */
export type ProductFields = {
  name?: string
  price?: number
  priceToShow?: number
  isAvailable?: boolean
  quantity?: number
  images?: string[]
  vendor?: string
  description?: string
  url?: string
  params?: { name: string; value: string }[]
  category?: string[]
}

export type ItemDecision = {
  item: ImportItem
  status: RowStatus
  /** Existing products with this article (more than one when the database already has duplicates). */
  matches: ExistingProduct[]
  /** Per matched product: the fields to $set. Only products that change are listed. */
  updates: { _id: string; set: ProductFields }[]
  changes: string[]
  reasons: string[]
}

export type ImportPlan = {
  decisions: ItemDecision[]
  /** Categories to create, parents before children. */
  categoriesToCreate: FeedCategory[]
  missing: FetchedProduct[]
  summary: ReviewSummary
}

const FIELD_LABELS: Record<keyof ProductFields, string> = {
  name: "назва",
  price: "стара ціна",
  priceToShow: "ціна",
  isAvailable: "наявність",
  quantity: "кількість",
  images: "фото",
  vendor: "виробник",
  description: "опис",
  url: "посилання",
  params: "характеристики",
  category: "категорія",
}

export const categoryRef = (externalId: string, existing: Map<string, ExistingCategory>): string =>
  existing.get(externalId)?._id ?? `new:${externalId}`

/** The fields a new product gets. */
export function newProductFields(item: ImportItem, categoryId: string | null): Required<ProductFields> {
  return {
    name: item.name,
    price: item.price,
    priceToShow: item.priceToShow,
    isAvailable: item.isAvailable,
    quantity: item.quantity,
    images: item.images,
    vendor: item.vendor,
    description: item.description,
    url: item.url,
    params: item.params,
    category: categoryId ? [categoryId] : [],
  }
}

/** What the feed wants an existing product to look like. Fields the mapping leaves out are not touched. */
export function desiredFields(
  item: ImportItem,
  existing: ExistingProduct,
  mapping: FieldMapping,
  options: Pick<ImportOptions, "categories">,
  categoryId: string | null,
): ProductFields {
  const fields: ProductFields = {}
  if (mapping.name) fields.name = item.name
  if (mapping.price) {
    fields.priceToShow = item.priceToShow
    fields.price = item.price
  }
  if (mapping.available) fields.isAvailable = item.isAvailable
  if (mapping.quantity) fields.quantity = item.quantity
  else if (item.isAvailable && !(existing.quantity > 0)) fields.quantity = item.quantity // came back in stock: give it the default quantity
  if (mapping.images && item.images.length > 0) fields.images = item.images
  if (mapping.vendor) fields.vendor = item.vendor
  if (mapping.description) fields.description = item.description
  if (mapping.url) fields.url = item.url
  if (mapping.params) fields.params = item.params
  if (options.categories === "feed" && categoryId) fields.category = [categoryId]
  return fields
}

const sameNumber = (a: number, b: number) => Math.abs((Number(a) || 0) - (Number(b) || 0)) < 0.005
const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((value, index) => value === b[index])
const sameParams = (a: { name: string; value: string }[], b: { name: string; value: string }[]) =>
  a.length === b.length && a.every((param, index) => param.name === b[index].name && param.value === b[index].value)

/** The subset of `desired` that differs from the product. */
export function changedFields(existing: ExistingProduct, desired: ProductFields): ProductFields {
  const changed: ProductFields = {}
  if (desired.name !== undefined && desired.name !== existing.name) changed.name = desired.name
  if (desired.price !== undefined && !sameNumber(desired.price, existing.price)) changed.price = desired.price
  if (desired.priceToShow !== undefined && !sameNumber(desired.priceToShow, existing.priceToShow)) changed.priceToShow = desired.priceToShow
  if (desired.isAvailable !== undefined && desired.isAvailable !== existing.isAvailable) changed.isAvailable = desired.isAvailable
  if (desired.quantity !== undefined && !sameNumber(desired.quantity, existing.quantity)) changed.quantity = desired.quantity
  if (desired.images !== undefined && !sameList(desired.images, existing.images)) changed.images = desired.images
  if (desired.vendor !== undefined && desired.vendor !== existing.vendor) changed.vendor = desired.vendor
  if (desired.description !== undefined && desired.description !== existing.description) changed.description = desired.description
  if (desired.url !== undefined && desired.url !== existing.url) changed.url = desired.url
  if (desired.params !== undefined && !sameParams(desired.params, existing.params)) changed.params = desired.params
  if (desired.category !== undefined && !sameList(desired.category, existing.category)) changed.category = desired.category
  return changed
}

export function changeLabels(fields: ProductFields): string[] {
  return (Object.keys(fields) as (keyof ProductFields)[]).map((key) => FIELD_LABELS[key])
}

/** Feed categories that the given ids need (the ids plus their ancestors), parents first. Cycles are broken. */
export function withAncestors(ids: Iterable<string>, categories: FeedCategory[]): FeedCategory[] {
  const index = categoryIndex(categories)
  const ordered: FeedCategory[] = []
  const placed = new Set<string>()

  const place = (id: string, trail: Set<string>) => {
    if (placed.has(id) || trail.has(id)) return
    const category = index.get(id)
    if (!category) return
    trail.add(id)
    if (category.parentId && index.has(category.parentId) && !trail.has(category.parentId)) place(category.parentId, trail)
    placed.add(id)
    ordered.push(category)
  }

  for (const id of ids) place(id, new Set())
  return ordered
}

/** A safe display name for a category: never empty and never a bare database id. */
export function categoryName(category: FeedCategory): string {
  const name = category.name.replace(/\s+/g, " ").trim()
  if (!name || /^[0-9a-f]{24}$/i.test(name)) return `Категорія ${category.id}`
  return name.slice(0, 120)
}

/** Parent of a category inside the given list; null for roots and for broken links (self or cycle). */
export function parentWithin(category: FeedCategory, ids: Set<string>): string | null {
  return category.parentId && category.parentId !== category.id && ids.has(category.parentId) ? category.parentId : null
}

function buildTree(categories: FeedCategory[], newIds: Set<string>): CategoryNode[] {
  const ids = new Set(categories.map((category) => category.id))
  const nodes = new Map<string, CategoryNode>(
    categories.map((category) => [category.id, { id: category.id, name: categoryName(category), isNew: newIds.has(category.id), children: [] }]),
  )
  const roots: CategoryNode[] = []
  for (const category of categories) {
    const node = nodes.get(category.id)!
    const parent = parentWithin(category, ids)
    if (parent && nodes.get(parent) !== node) nodes.get(parent)!.children.push(node)
    else roots.push(node)
  }
  // Show only branches that contain something new.
  const prune = (list: CategoryNode[]): CategoryNode[] =>
    list
      .map((node) => ({ ...node, children: prune(node.children) }))
      .filter((node) => node.isNew || node.children.length > 0)
  return prune(roots)
}

export function buildPlan(input: {
  items: ImportItem[]
  excludedLines: Set<number>
  existingByArticle: Map<string, ExistingProduct[]>
  existingCategories: Map<string, ExistingCategory>
  feedCategories: FeedCategory[]
  fetchedProducts: FetchedProduct[]
  mapping: FieldMapping
  options: ImportOptions
}): ImportPlan {
  const { items, excludedLines, existingByArticle, existingCategories, feedCategories, fetchedProducts, mapping, options } = input

  const decisions: ItemDecision[] = []
  const neededCategoryIds = new Set<string>()

  for (const item of items) {
    const matches = item.key ? existingByArticle.get(item.key) ?? [] : []
    const base = { item, matches, updates: [] as ItemDecision["updates"], changes: [] as string[] }

    if (item.problems.length > 0) {
      decisions.push({ ...base, status: "skip", reasons: [...item.problems] })
      continue
    }
    if (excludedLines.has(item.line)) {
      decisions.push({ ...base, status: "skip", reasons: ["Виключено вручну"] })
      continue
    }

    const categoryId = item.categoryExternalId ? categoryRef(item.categoryExternalId, existingCategories) : null

    if (matches.length === 0) {
      if (item.categoryExternalId) neededCategoryIds.add(item.categoryExternalId)
      decisions.push({ ...base, status: "new", reasons: [...item.notes] })
      continue
    }

    const changes = new Set<string>()
    for (const product of matches) {
      const set = changedFields(product, desiredFields(item, product, mapping, options, categoryId))
      if (Object.keys(set).length > 0) {
        base.updates.push({ _id: product._id, set })
        for (const label of changeLabels(set)) changes.add(label)
      }
    }
    if (options.categories === "feed" && item.categoryExternalId && base.updates.some((update) => update.set.category)) {
      neededCategoryIds.add(item.categoryExternalId)
    }

    const reasons = [...item.notes]
    if (matches.length > 1) reasons.push(`У магазині вже є товари з цим артикулом (${matches.length}): оновляться всі`)
    decisions.push({ ...base, status: base.updates.length > 0 ? "update" : "same", changes: Array.from(changes), reasons })
  }

  const needed = withAncestors(neededCategoryIds, feedCategories)
  const categoriesToCreate = needed.filter((category) => !existingCategories.has(category.id))
  const newIds = new Set(categoriesToCreate.map((category) => category.id))

  // Earlier imports that this feed no longer lists. Any record of the feed counts, even a skipped one.
  const feedKeys = new Set(items.map((item) => item.key.toLowerCase()).filter(Boolean))
  const missing = fetchedProducts.filter((product) => product.articleNumber && !feedKeys.has(product.articleNumber.toLowerCase()))

  const counts: Record<RowStatus, number> = { new: 0, update: 0, same: 0, skip: 0 }
  const reasonCounts = new Map<string, number>()
  for (const decision of decisions) {
    counts[decision.status] += 1
    if (decision.status === "skip") {
      for (const reason of decision.reasons) {
        const kind = reason.startsWith("Повторюється") ? "Повторюється артикул або код товару" : reason
        reasonCounts.set(kind, (reasonCounts.get(kind) ?? 0) + 1)
      }
    }
  }

  return {
    decisions,
    categoriesToCreate,
    missing,
    summary: {
      total: items.length,
      counts,
      skipReasons: Array.from(reasonCounts, ([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
      newCategories: buildTree(needed, newIds),
      newCategoryCount: categoriesToCreate.length,
      missing: { count: missing.length, examples: missing.slice(0, 8).map(({ articleNumber, name }) => ({ articleNumber, name })) },
    },
  }
}

export function reviewRows(plan: ImportPlan, feedCategories: FeedCategory[]): ReviewRow[] {
  const index = categoryIndex(feedCategories)
  return plan.decisions.map(({ item, status, reasons, changes }) => ({
    key: item.key,
    line: item.line,
    name: item.name,
    articleNumber: item.articleNumber,
    priceToShow: item.priceToShow,
    price: item.price,
    image: item.images[0] ?? "",
    category: item.categoryExternalId ? categoryPath(item.categoryExternalId, index) : "",
    status,
    reasons,
    changes,
  }))
}
