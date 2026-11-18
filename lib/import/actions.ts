"use server"

import { NotAuthorizedError, requireAdmin } from "./admin"
import { ImportError, discardFeed, removeSampleData, reviewFeed, sampleLeftovers, startImportJob, stepImportJob, type SampleLeftovers } from "./server"
import { DEFAULT_OPTIONS, TARGET_FIELDS, type FieldMapping, type ImportOptions, type JobProgress, type ReviewRow, type ReviewSummary } from "./types"

type Result<T> = ({ ok: true } & T) | { ok: false; error: string }

function failure(error: unknown): { ok: false; error: string } {
  if (error instanceof ImportError || error instanceof NotAuthorizedError) return { ok: false, error: error.message }
  console.error("[import]", error instanceof Error ? error.message : error)
  return { ok: false, error: "Не вдалося виконати дію через помилку на сервері. Спробуйте ще раз; якщо не допоможе, оновіть сторінку." }
}

/** Only known fields with string values survive; anything else from the browser is dropped. */
function cleanMapping(input: unknown): FieldMapping {
  const source = (input ?? {}) as Record<string, unknown>
  const mapping = { params: source.params !== false } as FieldMapping
  for (const field of TARGET_FIELDS) {
    const value = source[field]
    mapping[field] = typeof value === "string" ? value.slice(0, 100) : ""
  }
  return mapping
}

function cleanOptions(input: unknown): ImportOptions {
  const source = (input ?? {}) as Record<string, unknown>
  const quantity = Number(source.defaultQuantity)
  return {
    missing: source.missing === "unavailable" || source.missing === "delete" ? source.missing : "keep",
    categories: source.categories === "feed" ? "feed" : "keep",
    defaultQuantity: Number.isFinite(quantity) ? Math.min(Math.max(Math.floor(quantity), 0), 100_000) : DEFAULT_OPTIONS.defaultQuantity,
  }
}

const cleanLines = (input: unknown): number[] =>
  Array.isArray(input) ? input.filter((value): value is number => Number.isInteger(value) && value > 0).slice(0, 200_000) : []

export async function reviewImport(input: {
  token: string
  mapping: FieldMapping
  options: ImportOptions
  excludedLines: number[]
}): Promise<Result<{ summary: ReviewSummary; rows: ReviewRow[] }>> {
  try {
    const admin = await requireAdmin()
    const result = await reviewFeed(String(input.token), admin.id, cleanMapping(input.mapping), cleanOptions(input.options), cleanLines(input.excludedLines))
    return { ok: true, ...result }
  } catch (error) {
    return failure(error)
  }
}

export async function startImport(input: {
  token: string
  mapping: FieldMapping
  options: ImportOptions
  excludedLines: number[]
  confirmDeleteCount: number
}): Promise<Result<{ progress: JobProgress }>> {
  try {
    const admin = await requireAdmin()
    const progress = await startImportJob(
      String(input.token),
      admin.id,
      cleanMapping(input.mapping),
      cleanOptions(input.options),
      cleanLines(input.excludedLines),
      Number(input.confirmDeleteCount) || 0,
    )
    return { ok: true, progress }
  } catch (error) {
    return failure(error)
  }
}

export async function continueImport(jobId: string): Promise<Result<{ progress: JobProgress }>> {
  try {
    const admin = await requireAdmin()
    return { ok: true, progress: await stepImportJob(String(jobId), admin.id) }
  } catch (error) {
    return failure(error)
  }
}

export async function forgetFeed(token: string): Promise<void> {
  try {
    const admin = await requireAdmin()
    discardFeed(String(token), admin.id)
  } catch {
    // Nothing to clean up for a visitor without rights.
  }
}

/** Removes the products and categories the sample file created. Returns what was removed. */
export async function removeSampleImport(): Promise<Result<{ removed: SampleLeftovers }>> {
  try {
    await requireAdmin()
    return { ok: true, removed: await removeSampleData() }
  } catch (error) {
    return failure(error)
  }
}

export async function sampleImportState(): Promise<SampleLeftovers> {
  try {
    await requireAdmin()
    return await sampleLeftovers()
  } catch {
    return { products: 0, categories: 0 }
  }
}
