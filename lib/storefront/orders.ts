export type Tone = "neutral" | "progress" | "done" | "problem";

export const PAYMENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  Pending: { label: "Очікує оплати", tone: "neutral" },
  Success: { label: "Оплачено", tone: "done" },
  Declined: { label: "Оплату відхилено", tone: "problem" },
};

export const DELIVERY_STATUS: Record<string, { label: string; tone: Tone }> = {
  Proceeding: { label: "Обробляється", tone: "neutral" },
  Indelivery: { label: "У дорозі", tone: "progress" },
  Fulfilled: { label: "Отримано", tone: "done" },
  Canceled: { label: "Скасовано", tone: "problem" },
};

export const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-brand-mist text-brand-ink",
  progress: "bg-brand-tint text-brand-deep",
  done: "bg-brand-ok-tint text-brand-ok",
  problem: "bg-brand-sale-tint text-brand-sale",
};

/** Steps of an order's journey, in the order they happen. */
export const DELIVERY_STEPS = [
  { key: "Proceeding", label: "Прийнято" },
  { key: "Indelivery", label: "У дорозі" },
  { key: "Fulfilled", label: "Отримано" },
] as const;

export function formatOrderDate(value: string | Date | undefined | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Kiev" }).format(date);
}

/** "+380960871457" → "+380 •• ••• •• 57": enough to recognise your own number, useless to anyone else. */
export function maskPhone(phone: string): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  return digits.length < 4 ? "••••" : `••• ••• •• ${digits.slice(-2)}`;
}

export function maskEmail(email: string): string {
  const [name, domain] = String(email ?? "").split("@");
  if (!name || !domain) return "••••";
  return `${name.slice(0, 1)}•••@${domain}`;
}
