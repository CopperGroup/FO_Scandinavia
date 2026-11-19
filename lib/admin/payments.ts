import { escapeRegExp } from "@/lib/catalog/text";
import Order, { REAL_ORDER } from "@/lib/models/order.model";
import { connectToDB } from "@/lib/mongoose";
import { pageWindow } from "./list";

/**
 * The admin payments list. Server-only (imported by the page, never by a
 * client component); the page itself sits behind the admin layout check.
 */

export const PAYMENT_TABS = [
  { key: "all", label: "Усі", status: null },
  { key: "pending", label: "Очікують оплати", status: "Pending" },
  { key: "paid", label: "Оплачені", status: "Success" },
  { key: "declined", label: "Відхилені", status: "Declined" },
] as const;

export type PaymentTabKey = (typeof PAYMENT_TABS)[number]["key"];
export const PAYMENT_TAB_KEYS = PAYMENT_TABS.map((tab) => tab.key) as PaymentTabKey[];

export const PAYMENT_SORTS = ["new", "old", "sum-desc", "sum-asc"] as const;
export type PaymentSort = (typeof PAYMENT_SORTS)[number];

const SORT_SPEC: Record<PaymentSort, Record<string, 1 | -1>> = {
  new: { data: -1 },
  old: { data: 1 },
  "sum-desc": { value: -1, data: -1 },
  "sum-asc": { value: 1, data: -1 },
};

export const PAYMENTS_PAGE_SIZE = 25;

export type PaymentRow = {
  id: string;
  date: string | null;
  customer: string;
  phone: string;
  email: string;
  value: number;
  paymentStatus: string;
  paymentType: string;
  deliveryStatus: string;
};

type Bucket = { count: number; value: number };
/** Raw count and sum per tab, plus the unpaid orders that are still going ahead (not canceled). */
export type PaymentSummary = Record<"all" | "pending" | "paid" | "declined", Bucket> & { pendingOpen: Bucket };

export type PaymentList = {
  rows: PaymentRow[];
  total: number;
  page: number;
  pageCount: number;
  summary: PaymentSummary;
};

/** Orders as payments: one page of rows plus count and sum per payment status, from one aggregation. */
export async function listPayments({ tab, query, sort, page, pageSize = PAYMENTS_PAGE_SIZE }: { tab: PaymentTabKey; query: string; sort: PaymentSort; page: number; pageSize?: number }): Promise<PaymentList> {
  await connectToDB();

  const search = query.trim();
  const pattern = search ? new RegExp(escapeRegExp(search), "i") : null;
  const searchFilter = { ...(pattern ? { $or: [{ id: pattern }, { name: pattern }, { surname: pattern }, { phoneNumber: pattern }, { email: pattern }] } : {}), ...REAL_ORDER };
  const status = PAYMENT_TABS.find((entry) => entry.key === tab)?.status ?? null;
  const filter = status ? { ...searchFilter, paymentStatus: status } : searchFilter;

  // Count and sum per status (tabs and tiles) in one pass; canceled orders are also counted apart.
  const grouped = await Order.aggregate<{ _id: string | null; count: number; value: number; open: number; openValue: number }>([
    { $match: searchFilter },
    {
      $group: {
        _id: "$paymentStatus",
        count: { $sum: 1 },
        value: { $sum: { $ifNull: ["$value", 0] } },
        open: { $sum: { $cond: [{ $ne: ["$deliveryStatus", "Canceled"] }, 1, 0] } },
        openValue: { $sum: { $cond: [{ $ne: ["$deliveryStatus", "Canceled"] }, { $ifNull: ["$value", 0] }, 0] } },
      },
    },
  ]);
  const byStatus = new Map(grouped.map((row) => [row._id, row]));
  const pick = (key: string): Bucket => ({ count: byStatus.get(key)?.count ?? 0, value: byStatus.get(key)?.value ?? 0 });
  const summary: PaymentSummary = {
    all: { count: grouped.reduce((sum, row) => sum + row.count, 0), value: grouped.reduce((sum, row) => sum + row.value, 0) },
    pending: pick("Pending"),
    paid: pick("Success"),
    declined: pick("Declined"),
    pendingOpen: { count: byStatus.get("Pending")?.open ?? 0, value: byStatus.get("Pending")?.openValue ?? 0 },
  };

  const total = status ? (byStatus.get(status)?.count ?? 0) : summary.all.count;
  const window = pageWindow(total, page, pageSize);

  const orders = await Order.find(filter)
    .sort(SORT_SPEC[sort])
    .skip(window.skip)
    .limit(pageSize)
    .select("id data name surname phoneNumber email value paymentStatus paymentType deliveryStatus")
    .lean<any[]>();

  const rows: PaymentRow[] = orders.map((order) => ({
    id: String(order.id),
    date: order.data ? new Date(order.data).toISOString() : null,
    customer: [order.name, order.surname].filter(Boolean).join(" "),
    phone: order.phoneNumber ?? "",
    email: order.email ?? "",
    value: order.value ?? 0,
    paymentStatus: order.paymentStatus ?? "",
    paymentType: order.paymentType ?? "",
    deliveryStatus: order.deliveryStatus ?? "",
  }));

  return { rows, total, page: window.page, pageCount: window.pageCount, summary };
}
