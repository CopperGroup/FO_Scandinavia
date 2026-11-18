import { cache } from "react";
import User from "@/lib/models/user.model";
import { connectToDB } from "@/lib/mongoose";
import { customerPromoCodes, type CustomerPromo } from "@/lib/promo";
import { plural } from "./format";
import { getCurrentUser } from "./session";

/**
 * The signed-in customer's promo codes; null for a guest. Read from the
 * session's own account only: there is no way to ask for someone else's.
 */
export const getMyPromoCodes = cache(async (): Promise<CustomerPromo[] | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  await connectToDB();
  const row = await User.findById(user.id).select("discounts").lean<{ discounts?: unknown[] }>();
  return customerPromoCodes(row?.discounts ?? []);
});

/** "16 грудня 2026" for a "YYYY-MM-DD" day. */
export function formatPromoDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

/** "на одне замовлення", "на 3 замовлення". */
export function promoUsesLabel(usesLeft: number | null): string {
  if (!usesLeft || usesLeft <= 1) return "на одне замовлення";
  return `на ${usesLeft} ${plural(usesLeft, ["замовлення", "замовлення", "замовлень"])}`;
}

/** "сьогодні останній день", "ще 3 дні". */
export function promoDaysLabel(daysLeft: number): string {
  if (daysLeft <= 1) return "сьогодні останній день";
  return `ще ${daysLeft} ${plural(daysLeft, ["день", "дні", "днів"])}`;
}
