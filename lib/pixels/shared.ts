/**
 * Advertising pixels (Meta, TikTok): the shapes and rules shared by the admin
 * page, the server and the storefront loader. Plain data only.
 */

export type PixelType = "Meta" | "TikTok"

/** Keys of `Pixel.events` in the database. */
export const PIXEL_EVENT_KEYS = [
  "pageView",
  "viewContent",
  "addToCart",
  "addToWishlist",
  "initiateCheckout",
  "addPaymentInfo",
  "purchase",
  "search",
  "lead",
  "completeRegistration",
] as const

export type PixelEventKey = (typeof PIXEL_EVENT_KEYS)[number]
export type PixelEvents = Record<PixelEventKey, boolean>

/**
 * The events the storefront really sends, in the order a customer goes through
 * them. `search` and `addPaymentInfo` exist in old records but nothing in the
 * shop fires them, so the admin page does not offer them.
 */
export const SENT_EVENTS: { key: PixelEventKey; label: string; hint: string; locked?: boolean }[] = [
  { key: "pageView", label: "Перегляд сторінки", hint: "Покупець відкрив будь-яку сторінку магазину. Без цієї події піксель не працює.", locked: true },
  { key: "viewContent", label: "Перегляд товару", hint: "Покупець відкрив сторінку товару." },
  { key: "addToCart", label: "Додавання в кошик", hint: "Покупець поклав товар у кошик." },
  { key: "addToWishlist", label: "Додавання в обране", hint: "Покупець натиснув сердечко на товарі." },
  { key: "initiateCheckout", label: "Початок оформлення", hint: "Покупець перейшов до оформлення замовлення." },
  { key: "purchase", label: "Замовлення", hint: "Покупець оформив замовлення. Передається сума замовлення." },
  { key: "completeRegistration", label: "Реєстрація", hint: "Покупець створив обліковий запис." },
  { key: "lead", label: "Звернення", hint: "Покупець натиснув кнопку зв’язку: телефон, Telegram або Viber." },
]

export const ALL_EVENTS_ON: PixelEvents = Object.fromEntries(PIXEL_EVENT_KEYS.map((key) => [key, true])) as PixelEvents

export const PIXEL_TYPE_LABEL: Record<PixelType, string> = {
  Meta: "Meta (Facebook, Instagram)",
  TikTok: "TikTok",
}

/** A pixel as the admin page shows it; `pixelId` is the readable ID. */
export type AdminPixel = {
  _id: string
  type: PixelType
  name: string
  pixelId: string
  active: boolean
  createdAt: string | null
  activatedAt: string | null
  deactivatedAt: string | null
  events: PixelEvents
}

/** What the storefront needs to load the active pixels. */
export type ActivePixels = {
  meta: { id: string; events: PixelEvents } | null
  tiktok: { id: string; events: PixelEvents } | null
}

export const NO_ACTIVE_PIXELS: ActivePixels = { meta: null, tiktok: null }

/** Returns the cleaned ID, or an explanation of what is wrong with it. */
export function checkPixelId(type: PixelType, input: string): { ok: true; id: string } | { ok: false; error: string } {
  const id = String(input ?? "").replace(/\s+/g, "")
  if (!id) return { ok: false, error: "Вставте ID пікселя." }
  if (type === "Meta") {
    return /^\d{8,20}$/.test(id) ? { ok: true, id } : { ok: false, error: "ID пікселя Meta складається лише з цифр, зазвичай їх 15 або 16. Скопіюйте його з Meta Events Manager." }
  }
  return /^[A-Za-z0-9]{10,40}$/.test(id)
    ? { ok: true, id: id.toUpperCase() }
    : { ok: false, error: "ID пікселя TikTok складається з літер і цифр без пробілів, зазвичай їх 20. Скопіюйте його з TikTok Ads Manager." }
}

export function normalizeEvents(input: unknown): PixelEvents {
  const source = (input ?? {}) as Record<string, unknown>
  const events = { ...ALL_EVENTS_ON }
  for (const key of PIXEL_EVENT_KEYS) events[key] = source[key] !== false
  events.pageView = true
  return events
}
