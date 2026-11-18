import type { PillTone } from "@/components/admin/ui"
import { daysBetween, formatPromoDay, type PromoErrors, type PromoInput, type PromoRecord, type PromoSource, type PromoStatus } from "@/lib/promo/rules"
import { formatPrice, money, plural } from "@/lib/storefront/format"

/**
 * Words for promo codes in the admin panel ("Промокоди"): the list, the form
 * and its live description. Pure functions, used by server and client components.
 */

export const STATUS_TONE: Record<PromoStatus, PillTone> = {
  active: "ok",
  scheduled: "neutral",
  ended: "muted",
  used: "muted",
  off: "muted",
}

/** What a status means, for the tooltip of its pill. */
export function statusTip(status: PromoStatus, record: Pick<PromoRecord, "startDay" | "endDay">): string {
  switch (status) {
    case "active":
      return record.endDay ? `Код можна застосувати. Останній день: ${formatPromoDay(record.endDay)}.` : "Код можна застосувати, кінцевої дати немає."
    case "scheduled":
      return record.startDay ? `Код почне діяти ${formatPromoDay(record.startDay)}. До того його не можна застосувати.` : "Код ще не почав діяти."
    case "ended":
      return record.endDay ? `Останній день був ${formatPromoDay(record.endDay)}. Щоб продовжити дію, змініть дату.` : "Термін дії минув."
    case "used":
      return "Код уже використали стільки разів, скільки було можна. Щоб дати ще, збільште кількість замовлень."
    case "off":
      return "Магазин вимкнув код. Ним не можна скористатися, доки ви його не ввімкнете."
  }
}

export const SOURCE_LABEL: Partial<Record<PromoSource, string>> = {
  welcome: "Видано автоматично за реєстрацію",
  review: "Видано автоматично за відгук",
  legacy: "Виданий до появи списку; доданий до нього",
}

/** The same, short enough for the line under a code in the list, with the full story for its tooltip. */
export const SOURCE_SHORT: Partial<Record<PromoSource, { label: string; tip: string }>> = {
  welcome: { label: "за реєстрацію", tip: "Магазин видав цей код сам, коли покупець зареєструвався" },
  review: { label: "за відгук", tip: "Магазин видав цей код сам, коли покупець залишив відгук про куплений товар" },
  legacy: { label: "старий код", tip: "Код видано раніше, до появи списку промокодів, і перенесено сюди" },
}

/** "27 листопада 2026" split into its day, month and year. */
function dayParts(day: string): { day: string; month: string; year: string } {
  const [d = "", month = "", year = ""] = formatPromoDay(day).split(" ")
  return { day: d, month, year }
}

/**
 * The two days, said as briefly as Ukrainian allows:
 * "27–30 листопада 2026", "27 листопада – 3 грудня 2026", "28 грудня 2026 – 3 січня 2027".
 */
function shortRange(start: string, end: string): string {
  if (start === end) return formatPromoDay(start)
  const a = dayParts(start)
  const b = dayParts(end)
  if (a.year === b.year && a.month === b.month) return `${a.day}–${b.day} ${b.month} ${b.year}`
  if (a.year === b.year) return `${a.day} ${a.month} – ${b.day} ${b.month} ${b.year}`
  return `${formatPromoDay(start)} – ${formatPromoDay(end)}`
}

/** For a table cell: "27–30 листопада 2026", "з 27 листопада 2026", "по 30 листопада 2026", "Без терміну". */
export function daysText(startDay: string | null, endDay: string | null): string {
  if (startDay && endDay) return shortRange(startDay, endDay)
  if (startDay) return `з ${formatPromoDay(startDay)}`
  if (endDay) return `по ${formatPromoDay(endDay)}`
  return "Без терміну"
}

/** For a sentence: "з 27 по 30 листопада 2026", "лише 27 листопада 2026", "без обмеження в часі". */
function daysPhrase(startDay: string | null, endDay: string | null): string {
  if (startDay && endDay) {
    if (startDay === endDay) return `лише ${formatPromoDay(startDay)}`
    const a = dayParts(startDay)
    const b = dayParts(endDay)
    if (a.year === b.year && a.month === b.month) return `з ${a.day} по ${b.day} ${b.month} ${b.year}`
    if (a.year === b.year) return `з ${a.day} ${a.month} по ${b.day} ${b.month} ${b.year}`
    return `з ${formatPromoDay(startDay)} по ${formatPromoDay(endDay)}`
  }
  if (startDay) return `з ${formatPromoDay(startDay)}, без кінцевої дати`
  if (endDay) return `по ${formatPromoDay(endDay)} включно`
  return "без обмеження в часі"
}

/** How many orders the code may be used on in all: the total for a shared code, the customer's own for a personal one; null: no limit. */
export function orderLimit(record: Pick<PromoRecord, "ownerId" | "maxUses" | "perCustomer">): number | null {
  return record.ownerId ? record.perCustomer : record.maxUses
}

/** "3 з 100", "1 з 1", or "12" when there is no limit. */
export function usageText(record: Pick<PromoRecord, "ownerId" | "maxUses" | "perCustomer" | "usedCount">): string {
  const limit = orderLimit(record)
  return limit === null ? formatPrice(record.usedCount) : `${formatPrice(record.usedCount)} з ${formatPrice(limit)}`
}

/** "від 1 000 ₴" or "". */
export function minOrderText(minOrder: number): string {
  return minOrder > 0 ? `від ${money(minOrder)}` : ""
}

const times = (count: number) => (count === 1 ? "один раз" : `${formatPrice(count)} ${plural(count, ["раз", "рази", "разів"])}`)

/**
 * What the code will do, in the words of a shop owner, from the values of the form:
 * «Знижка 15% для всіх покупців на замовлення від 1 000 ₴.» «Діє з 27 по 30 листопада 2026, не більше 500 замовлень, одне на покупця.»
 * A value that is missing or wrong is said as "…", so the text never claims what will not be saved.
 */
export function describePromo(input: {
  value: PromoInput
  errors: PromoErrors
  personal: boolean
  /** The chosen customer, as text ("Олена Коваль, olena@example.com"); "" while nobody is chosen. */
  ownerText: string
  usedCount: number
  today: string
}): string[] {
  const { value, errors, personal, ownerText, usedCount, today } = input
  const sentences: string[] = []

  const percent = errors.percent ? "…" : String(value.percent)
  const minOrder = errors.minOrder ? " на замовлення від … ₴" : value.minOrder > 0 ? ` на замовлення від ${money(value.minOrder)}` : " на будь-яке замовлення"
  if (personal) {
    sentences.push(`Знижка ${percent}%${minOrder} лише для одного покупця${ownerText ? `: ${ownerText}` : ", якого ви оберете"}.`)
  } else {
    sentences.push(`Знижка ${percent}% для всіх покупців${minOrder}.`)
  }

  const dates = errors.startDay || errors.endDay ? "у дні, які ще треба виправити" : daysPhrase(value.startDay, value.endDay)
  if (personal) {
    const count = errors.perCustomer ? "… разів" : times(value.perCustomer)
    sentences.push(`Діє ${dates}; покупець може скористатися ним ${count}.`)
  } else {
    const total = errors.maxUses
      ? "не більше … замовлень"
      : value.maxUses === null
        ? "без обмеження кількості замовлень"
        : `не більше ${formatPrice(value.maxUses)} ${plural(value.maxUses, ["замовлення", "замовлень", "замовлень"])}`
    const each = errors.perCustomer ? "… на покупця" : value.perCustomer === 1 ? "одне на покупця" : `до ${formatPrice(value.perCustomer)} на покупця`
    sentences.push(`Діє ${dates}, ${total}, ${each}.`)
  }

  // What stops it from working right now, if anything.
  const limit = personal ? value.perCustomer : value.maxUses
  if (!value.active) sentences.push("Зараз код вимкнено: ним не можна скористатися, доки ви його не ввімкнете.")
  else if (!errors.endDay && value.endDay && value.endDay < today) sentences.push("Останній день уже минув, тож код не діятиме, доки ви не зміните дату.")
  else if (!errors.startDay && !errors.endDay && value.startDay && value.startDay > today) {
    const wait = daysBetween(today, value.startDay) - 1
    sentences.push(wait === 1 ? "Почне діяти завтра." : `Почне діяти через ${wait} ${plural(wait, ["день", "дні", "днів"])}.`)
  } else if (usedCount > 0 && limit !== null && usedCount >= limit) sentences.push("Усі використання вже вичерпано: збільште кількість, щоб кодом знову могли скористатися.")

  return sentences
}
