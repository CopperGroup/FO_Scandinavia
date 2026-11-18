import { describePromoCode } from "./admin/promo";

/**
 * A customer's own promo codes, as their account page and the checkout show them.
 *
 * The state follows the check the order goes through (validatePromoCode in
 * lib/actions/promocode.actions.ts): a code stops working when the Kyiv
 * calendar reaches the date written in it, so its last working day is the day
 * before, and it stops working when no uses are left.
 */
export type PromoState = "active" | "used" | "expired";

export type CustomerPromo = {
  code: string;
  /** Discount in percent; null when the code cannot be read. */
  percent: number | null;
  /** Last day the code works, "YYYY-MM-DD" (Kyiv calendar); null when the code cannot be read. */
  lastDay: string | null;
  /** Days the code still works, today included; 0 when it does not. */
  daysLeft: number;
  usesLeft: number | null;
  state: PromoState;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const STATE_ORDER: Record<PromoState, number> = { active: 0, used: 1, expired: 2 };

/** Today's date in Kyiv, "YYYY-MM-DD". */
function kyivDay(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const dayNumber = (day: string) => Math.round(Date.parse(`${day}T00:00:00Z`) / DAY_MS);

export function customerPromo(code: string, now: Date = new Date()): CustomerPromo {
  const info = describePromoCode(code, now);
  const today = kyivDay(now);

  const readable = info.validUntil !== null && !Number.isNaN(Date.parse(`${info.validUntil}T00:00:00Z`));
  const lastDay = readable ? new Date(Date.parse(`${info.validUntil}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10) : null;
  const daysLeft = lastDay ? Math.max(0, dayNumber(lastDay) - dayNumber(today) + 1) : 0;

  let state: PromoState;
  if (info.usesLeft !== null && info.usesLeft <= 0) state = "used";
  else if (!lastDay || info.percent === null || info.usesLeft === null || daysLeft === 0) state = "expired";
  else state = "active";

  return { code, percent: info.percent, lastDay, daysLeft: state === "active" ? daysLeft : 0, usesLeft: info.usesLeft, state };
}

/** Codes a customer can still use first (the one that ends soonest on top), then the used and the expired ones, newest first. */
export function customerPromoCodes(codes: unknown[], now: Date = new Date()): CustomerPromo[] {
  const seen = new Set<string>();
  const list: CustomerPromo[] = [];
  for (const code of codes) {
    if (typeof code !== "string" || !code.trim() || seen.has(code)) continue;
    seen.add(code);
    list.push(customerPromo(code, now));
  }
  return list.sort((a, b) => {
    if (a.state !== b.state) return STATE_ORDER[a.state] - STATE_ORDER[b.state];
    if (a.state === "active") return a.daysLeft - b.daysLeft;
    return (b.lastDay ?? "").localeCompare(a.lastDay ?? "");
  });
}
