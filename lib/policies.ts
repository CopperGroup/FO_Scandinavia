/**
 * Return and delivery terms of the shop as search engines read them: how many
 * days a purchase can be returned, who pays for sending it back, how long an
 * order takes and what delivery costs. The owner sets them in the admin
 * ("Налаштування" → "Доставка і повернення"); the product pages and the home
 * page state them in their structured data.
 *
 * Nothing the owner has not stated is published: an empty field leaves that
 * part out of the markup.
 *
 * Pure helpers with no access to the database, shared by the admin form and
 * the server.
 */

export const POLICIES_KEY = "policies"

/** Who pays for sending a return back: not stated, the buyer, or the shop. */
export type ReturnFees = "" | "buyer" | "free"

export type StorePolicies = {
  /** Days a purchase can be returned; 0 leaves returns out of the markup. */
  returnDays: number
  returnFees: ReturnFees
  /** Days from the order to handing the parcel to the carrier. */
  handlingMin: number | null
  handlingMax: number | null
  /** Days the parcel travels. */
  transitMin: number | null
  transitMax: number | null
  /** What delivery of one order usually costs, in hryvnias; null when it is not stated. */
  shippingCost: number | null
}

/** The 14 days are what the shop's own pages and the consumer law already say. */
export const DEFAULT_POLICIES: StorePolicies = {
  returnDays: 14,
  returnFees: "",
  handlingMin: null,
  handlingMax: null,
  transitMin: null,
  transitMax: null,
  shippingCost: null,
}

export const RETURN_DAYS_MAX = 365
export const DELIVERY_DAYS_MAX = 60
export const SHIPPING_COST_MAX = 100_000

export type PolicyErrors = Partial<Record<"returnDays" | "handling" | "transit" | "shippingCost", string>>

/** A whole number from a form field or a stored value: null for an empty field, NaN for anything that is not a number. */
function whole(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN
  const text = String(value).trim().replace(",", ".")
  if (!text) return null
  return /^\d+(\.\d+)?$/.test(text) ? Number(text) : Number.NaN
}

const isWholeIn = (value: number, max: number) => Number.isInteger(value) && value >= 0 && value <= max

/** A "from – to" pair of days: both empty, or both filled (one filled field stands for both). */
function range(rawMin: unknown, rawMax: unknown): { min: number | null; max: number | null; error?: string } {
  let min = whole(rawMin)
  let max = whole(rawMax)
  if (min === null && max === null) return { min: null, max: null }
  if (min === null) min = max
  if (max === null) max = min
  if (!isWholeIn(min!, DELIVERY_DAYS_MAX) || !isWholeIn(max!, DELIVERY_DAYS_MAX)) return { min: null, max: null, error: `Вкажіть цілі числа від 0 до ${DELIVERY_DAYS_MAX}.` }
  if (min! > max!) return { min: null, max: null, error: "Перше число має бути не більшим за друге." }
  return { min, max }
}

/**
 * Brings whatever arrived (the form, the stored record) to valid terms.
 * `errors` says what is wrong, by field; a wrong field falls back to "not
 * stated", so a damaged record can never put wrong terms on the site.
 */
export function cleanPolicies(input: unknown): { policies: StorePolicies; errors: PolicyErrors } {
  if (!input || typeof input !== "object") return { policies: { ...DEFAULT_POLICIES }, errors: {} }
  const raw = input as Record<string, unknown>
  const errors: PolicyErrors = {}

  let returnDays = raw.returnDays === undefined ? DEFAULT_POLICIES.returnDays : (whole(raw.returnDays) ?? 0)
  if (!isWholeIn(returnDays, RETURN_DAYS_MAX)) {
    errors.returnDays = `Вкажіть ціле число від 0 до ${RETURN_DAYS_MAX}.`
    returnDays = 0
  }

  const handling = range(raw.handlingMin, raw.handlingMax)
  if (handling.error) errors.handling = handling.error
  const transit = range(raw.transitMin, raw.transitMax)
  if (transit.error) errors.transit = transit.error

  let shippingCost = whole(raw.shippingCost)
  if (shippingCost !== null && !(shippingCost >= 0 && shippingCost <= SHIPPING_COST_MAX)) {
    errors.shippingCost = `Вкажіть суму від 0 до ${SHIPPING_COST_MAX} грн або залиште поле порожнім.`
    shippingCost = null
  }

  return {
    policies: {
      returnDays,
      returnFees: raw.returnFees === "buyer" || raw.returnFees === "free" ? raw.returnFees : "",
      handlingMin: handling.min,
      handlingMax: handling.max,
      transitMin: transit.min,
      transitMax: transit.max,
      shippingCost: shippingCost === null ? null : Math.round(shippingCost * 100) / 100,
    },
    errors,
  }
}

/* ------------------------------------------------------------------ */
/* Structured data                                                     */
/* ------------------------------------------------------------------ */

const COUNTRY = "UA"
const CURRENCY = "UAH"

/** MerchantReturnPolicy for an offer or for the shop as a whole; null when the return window is not stated. */
export function returnPolicyJsonLd(policies: StorePolicies): Record<string, unknown> | null {
  if (policies.returnDays <= 0) return null
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: COUNTRY,
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: policies.returnDays,
    returnMethod: "https://schema.org/ReturnByMail",
    ...(policies.returnFees === "free" ? { returnFees: "https://schema.org/FreeReturn" } : {}),
    ...(policies.returnFees === "buyer" ? { returnFees: "https://schema.org/ReturnFeesCustomerResponsibility" } : {}),
  }
}

const days = (min: number, max: number) => ({ "@type": "QuantitativeValue", minValue: min, maxValue: max, unitCode: "DAY" })

/**
 * OfferShippingDetails for one product. The cost is 0 when the product alone
 * reaches the free-delivery sum, otherwise the cost the owner stated; with
 * neither known there is nothing true to say, and the result is null.
 */
export function shippingJsonLd(policies: StorePolicies, offer: { price: number; freeFrom: number }): Record<string, unknown> | null {
  const free = offer.freeFrom > 0 && offer.price >= offer.freeFrom
  const rate = free ? 0 : policies.shippingCost
  if (rate === null) return null

  const handling = policies.handlingMin !== null && policies.handlingMax !== null ? days(policies.handlingMin, policies.handlingMax) : null
  const transit = policies.transitMin !== null && policies.transitMax !== null ? days(policies.transitMin, policies.transitMax) : null

  return {
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: rate, currency: CURRENCY },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: COUNTRY },
    ...(handling || transit
      ? { deliveryTime: { "@type": "ShippingDeliveryTime", ...(handling ? { handlingTime: handling } : {}), ...(transit ? { transitTime: transit } : {}) } }
      : {}),
  }
}
