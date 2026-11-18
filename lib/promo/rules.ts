import { describePromoCode } from "../admin/promo";
import { plural } from "../storefront/format";

/**
 * Promo codes: the rules, with no database in them.
 *
 * A code gives a percentage off the goods of one order. It is either
 * SHARED (anyone who knows it may use it: a campaign) or PERSONAL (it belongs
 * to one customer). Its limits: the days it works on (Kyiv calendar, both
 * included), how many orders in total, how many per customer, and the
 * smallest order it applies to. The shop can switch any code off.
 *
 * The same check (`checkPromo`) is used when the customer presses "apply" and
 * when the order is placed, so the two can never disagree about the rules.
 */

export type PromoSource = "admin" | "welcome" | "review" | "legacy";

export type PromoRecord = {
  id: string;
  code: string;
  percent: number;
  /** The customer a personal code belongs to; null for a shared code. */
  ownerId: string | null;
  /** First and last day the code works, "YYYY-MM-DD" in Kyiv; null: no limit on that side. */
  startDay: string | null;
  endDay: string | null;
  /** Orders the code may be used on in total; null: no limit. */
  maxUses: number | null;
  /** Orders one customer may use it on. */
  perCustomer: number;
  /** The goods must cost at least this much; 0: any order. */
  minOrder: number;
  active: boolean;
  /** For the shop only: why the code exists. */
  note: string;
  source: PromoSource;
  usedCount: number;
};

export const PROMO_PERCENT_MIN = 1;
export const PROMO_PERCENT_MAX = 99;
export const PROMO_NOTE_MAX = 200;
/** Latin letters, digits and hyphens: what a customer can type from any keyboard without lookalike letters. */
export const PROMO_CODE_SHAPE = /^[A-Z0-9][A-Z0-9-]{2,31}$/;
/** Codes issued before the list existed carry three characters of the e-mail, which can be "." or "_". */
export const LEGACY_CODE_SHAPE = /^DV-[A-Z0-9._-]{5,37}$/;

const DAY_SHAPE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Today's date in Kyiv, "YYYY-MM-DD". */
export function kyivDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function isDay(value: unknown): value is string {
  return typeof value === "string" && DAY_SHAPE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Days from `from` to `to`, both included; 0 when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.max(0, Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1);
}

/** What the customer typed, as codes are stored: no spaces, capitals. */
export function normalizePromoCode(text: unknown): string {
  return String(text ?? "").replace(/\s+/g, "").toUpperCase();
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L

/** A new random code, "NV-7K4Q-9XTP". `random` gives numbers in [0, 1). */
export function randomPromoCode(random: () => number = Math.random): string {
  const pick = () => CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  const group = () => Array.from({ length: 4 }, pick).join("");
  return `NV-${group()}-${group()}`;
}

/* -------------------------------------------------------------------------- */
/*                                   State                                    */
/* -------------------------------------------------------------------------- */

export type PromoStatus = "active" | "scheduled" | "ended" | "used" | "off";

/** How many orders the code can still be used on by anyone; null: no limit. */
export function usesLeft(record: PromoRecord): number | null {
  const limits: number[] = [];
  if (record.maxUses !== null) limits.push(record.maxUses - record.usedCount);
  // A personal code has one customer, so their limit is the code's limit.
  if (record.ownerId) limits.push(record.perCustomer - record.usedCount);
  return limits.length ? Math.max(0, Math.min(...limits)) : null;
}

/** The state of the code as a whole, for the shop's list. */
export function promoStatus(record: PromoRecord, today: string): PromoStatus {
  if (!record.active) return "off";
  if (usesLeft(record) === 0) return "used";
  if (record.endDay && today > record.endDay) return "ended";
  if (record.startDay && today < record.startDay) return "scheduled";
  return "active";
}

export const PROMO_STATUS_LABEL: Record<PromoStatus, string> = {
  active: "Діє",
  scheduled: "Ще не почав діяти",
  ended: "Термін минув",
  used: "Використано",
  off: "Вимкнено",
};

/* -------------------------------------------------------------------------- */
/*                         May this customer use it now?                      */
/* -------------------------------------------------------------------------- */

export type PromoRefusal = "unknown" | "off" | "not-started" | "ended" | "used-up" | "sign-in" | "not-yours" | "already-used" | "min-order";

export type PromoContext = {
  /** The customer placing the order; null while they are not signed in and have given no e-mail yet. */
  userId: string | null;
  /** Price of the goods before the discount. */
  subtotal: number;
  today: string;
  /** Orders this customer has already used the code on. */
  usedByCustomer: number;
};

export type PromoVerdict = { ok: true; percent: number } | { ok: false; refusal: PromoRefusal };

export function checkPromo(record: PromoRecord | null, context: PromoContext): PromoVerdict {
  const no = (refusal: PromoRefusal): PromoVerdict => ({ ok: false, refusal });
  if (!record) return no("unknown");

  // Whose code it is comes first: a stranger learns nothing about a personal code, not even that it exists.
  if (record.ownerId) {
    if (!context.userId) return no("sign-in");
    if (record.ownerId !== context.userId) return no("unknown");
  }
  if (!record.active) return no("off");
  if (record.startDay && context.today < record.startDay) return no("not-started");
  if (record.endDay && context.today > record.endDay) return no("ended");
  if (context.usedByCustomer >= record.perCustomer) return no("already-used");
  if (record.maxUses !== null && record.usedCount >= record.maxUses) return no("used-up");
  if (context.subtotal < record.minOrder) return no("min-order");
  if (!(record.percent >= PROMO_PERCENT_MIN && record.percent <= PROMO_PERCENT_MAX)) return no("unknown");
  return { ok: true, percent: record.percent };
}

const money = (value: number) => `${new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 }).format(Math.round(value))} ₴`;

/** "16 грудня 2026" for a "YYYY-MM-DD" day. */
export function formatPromoDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date).replace(/\s*р\.$/, "");
}

/** What the customer is told when a code cannot be used. */
export function refusalText(refusal: PromoRefusal, record: PromoRecord | null): string {
  switch (refusal) {
    case "sign-in":
      return "Це особистий промокод. Увійдіть у свій акаунт, щоб ним скористатися.";
    case "off":
      return "Цей промокод більше не діє.";
    case "not-started":
      return record?.startDay ? `Цей промокод почне діяти ${formatPromoDay(record.startDay)}.` : "Цей промокод ще не діє.";
    case "ended":
      return record?.endDay ? `Термін дії цього промокоду минув ${formatPromoDay(record.endDay)}.` : "Термін дії цього промокоду минув.";
    case "used-up":
      return "Цей промокод уже використали стільки разів, скільки було можна.";
    case "already-used":
      return "Ви вже скористалися цим промокодом.";
    case "min-order":
      return record ? `Цей промокод діє для замовлень від ${money(record.minOrder)}. Додайте ще товарів і спробуйте знову.` : "Сума замовлення замала для цього промокоду.";
    default:
      return "Такого промокоду немає. Перевірте, чи код введено без помилок.";
  }
}

/* -------------------------------------------------------------------------- */
/*                       A customer's own codes, for them                     */
/* -------------------------------------------------------------------------- */

export type PromoState = "active" | "scheduled" | "used" | "expired";

export type CustomerPromo = {
  code: string;
  percent: number;
  /** First day it works, when that is still ahead. */
  startDay: string | null;
  /** Last day the code works; null: no end. */
  lastDay: string | null;
  /** Days the code still works, today included; null: no end; 0 when it does not work. */
  daysLeft: number | null;
  /** Orders the customer can still use it on. */
  usesLeft: number;
  minOrder: number;
  state: PromoState;
};

const STATE_ORDER: Record<PromoState, number> = { active: 0, scheduled: 1, used: 2, expired: 3 };

/** `usedByCustomer`: orders this customer has used the code on. */
export function customerPromo(record: PromoRecord, today: string, usedByCustomer: number): CustomerPromo {
  const left = Math.max(0, Math.min(record.perCustomer - usedByCustomer, record.maxUses === null ? Infinity : record.maxUses - record.usedCount));
  let state: PromoState;
  if (left === 0) state = "used";
  else if (!record.active || (record.endDay !== null && today > record.endDay)) state = "expired";
  else if (record.startDay !== null && today < record.startDay) state = "scheduled";
  else state = "active";

  return {
    code: record.code,
    percent: record.percent,
    startDay: state === "scheduled" ? record.startDay : null,
    lastDay: record.endDay,
    daysLeft: state === "active" || state === "scheduled" ? (record.endDay ? daysBetween(today, record.endDay) : null) : 0,
    usesLeft: state === "active" || state === "scheduled" ? left : 0,
    minOrder: record.minOrder,
    state,
  };
}

/** Codes that work first (the one that ends soonest on top), then the coming ones, then the used and the expired, newest first. */
export function sortCustomerPromos(list: CustomerPromo[]): CustomerPromo[] {
  return [...list].sort((a, b) => {
    if (a.state !== b.state) return STATE_ORDER[a.state] - STATE_ORDER[b.state];
    if (a.state === "active") return (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity);
    return (b.lastDay ?? "").localeCompare(a.lastDay ?? "");
  });
}

/** "на одне замовлення", "на 3 замовлення". */
export function promoUsesLabel(uses: number): string {
  if (uses <= 1) return "на одне замовлення";
  return `на ${uses} ${plural(uses, ["замовлення", "замовлення", "замовлень"])}`;
}

/** "сьогодні останній день", "ще 3 дні". */
export function promoDaysLabel(daysLeft: number): string {
  if (daysLeft <= 1) return "сьогодні останній день";
  return `ще ${daysLeft} ${plural(daysLeft, ["день", "дні", "днів"])}`;
}

/* -------------------------------------------------------------------------- */
/*                         The form in the admin panel                        */
/* -------------------------------------------------------------------------- */

export type PromoInput = {
  code: string;
  percent: number;
  ownerId: string | null;
  startDay: string | null;
  endDay: string | null;
  maxUses: number | null;
  perCustomer: number;
  minOrder: number;
  active: boolean;
  note: string;
};

export type PromoErrors = Partial<Record<keyof PromoInput, string>>;

const wholeNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(String(value).replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(number) ? number : NaN;
};

/** Checks what the admin form sent. Errors are worded for the person filling the form in. */
export function cleanPromoInput(input: Record<string, unknown>): { value: PromoInput; errors: PromoErrors } {
  const errors: PromoErrors = {};

  const code = normalizePromoCode(input.code);
  if (!code) errors.code = "Введіть код або натисніть «Згенерувати».";
  else if (!PROMO_CODE_SHAPE.test(code) && !LEGACY_CODE_SHAPE.test(code)) errors.code = "Код: від 3 до 32 латинських літер і цифр, можна з дефісом. Наприклад: ZYMA15.";

  const percent = wholeNumber(input.percent);
  if (percent === null) errors.percent = "Вкажіть знижку у відсотках.";
  else if (!Number.isInteger(percent) || percent < PROMO_PERCENT_MIN || percent > PROMO_PERCENT_MAX) errors.percent = `Знижка: ціле число від ${PROMO_PERCENT_MIN} до ${PROMO_PERCENT_MAX}.`;

  const ownerId = typeof input.ownerId === "string" && /^[0-9a-f]{24}$/i.test(input.ownerId) ? input.ownerId.toLowerCase() : null;
  // A string means "personal" (the form sends "" when no customer is chosen yet); null means shared.
  if (typeof input.ownerId === "string" && !ownerId) errors.ownerId = "Оберіть покупця зі списку.";

  const day = (value: unknown, field: "startDay" | "endDay"): string | null => {
    if (value === null || value === undefined || value === "") return null;
    if (isDay(value)) return value;
    errors[field] = "Оберіть дату в календарі.";
    return null;
  };
  const startDay = day(input.startDay, "startDay");
  const endDay = day(input.endDay, "endDay");
  if (startDay && endDay && endDay < startDay) errors.endDay = "Останній день не може бути раніше за перший.";

  const maxUsesRaw = wholeNumber(input.maxUses);
  let maxUses: number | null = null;
  if (maxUsesRaw !== null) {
    if (!Number.isInteger(maxUsesRaw) || maxUsesRaw < 1 || maxUsesRaw > 1_000_000) errors.maxUses = "Ціле число від 1, або залиште порожнім, якщо обмеження немає.";
    else maxUses = maxUsesRaw;
  }

  const perCustomerRaw = wholeNumber(input.perCustomer);
  let perCustomer = 1;
  if (perCustomerRaw !== null) {
    if (!Number.isInteger(perCustomerRaw) || perCustomerRaw < 1 || perCustomerRaw > 999) errors.perCustomer = "Ціле число від 1.";
    else perCustomer = perCustomerRaw;
  }

  const minOrderRaw = wholeNumber(input.minOrder);
  let minOrder = 0;
  if (minOrderRaw !== null) {
    if (Number.isNaN(minOrderRaw) || minOrderRaw < 0 || minOrderRaw > 10_000_000) errors.minOrder = "Сума в гривнях, або залиште порожнім.";
    else minOrder = Math.round(minOrderRaw);
  }

  const note = String(input.note ?? "").trim();
  if (note.length > PROMO_NOTE_MAX) errors.note = `Нотатка: не більше ${PROMO_NOTE_MAX} символів.`;

  return {
    value: { code, percent: percent ?? 0, ownerId, startDay, endDay, maxUses, perCustomer, minOrder, active: input.active !== false, note: note.slice(0, PROMO_NOTE_MAX) },
    errors,
  };
}

/* -------------------------------------------------------------------------- */
/*                  Codes the shop gives out by itself (settings)             */
/* -------------------------------------------------------------------------- */

export const PROMO_REWARDS_KEY = "promo-rewards";

export type PromoReward = { enabled: boolean; percent: number; days: number };
/** `welcome`: for registering. `review`: for a review of a bought product. */
export type PromoRewards = { welcome: PromoReward; review: PromoReward };
export type PromoRewardErrors = Partial<Record<"welcome.percent" | "welcome.days" | "review.percent" | "review.days", string>>;

/** What the shop did before these became settings. */
export const DEFAULT_PROMO_REWARDS: PromoRewards = {
  welcome: { enabled: true, percent: 10, days: 30 },
  review: { enabled: true, percent: 5, days: 30 },
};

export function cleanPromoRewards(input: unknown): { rewards: PromoRewards; errors: PromoRewardErrors } {
  const errors: PromoRewardErrors = {};
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const one = (key: "welcome" | "review"): PromoReward => {
    const raw = (source[key] && typeof source[key] === "object" ? source[key] : {}) as Record<string, unknown>;
    const fallback = DEFAULT_PROMO_REWARDS[key];
    const percent = raw.percent === undefined ? fallback.percent : Number(raw.percent);
    const days = raw.days === undefined ? fallback.days : Number(raw.days);
    if (!Number.isInteger(percent) || percent < PROMO_PERCENT_MIN || percent > PROMO_PERCENT_MAX) errors[`${key}.percent`] = `Ціле число від ${PROMO_PERCENT_MIN} до ${PROMO_PERCENT_MAX}.`;
    if (!Number.isInteger(days) || days < 1 || days > 365) errors[`${key}.days`] = "Ціле число від 1 до 365.";
    return {
      enabled: raw.enabled === undefined ? fallback.enabled : raw.enabled === true,
      percent: errors[`${key}.percent`] ? fallback.percent : percent,
      days: errors[`${key}.days`] ? fallback.days : days,
    };
  };
  return { rewards: { welcome: one("welcome"), review: one("review") }, errors };
}

/* -------------------------------------------------------------------------- */
/*                    Codes issued before there was a list                    */
/* -------------------------------------------------------------------------- */

/**
 * Reads an old personal code ("DV-" + percent + 4 digits + 3 letters of the
 * e-mail + date + uses left, kept in the customer's record) as a code of the
 * list. The old check refused the code on the date written in it, so its last
 * working day is the day before. Null when the text is not such a code.
 */
export function legacyPromo(code: string, ownerId: string): Omit<PromoRecord, "id"> | null {
  const info = describePromoCode(code);
  if (info.percent === null || info.usesLeft === null || !info.validUntil || !isDay(info.validUntil)) return null;
  if (info.percent < PROMO_PERCENT_MIN || info.percent > PROMO_PERCENT_MAX) return null;
  const normalized = normalizePromoCode(code);
  if (!LEGACY_CODE_SHAPE.test(normalized)) return null;
  const spent = info.usesLeft <= 0;
  return {
    code: normalized,
    percent: info.percent,
    ownerId,
    startDay: null,
    endDay: addDays(info.validUntil, -1),
    maxUses: null,
    // A spent code allowed one order and it was made; the others still have what is written in them.
    perCustomer: spent ? 1 : info.usesLeft,
    minOrder: 0,
    active: true,
    note: "",
    source: "legacy",
    usedCount: spent ? 1 : 0,
  };
}
