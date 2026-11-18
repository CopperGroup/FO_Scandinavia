import { Store } from "@/constants/store";

/** "1 299" — grouped the Ukrainian way, no decimals. */
export const formatPrice = (value: number) =>
  new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 }).format(Math.round(Number(value) || 0));

/** "1 299 ₴" */
export const money = (value: number) => `${formatPrice(value)} ${Store.currency_sign}`;

/** Ukrainian plural: plural(3, ["товар", "товари", "товарів"]) → "товари". */
export function plural(count: number, forms: [string, string, string]): string {
  const lastTwo = Math.abs(count) % 100;
  const last = lastTwo % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return forms[2];
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

export const countLabel = (count: number, forms: [string, string, string]) => `${formatPrice(count)} ${plural(count, forms)}`;

export const PRODUCT_FORMS: [string, string, string] = ["товар", "товари", "товарів"];
