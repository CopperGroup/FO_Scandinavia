/**
 * Pure logic of the product form (no React, no database), so it can be unit
 * tested: number parsing, validation in plain words, why a product is hidden
 * from shoppers, photo order and upload checks.
 */

/** Text of an HTML description without tags and entities. */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** "1 299,50" → 1299.5; NaN when the text is not a number. Empty text is NaN too. */
export function toNumber(value: string): number {
  const clean = value.replace(/\s/g, "").replace(",", ".")
  if (!clean) return NaN
  const parsed = Number(clean)
  return Number.isFinite(parsed) ? parsed : NaN
}

/** Moves one item to a new position; returns a new array, the input is left alone. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list]
  if (from < 0 || from >= next.length) return next
  const target = Math.max(0, Math.min(next.length - 1, to))
  if (target === from) return next
  const [item] = next.splice(from, 1)
  next.splice(target, 0, item)
  return next
}

export type ProductDraft = {
  name: string
  description: string
  url: string
  price: string
  salePrice: string
  quantity: string
  categoryCount: number
  params: { name: string; value: string }[]
}

/** Field keys in the order the fields appear on the page: the first problem is the one to show. */
export const PRODUCT_FIELDS = ["name", "description", "url", "price", "priceToShow", "quantity", "category", "params"] as const
export type ProductField = (typeof PRODUCT_FIELDS)[number]
export type ProductProblems = Partial<Record<ProductField, string>>

export function validateProductDraft(draft: ProductDraft): ProductProblems {
  const problems: ProductProblems = {}
  const price = toNumber(draft.price)
  const sale = draft.salePrice.trim() ? toNumber(draft.salePrice) : NaN
  const quantity = toNumber(draft.quantity)

  if (draft.name.trim().length < 3) problems.name = draft.name.trim() ? "Назва закоротка: потрібно щонайменше 3 символи." : "Вкажіть назву товару."
  if (plainText(draft.description).length < 3) problems.description = "Додайте опис товару: хоча б одне речення."
  if (draft.url.trim() && !/^https?:\/\/\S+\.\S+/i.test(draft.url.trim())) problems.url = "Посилання має починатися з https:// і вести на сторінку товару."

  if (!draft.price.trim()) problems.price = "Вкажіть ціну."
  else if (!(price > 0)) problems.price = "Ціна має бути числом більше нуля, наприклад 1290."

  if (draft.salePrice.trim()) {
    if (!(sale > 0)) problems.priceToShow = "Ціна зі знижкою має бути числом більше нуля. Щоб прибрати знижку, залиште поле порожнім."
    else if (price > 0 && sale > price) problems.priceToShow = "Ціна зі знижкою не може бути більшою за звичайну ціну."
  }

  if (!draft.quantity.trim()) problems.quantity = "Вкажіть кількість на складі (0, якщо товару немає)."
  else if (!Number.isInteger(quantity) || quantity < 0) problems.quantity = "Кількість має бути цілим числом від 0."

  if (draft.categoryCount === 0) problems.category = "Додайте хоча б одну категорію, інакше покупці не знайдуть товар у меню каталогу."

  if (draft.params.some((param) => Boolean(param.name.trim()) !== Boolean(param.value.trim()))) {
    problems.params = "У кожної характеристики має бути і назва, і значення. Заповніть порожнє поле або видаліть рядок."
  } else {
    const seen = new Set<string>()
    for (const param of draft.params) {
      const key = param.name.trim().toLocaleLowerCase("uk-UA")
      if (!key) continue
      if (seen.has(key)) {
        problems.params = `Характеристика «${param.name.trim()}» вказана двічі. Залиште один рядок.`
        break
      }
      seen.add(key)
    }
  }
  return problems
}

/** The first problem in page order, or null. */
export function firstProblem(problems: ProductProblems): { field: ProductField; message: string } | null {
  for (const field of PRODUCT_FIELDS) {
    const message = problems[field]
    if (message) return { field, message }
  }
  return null
}

/** Why shoppers do not see the product, in plain words; empty when they do. */
export function hiddenReasons(state: { isAvailable: boolean; quantity: number; categoryCount: number; imageCount: number }): string[] {
  const reasons: string[] = []
  if (!state.isAvailable) reasons.push("вимкнено «Продається в магазині»")
  if (!(state.quantity > 0)) reasons.push("на складі 0 шт.")
  if (state.categoryCount === 0) reasons.push("немає категорії")
  if (state.imageCount === 0) reasons.push("немає фото")
  return reasons
}

export const UPLOAD_MAX_BYTES = 4 * 1024 * 1024
export const UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]

/** Why a file cannot be uploaded as a product photo, or null when it can. */
export function uploadProblem(file: { name: string; size: number; type: string }): string | null {
  if (!UPLOAD_TYPES.includes(file.type)) return "це не фото у форматі JPG, PNG, WebP, AVIF або GIF."
  if (file.size === 0) return "файл порожній."
  if (file.size > UPLOAD_MAX_BYTES) return `файл ${(file.size / 1024 / 1024).toFixed(1).replace(".", ",")} МБ, а можна до 4 МБ. Зменште фото і спробуйте ще раз.`
  return null
}

/** Plain words for a failed upload, by HTTP status (0 = no connection). */
export function uploadFailure(status: number): string {
  if (status === 0) return "немає з’єднання з сервером. Перевірте інтернет і спробуйте ще раз."
  if (status === 401 || status === 403) return "сесія закінчилася. Оновіть сторінку, увійдіть знову і повторіть."
  if (status === 413) return "файл завеликий для сервера. Зменште фото і спробуйте ще раз."
  if (status === 415) return "сервер не приймає цей формат. Збережіть фото як JPG або PNG."
  return "сервер не зміг зберегти фото. Спробуйте ще раз за хвилину."
}

/** An image address the admin pasted: only http(s) links to something. */
export function imageUrlProblem(value: string): string | null {
  const text = value.trim()
  if (!text) return "Вставте посилання на фото."
  try {
    const parsed = new URL(text)
    if (!/^https?:$/.test(parsed.protocol) || !parsed.hostname.includes(".")) throw new Error()
  } catch {
    return "Посилання на фото має починатися з https:// (скопіюйте адресу зображення повністю)."
  }
  return null
}
