import { randomUUID } from "node:crypto"
import { lookup } from "node:dns/promises"
import mongoose from "mongoose"
import { connectToDB } from "@/lib/mongoose"
import Product from "@/lib/models/product.model"
import Category from "@/lib/models/category.model"
import User from "@/lib/models/user.model"
import Order from "@/lib/models/order.model"
import { invalidateCatalog } from "@/lib/catalog/server/service"
import clearCache from "@/lib/actions/cache"
import { detectFields, mapFeed, suggestMapping } from "./mapping"
import {
  buildPlan,
  categoryName,
  newProductFields,
  parentWithin,
  reviewRows,
  type ExistingCategory,
  type ExistingProduct,
  type FetchedProduct,
  type ImportPlan,
  type ItemDecision,
  type ProductFields,
} from "./plan"
import { MAX_FEED_BYTES, checkFeedUrl, isPrivateAddress } from "./url-guard"
import { FeedParseError, decodeXmlBytes, parseFeed } from "./xml"
import type { FeedSummary, FieldMapping, ImportOptions, ImportReport, JobProgress, ParsedFeed, ReviewRow, ReviewSummary } from "./types"

/** Placeholder product that stands in for deleted products in old orders; never imported over. */
const DELETED_PRODUCT_ID = "681a9c16b06f4e599d07371e"
const BATCH_SIZE = 250
const FEED_TTL_MS = 60 * 60 * 1000
const MAX_FEEDS = 3
const DOWNLOAD_TIMEOUT_MS = 60_000
const MAX_REDIRECTS = 5

export class ImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ImportError"
  }
}

/* -------------------------------------------------------------------------- */
/*                         Feeds and jobs kept in memory                      */
/* -------------------------------------------------------------------------- */

type StoredFeed = { feed: ParsedFeed; fileName: string; bytes: number; adminId: string; touchedAt: number }

type Job = {
  id: string
  adminId: string
  startedAt: number
  touchedAt: number
  busy: boolean
  plan: ImportPlan
  options: ImportOptions
  /** Indexes into plan.decisions that need a write, cut into batches. */
  batches: number[][]
  cursor: number
  stage: JobProgress["stage"]
  failedAt?: JobProgress["stage"]
  categoryIds: Map<string, string>
  usedProductIds: Set<string>
  /** Ids given to new products, per feed line, so a retried batch writes the same documents instead of duplicates. */
  newIds: Map<number, { _id: mongoose.Types.ObjectId; id: string }>
  report: ImportReport
  error: string | null
}

type ImportState = { feeds: Map<string, StoredFeed>; jobs: Map<string, Job> }
const globalForImport = globalThis as unknown as { __nordivaImport?: ImportState }
const state: ImportState = (globalForImport.__nordivaImport ??= { feeds: new Map(), jobs: new Map() })

function sweep() {
  const now = Date.now()
  for (const [token, stored] of state.feeds) if (now - stored.touchedAt > FEED_TTL_MS) state.feeds.delete(token)
  for (const [id, job] of state.jobs) if (now - job.touchedAt > FEED_TTL_MS) state.jobs.delete(id)
  while (state.feeds.size > MAX_FEEDS) {
    const oldest = Array.from(state.feeds.entries()).sort((a, b) => a[1].touchedAt - b[1].touchedAt)[0]
    state.feeds.delete(oldest[0])
  }
}

function feedFor(token: string, adminId: string): StoredFeed {
  const stored = state.feeds.get(token)
  if (!stored || stored.adminId !== adminId) {
    throw new ImportError("Файл уже не зберігається на сервері: минула година або сервер перезапустили. Завантажте файл ще раз.")
  }
  stored.touchedAt = Date.now()
  return stored
}

export function discardFeed(token: string, adminId: string) {
  const stored = state.feeds.get(token)
  if (stored && stored.adminId === adminId) state.feeds.delete(token)
}

/* -------------------------------------------------------------------------- */
/*                               Getting the feed                             */
/* -------------------------------------------------------------------------- */

/** Reads a body stream up to the feed size limit. */
export async function readLimited(body: ReadableStream<Uint8Array> | null, declaredLength?: number | null): Promise<Uint8Array> {
  if (declaredLength && declaredLength > MAX_FEED_BYTES) throw new ImportError("Файл більший за 50 МБ. Попросіть у постачальника менший файл або розділіть його на частини.")
  if (!body) throw new ImportError("Файл порожній. Перевірте, чи він завантажився повністю.")
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_FEED_BYTES) {
      await reader.cancel().catch(() => undefined)
      throw new ImportError("Файл більший за 50 МБ. Попросіть у постачальника менший файл або розділіть його на частини.")
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

async function assertPublicHost(url: URL) {
  const host = url.hostname.replace(/^\[|\]$/g, "")
  let addresses: { address: string }[]
  try {
    addresses = await lookup(host, { all: true, verbatim: true })
  } catch {
    throw new ImportError(`Не вдалося знайти сервер «${url.hostname}». Перевірте посилання.`)
  }
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new ImportError("Це посилання відкривається лише у внутрішній мережі. Вставте посилання, яке відкривається в браузері з будь-якого комп’ютера.")
  }
}

/**
 * Downloads a feed from a public URL: http(s) only, every redirect hop re-checked
 * against private networks, 60 s and 50 MB at most.
 */
export async function downloadFeed(input: string): Promise<{ bytes: Uint8Array; fileName: string }> {
  const check = checkFeedUrl(input)
  if (!check.ok) throw new ImportError(check.error)

  let url = check.url
  const signal = AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS)
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url)
    let response: Response
    try {
      response = await fetch(url, {
        redirect: "manual",
        signal,
        cache: "no-store",
        headers: { Accept: "application/xml, text/xml, */*;q=0.5", "User-Agent": "NordivaFeedImport/1.0" },
      })
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
      throw new ImportError(timedOut ? "Сайт постачальника не відповів за 60 секунд. Спробуйте пізніше або завантажте файл з комп’ютера." : "Не вдалося завантажити файл за цим посиланням. Перевірте, чи воно відкривається в браузері.")
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      await response.body?.cancel().catch(() => undefined)
      if (!location) throw new ImportError("Посилання перенаправляє на іншу сторінку, але не каже, на яку. Попросіть у постачальника пряме посилання на файл.")
      const next = checkFeedUrl(new URL(location, url).toString())
      if (!next.ok) throw new ImportError(next.error)
      url = next.url
      continue
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined)
      throw new ImportError(`Сайт постачальника відповів помилкою ${response.status}. Перевірте посилання або завантажте файл з комп’ютера.`)
    }

    const length = Number(response.headers.get("content-length")) || null
    const bytes = await readLimited(response.body, length)
    const fileName = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "") || url.hostname
    return { bytes, fileName }
  }
  throw new ImportError("Посилання надто багато разів перенаправляє на інші сторінки. Попросіть у постачальника пряме посилання на файл.")
}

export function registerFeed(bytes: Uint8Array, fileName: string, adminId: string): FeedSummary {
  if (bytes.byteLength === 0) throw new ImportError("Файл порожній. Перевірте, чи він завантажився повністю.")
  let feed: ParsedFeed
  try {
    feed = parseFeed(decodeXmlBytes(bytes))
  } catch (error) {
    if (error instanceof FeedParseError) throw new ImportError(error.message)
    throw error
  }

  sweep()
  const token = randomUUID()
  state.feeds.set(token, { feed, fileName, bytes: bytes.byteLength, adminId, touchedAt: Date.now() })
  sweep()

  const fields = detectFields(feed.offers)
  return {
    token,
    fileName,
    bytes: bytes.byteLength,
    format: feed.format,
    recordTag: feed.recordTag,
    shopName: feed.shopName,
    date: feed.date,
    offerCount: feed.offers.length,
    categoryCount: feed.categories.length,
    warnings: feed.warnings.slice(0, 20),
    fields,
    mapping: suggestMapping(fields),
    sample: feed.offers.slice(0, 5),
    categories: feed.categories,
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Review                                   */
/* -------------------------------------------------------------------------- */

type ProductRow = {
  _id: mongoose.Types.ObjectId
  articleNumber?: string
  name?: string
  price?: number
  priceToShow?: number
  isAvailable?: boolean
  quantity?: number
  images?: string[]
  vendor?: string
  description?: string
  url?: string
  params?: { name?: string; value?: string }[]
  category?: unknown[]
  isFetched?: boolean
}

const toExisting = (row: ProductRow): ExistingProduct => ({
  _id: String(row._id),
  articleNumber: row.articleNumber ?? "",
  name: row.name ?? "",
  price: Number(row.price ?? 0),
  priceToShow: Number(row.priceToShow ?? row.price ?? 0),
  isAvailable: row.isAvailable === true,
  quantity: Number(row.quantity ?? 0),
  images: (row.images ?? []).filter(Boolean),
  vendor: row.vendor ?? "",
  description: row.description ?? "",
  url: row.url ?? "",
  params: (row.params ?? []).map((param) => ({ name: param.name ?? "", value: param.value ?? "" })),
  category: (row.category ?? []).filter(Boolean).map(String),
  isFetched: row.isFetched === true,
})

async function loadDatabaseState(feed: ParsedFeed, keys: string[]) {
  await connectToDB()
  const deleted = new mongoose.Types.ObjectId(DELETED_PRODUCT_ID)

  const productChunks: string[][] = []
  for (let index = 0; index < keys.length; index += 2000) productChunks.push(keys.slice(index, index + 2000))

  const [productRows, fetchedRows, categoryRows] = await Promise.all([
    Promise.all(
      productChunks.map((chunk) =>
        Product.find({ articleNumber: { $in: chunk }, _id: { $ne: deleted } })
          .select("_id articleNumber name price priceToShow isAvailable quantity images vendor description url params.name params.value category isFetched")
          .lean<ProductRow[]>(),
      ),
    ),
    Product.find({ isFetched: true, _id: { $ne: deleted } }).select("_id articleNumber name").lean<ProductRow[]>(),
    Category.find({ id: { $in: feed.categories.map((category) => category.id) } })
      .select("_id id name")
      .lean<{ _id: mongoose.Types.ObjectId; id?: string; name?: string }[]>(),
  ])

  const existingByArticle = new Map<string, ExistingProduct[]>()
  for (const row of productRows.flat()) {
    const product = toExisting(row)
    const list = existingByArticle.get(product.articleNumber)
    if (list) list.push(product)
    else existingByArticle.set(product.articleNumber, [product])
  }

  const existingCategories = new Map<string, ExistingCategory>()
  for (const row of categoryRows) {
    if (row.id && !existingCategories.has(row.id)) existingCategories.set(row.id, { _id: String(row._id), externalId: row.id, name: row.name ?? "" })
  }

  const fetchedProducts: FetchedProduct[] = fetchedRows.map((row) => ({ _id: String(row._id), articleNumber: row.articleNumber ?? "", name: row.name ?? "" }))
  return { existingByArticle, existingCategories, fetchedProducts }
}

async function makePlan(feed: ParsedFeed, mapping: FieldMapping, options: ImportOptions, excludedLines: number[]) {
  const items = mapFeed(feed, mapping, options.defaultQuantity)
  const keys = Array.from(new Set(items.map((item) => item.key).filter(Boolean)))
  const db = await loadDatabaseState(feed, keys)
  return buildPlan({
    items,
    excludedLines: new Set(excludedLines),
    existingByArticle: db.existingByArticle,
    existingCategories: db.existingCategories,
    feedCategories: feed.categories,
    fetchedProducts: db.fetchedProducts,
    mapping,
    options,
  })
}

export async function reviewFeed(
  token: string,
  adminId: string,
  mapping: FieldMapping,
  options: ImportOptions,
  excludedLines: number[],
): Promise<{ summary: ReviewSummary; rows: ReviewRow[] }> {
  const { feed } = feedFor(token, adminId)
  const plan = await makePlan(feed, mapping, options, excludedLines)
  return { summary: plan.summary, rows: reviewRows(plan, feed.categories) }
}

/* -------------------------------------------------------------------------- */
/*                                   Import                                   */
/* -------------------------------------------------------------------------- */

function progressOf(job: Job): JobProgress {
  return {
    jobId: job.id,
    done: job.cursor,
    total: job.batches.length,
    stage: job.stage,
    report: job.stage === "done" ? job.report : null,
    error: job.error,
  }
}

/** An import this admin started and has not finished (e.g. the tab was closed), so the page can offer to continue it. */
export function activeJobFor(adminId: string): JobProgress | null {
  sweep()
  const job = Array.from(state.jobs.values())
    .filter((entry) => entry.adminId === adminId && entry.stage !== "done")
    .sort((a, b) => b.startedAt - a.startedAt)[0]
  return job ? progressOf(job) : null
}

export async function startImportJob(
  token: string,
  adminId: string,
  mapping: FieldMapping,
  options: ImportOptions,
  excludedLines: number[],
  confirmDeleteCount: number,
): Promise<JobProgress> {
  sweep()
  const unfinished = Array.from(state.jobs.values()).filter((job) => job.stage !== "done")
  const running = unfinished.find(
    (job) => job.busy || (job.adminId !== adminId && job.stage !== "failed" && Date.now() - job.touchedAt < 10 * 60 * 1000),
  )
  if (running) throw new ImportError("Інший імпорт ще виконується. Дочекайтеся його завершення.")
  // Starting over abandons this admin's interrupted import; what it wrote stays.
  for (const job of unfinished) if (job.adminId === adminId) state.jobs.delete(job.id)

  const { feed } = feedFor(token, adminId)
  const plan = await makePlan(feed, mapping, options, excludedLines)
  if (options.missing === "delete" && plan.missing.length !== confirmDeleteCount) {
    throw new ImportError("Кількість товарів для видалення змінилася. Поверніться до перевірки й підтвердьте ще раз.")
  }

  const work = plan.decisions.flatMap((decision, index) => (decision.status === "new" || decision.status === "update" ? [index] : []))
  const batches: number[][] = []
  for (let index = 0; index < work.length; index += BATCH_SIZE) batches.push(work.slice(index, index + BATCH_SIZE))

  await connectToDB()
  const usedProductIds = new Set((await Product.distinct("id")).map(String))

  const job: Job = {
    id: randomUUID(),
    adminId,
    startedAt: Date.now(),
    touchedAt: Date.now(),
    busy: false,
    plan,
    options,
    batches,
    cursor: 0,
    stage: "categories",
    categoryIds: new Map(),
    usedProductIds,
    newIds: new Map(),
    report: {
      created: 0,
      updated: 0,
      unchanged: plan.summary.counts.same,
      skipped: plan.summary.counts.skip,
      failed: [],
      categoriesCreated: 0,
      missingHandled: 0,
      missingMode: options.missing,
      ms: 0,
    },
    error: null,
  }
  state.jobs.set(job.id, job)
  return progressOf(job)
}

/** Performs the next unit of work of a job: categories, one batch of products, the missing products, or the finish. */
export async function stepImportJob(jobId: string, adminId: string): Promise<JobProgress> {
  const job = state.jobs.get(jobId)
  if (!job || job.adminId !== adminId) throw new ImportError("Цей імпорт уже не зберігається на сервері (можливо, сервер перезапустили). Почніть спочатку: уже записані товари нікуди не зникли.")
  if (job.stage === "done") return progressOf(job)
  if (job.busy) return progressOf(job)
  // "Continue" after a failure retries the step that failed.
  if (job.stage === "failed") {
    job.stage = job.failedAt ?? "categories"
    job.error = null
  }

  job.busy = true
  job.touchedAt = Date.now()
  try {
    await connectToDB()
    if (job.stage === "categories") {
      await createCategories(job)
      job.stage = job.batches.length > 0 ? "products" : "missing"
    } else if (job.stage === "products") {
      await writeBatch(job, job.batches[job.cursor])
      job.cursor += 1
      if (job.cursor >= job.batches.length) job.stage = "missing"
    } else if (job.stage === "missing") {
      await handleMissing(job)
      job.stage = "finishing"
    } else if (job.stage === "finishing") {
      // One cache invalidation for the whole import (it also invalidates the catalog snapshot).
      await clearCache("updateProducts")
      job.report.ms = Date.now() - job.startedAt
      job.stage = "done"
    }
  } catch (error) {
    job.failedAt = job.stage
    job.stage = "failed"
    job.error = error instanceof ImportError ? error.message : "Імпорт зупинився через помилку під час запису. Уже записані товари збережено. Натисніть «Продовжити імпорт»: він почне з того місця, де зупинився."
    console.error("[import] job failed:", error instanceof Error ? error.message : error)
    // Whatever was written must still reach the storefront.
    await invalidateCatalog().catch(() => undefined)
  } finally {
    job.busy = false
  }
  return progressOf(job)
}

async function createCategories(job: Job) {
  const { categoriesToCreate } = job.plan
  // Existing categories for every feed id the plan may refer to.
  const neededIds = new Set<string>()
  for (const decision of job.plan.decisions) if (decision.item.categoryExternalId) neededIds.add(decision.item.categoryExternalId)
  for (const category of categoriesToCreate) if (category.parentId) neededIds.add(category.parentId)

  const existing = await Category.find({ id: { $in: Array.from(neededIds) } })
    .select("_id id")
    .lean<{ _id: mongoose.Types.ObjectId; id?: string }[]>()
  for (const row of existing) if (row.id && !job.categoryIds.has(row.id)) job.categoryIds.set(row.id, String(row._id))

  // Another import may have created some of them meanwhile.
  const toCreate = categoriesToCreate.filter((category) => !job.categoryIds.has(category.id))
  if (toCreate.length === 0) return

  const ids = new Set(toCreate.map((category) => category.id))
  const docs = toCreate.map((category) => ({
    _id: new mongoose.Types.ObjectId(),
    id: category.id,
    name: categoryName(category),
    products: [] as mongoose.Types.ObjectId[],
    subCategories: [] as mongoose.Types.ObjectId[],
  }))
  const byExternal = new Map(docs.map((doc) => [doc.id, doc]))

  const parentLinks: { parent: string; child: mongoose.Types.ObjectId }[] = []
  for (const category of toCreate) {
    const doc = byExternal.get(category.id)!
    const newParent = parentWithin(category, ids)
    if (newParent) byExternal.get(newParent)!.subCategories.push(doc._id)
    else if (category.parentId && category.parentId !== category.id && job.categoryIds.has(category.parentId)) {
      parentLinks.push({ parent: job.categoryIds.get(category.parentId)!, child: doc._id })
    }
  }

  await Category.insertMany(docs, { ordered: true })
  for (const doc of docs) job.categoryIds.set(doc.id, String(doc._id))
  job.report.categoriesCreated = docs.length

  if (parentLinks.length > 0) {
    await Category.bulkWrite(
      parentLinks.map(({ parent, child }) => ({
        updateOne: { filter: { _id: new mongoose.Types.ObjectId(parent) }, update: { $addToSet: { subCategories: child } } },
      })),
      { ordered: false },
    )
  }
}

function resolveCategory(job: Job, value: string): mongoose.Types.ObjectId | null {
  const id = value.startsWith("new:") ? job.categoryIds.get(value.slice(4)) : value
  return id && mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : null
}

function newProductId(job: Job): string {
  for (;;) {
    const id = String(10_000_000 + Math.floor(Math.random() * 90_000_000))
    if (!job.usedProductIds.has(id)) {
      job.usedProductIds.add(id)
      return id
    }
  }
}

function toSet(job: Job, fields: ProductFields): Record<string, unknown> {
  const set: Record<string, unknown> = { ...fields }
  if (fields.category) set.category = fields.category.map((value) => resolveCategory(job, value)).filter(Boolean)
  return set
}

type Operation = {
  insert: boolean
  decision: ItemDecision
  op: Record<string, unknown>
  productId: mongoose.Types.ObjectId
  addTo: mongoose.Types.ObjectId[]
  removeFrom: string[]
}

async function writeBatch(job: Job, indexes: number[]) {
  const operations: Operation[] = []

  for (const index of indexes) {
    const decision = job.plan.decisions[index]
    const { item } = decision

    if (decision.status === "new") {
      const categoryValue = item.categoryExternalId ? `new:${item.categoryExternalId}` : null
      const categoryId = categoryValue ? resolveCategory(job, categoryValue) : null
      const fields = newProductFields(item, null)
      let ids = job.newIds.get(item.line)
      if (!ids) job.newIds.set(item.line, (ids = { _id: new mongoose.Types.ObjectId(), id: newProductId(job) }))
      const { _id } = ids
      operations.push({
        insert: true,
        decision,
        productId: _id,
        addTo: categoryId ? [categoryId] : [],
        removeFrom: [],
        op: {
          insertOne: {
            document: {
              _id,
              id: ids.id,
              ...fields,
              category: categoryId ? [categoryId] : [],
              articleNumber: item.articleNumber,
              isFetched: true,
            },
          },
        },
      })
      continue
    }

    for (const update of decision.updates) {
      const set = toSet(job, update.set)
      const existing = decision.matches.find((product) => product._id === update._id)
      const newCategories = (set.category as mongoose.Types.ObjectId[] | undefined) ?? []
      operations.push({
        insert: false,
        decision,
        productId: new mongoose.Types.ObjectId(update._id),
        addTo: set.category ? newCategories : [],
        removeFrom: set.category && existing ? existing.category.filter((id) => !newCategories.some((next) => String(next) === id)) : [],
        op: { updateOne: { filter: { _id: new mongoose.Types.ObjectId(update._id) }, update: { $set: set } } },
      })
    }
  }

  if (operations.length === 0) return

  const failedOps = new Map<number, string>()
  try {
    const result: any = await Product.bulkWrite(operations.map((operation) => operation.op) as any, { ordered: false })
    for (const error of result?.mongoose?.validationErrors ?? []) {
      if (typeof error?.index === "number") failedOps.set(error.index, error.message ?? "Дані товару не пройшли перевірку")
    }
  } catch (error: any) {
    const writeErrors: any[] = error?.writeErrors ?? error?.result?.writeErrors ?? []
    if (writeErrors.length === 0) throw error
    for (const writeError of writeErrors) {
      const index = writeError?.index ?? writeError?.err?.index
      const code = writeError?.code ?? writeError?.err?.code
      // A retried batch: this exact document (same pre-assigned _id) was already inserted.
      if (typeof index === "number" && code === 11000 && operations[index]?.insert) continue
      if (typeof index === "number") failedOps.set(index, writeError?.errmsg ?? writeError?.err?.errmsg ?? "Не вдалося записати товар")
    }
  }

  // Count per record, not per document: a record with two duplicates in the database is one update.
  const failedRecords = new Map<number, string>()
  operations.forEach((operation, index) => {
    const reason = failedOps.get(index)
    if (reason) failedRecords.set(operation.decision.item.line, reason)
  })
  const countedRecords = new Set<number>()
  for (const operation of operations) {
    const line = operation.decision.item.line
    if (countedRecords.has(line)) continue
    countedRecords.add(line)
    const reason = failedRecords.get(line)
    if (reason) {
      job.report.failed.push({ key: operation.decision.item.key, name: operation.decision.item.name, reason: reason.slice(0, 200) })
    } else if (operation.decision.status === "new") job.report.created += 1
    else job.report.updated += 1
  }

  // Keep the denormalised Category.products in step with what was written.
  const additions = new Map<string, mongoose.Types.ObjectId[]>()
  const removals = new Map<string, mongoose.Types.ObjectId[]>()
  operations.forEach((operation, index) => {
    if (failedOps.has(index)) return
    for (const category of operation.addTo) {
      const key = String(category)
      ;(additions.get(key) ?? additions.set(key, []).get(key)!).push(operation.productId)
    }
    for (const category of operation.removeFrom) {
      if (!mongoose.isValidObjectId(category)) continue
      ;(removals.get(category) ?? removals.set(category, []).get(category)!).push(operation.productId)
    }
  })

  const categoryOps = [
    ...Array.from(removals, ([category, products]) => ({
      updateOne: { filter: { _id: new mongoose.Types.ObjectId(category) }, update: { $pull: { products: { $in: products } } } },
    })),
    ...Array.from(additions, ([category, products]) => ({
      updateOne: { filter: { _id: new mongoose.Types.ObjectId(category) }, update: { $addToSet: { products: { $each: products } } } },
    })),
  ]
  if (categoryOps.length > 0) await Category.bulkWrite(categoryOps as any, { ordered: false })
}

async function handleMissing(job: Job) {
  const { missing } = job.plan
  if (job.options.missing === "keep" || missing.length === 0) return

  const ids = missing.map((product) => new mongoose.Types.ObjectId(product._id))

  if (job.options.missing === "unavailable") {
    const result = await Product.updateMany({ _id: { $in: ids }, isFetched: true }, { $set: { isAvailable: false } })
    job.report.missingHandled = result.modifiedCount ?? 0
    return
  }

  // "delete": the same clean-up the product delete does, in bulk. Orders keep their lines, pointing at the placeholder.
  const deleted = new mongoose.Types.ObjectId(DELETED_PRODUCT_ID)
  await Promise.all([
    User.updateMany({ likes: { $in: ids } }, { $pull: { likes: { $in: ids } } }),
    Category.updateMany({ products: { $in: ids } }, { $pull: { products: { $in: ids } } }),
    Order.updateMany(
      { "products.product": { $in: ids } },
      { $set: { "products.$[line].product": deleted } },
      { arrayFilters: [{ "line.product": { $in: ids } }] },
    ),
  ])
  const result = await Product.deleteMany({ _id: { $in: ids }, isFetched: true })
  job.report.missingHandled = result.deletedCount ?? 0
}

/* -------------------------------------------------------------------------- */
/*                     The sample file: what it left behind                   */
/* -------------------------------------------------------------------------- */

// The sample file marks everything it creates: articles "SAMPLE-…", category ids "sample-…".
const SAMPLE_PRODUCTS = { articleNumber: /^SAMPLE-/, isFetched: true }
const SAMPLE_CATEGORIES = { id: /^sample-/ }

export type SampleLeftovers = { products: number; categories: number }

/** How many products and categories from the sample file are in the store now. */
export async function sampleLeftovers(): Promise<SampleLeftovers> {
  await connectToDB()
  const [products, categories] = await Promise.all([Product.countDocuments(SAMPLE_PRODUCTS), Category.countDocuments(SAMPLE_CATEGORIES)])
  return { products, categories }
}

/** Removes everything the sample file created, with the same clean-up a product delete does. */
export async function removeSampleData(): Promise<SampleLeftovers> {
  if (Array.from(state.jobs.values()).some((job) => job.stage !== "done" && job.stage !== "failed")) {
    throw new ImportError("Зараз триває імпорт. Дочекайтеся його завершення і спробуйте ще раз.")
  }
  await connectToDB()

  const [products, categories] = await Promise.all([
    Product.find(SAMPLE_PRODUCTS).select("_id").lean<{ _id: mongoose.Types.ObjectId }[]>(),
    Category.find(SAMPLE_CATEGORIES).select("_id").lean<{ _id: mongoose.Types.ObjectId }[]>(),
  ])
  const productIds = products.map((product) => product._id)
  const categoryIds = categories.map((category) => category._id)

  if (productIds.length > 0) {
    const deleted = new mongoose.Types.ObjectId(DELETED_PRODUCT_ID)
    await Promise.all([
      User.updateMany({ likes: { $in: productIds } }, { $pull: { likes: { $in: productIds } } }),
      Category.updateMany({ products: { $in: productIds } }, { $pull: { products: { $in: productIds } } }),
      Order.updateMany(
        { "products.product": { $in: productIds } },
        { $set: { "products.$[line].product": deleted } },
        { arrayFilters: [{ "line.product": { $in: productIds } }] },
      ),
    ])
    await Product.deleteMany({ _id: { $in: productIds }, ...SAMPLE_PRODUCTS })
  }

  if (categoryIds.length > 0) {
    await Promise.all([
      // A real product the admin moved into a sample category goes back to "no category".
      Product.updateMany({ category: { $in: categoryIds } }, { $pull: { category: { $in: categoryIds } } }),
      Category.updateMany({ subCategories: { $in: categoryIds } }, { $pull: { subCategories: { $in: categoryIds } } }),
    ])
    await Category.deleteMany({ _id: { $in: categoryIds }, ...SAMPLE_CATEGORIES })
  }

  if (productIds.length > 0 || categoryIds.length > 0) await clearCache("updateProducts")
  return { products: productIds.length, categories: categoryIds.length }
}
