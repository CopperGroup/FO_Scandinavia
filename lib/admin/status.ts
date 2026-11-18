import type { PillTone } from "@/components/admin/ui";

/**
 * How order states read in the admin panel. Colour only where it carries
 * meaning: green for done/paid, red for a failed payment, black for new
 * orders that wait for someone.
 */

/** `tip`: what the state means and what happens next; shown when the pointer rests on the tag. */
export type StatusInfo = { label: string; tone: PillTone; tip?: string };

export const PAYMENT_STATUS_INFO: Record<string, StatusInfo> = {
  Pending: { label: "Очікує оплати", tone: "neutral", tip: "Гроші за замовлення ще не надійшли" },
  Success: { label: "Оплачено", tone: "ok", tip: "Гроші отримано: замовлення можна відправляти" },
  Declined: { label: "Оплату відхилено", tone: "problem", tip: "Платіж не пройшов. Зв’яжіться з покупцем або скасуйте замовлення" },
};

export const DELIVERY_STATUS_INFO: Record<string, StatusInfo> = {
  Proceeding: { label: "Нове", tone: "strong", tip: "Замовлення чекає на вас: його ще не відправлено" },
  Indelivery: { label: "У дорозі", tone: "neutral", tip: "Посилку передано перевізнику, покупець її ще не забрав" },
  Fulfilled: { label: "Виконано", tone: "ok", tip: "Покупець отримав замовлення" },
  Canceled: { label: "Скасовано", tone: "muted", tip: "Замовлення скасовано і не рахується у продажах" },
};

export const PAYMENT_STATUSES = ["Pending", "Success", "Declined"] as const;
export const DELIVERY_STATUSES = ["Proceeding", "Indelivery", "Fulfilled", "Canceled"] as const;

export function paymentStatusInfo(status: string | undefined | null): StatusInfo {
  return PAYMENT_STATUS_INFO[status ?? ""] ?? { label: status || "Невідомо", tone: "muted" };
}

export function deliveryStatusInfo(status: string | undefined | null): StatusInfo {
  return DELIVERY_STATUS_INFO[status ?? ""] ?? { label: status || "Невідомо", tone: "muted" };
}

export const ROLE_LABEL: Record<string, string> = {
  Owner: "Власник",
  Admin: "Адміністратор",
  User: "Клієнт",
};

const dateTime = new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Kiev" });
const dateOnly = new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Kiev" });

export function formatAdminDateTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : dateTime.format(date);
}

export function formatAdminDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : dateOnly.format(date);
}
