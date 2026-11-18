import mongoose from "mongoose";
import { getCatalogRuntime, getCatalogStatus } from "@/lib/catalog/server/service";
import Order from "@/lib/models/order.model";
import { connectToDB } from "@/lib/mongoose";
import { fillSeries, rankTopProducts } from "./series";
import type { DashboardOverview, DashboardRange, Metric } from "./types";

export { DASHBOARD_RANGES, parseDashboardRange } from "./types";
export type { DashboardOverview, DashboardRange, Metric } from "./types";

/**
 * Data for the admin overview page, aggregated inside MongoDB.
 *
 * Four queries (they used to be eleven, three of them over every order):
 *  1. one pass over the orders of the selected period and the one before it
 *     (index on `data`), split with $facet into totals, the chart, the
 *     breakdowns, best sellers and the customers' e-mails;
 *  2. those customers' earlier orders (collated index on `email`), to tell
 *     new customers from returning ones;
 *  3. the open orders (index on `deliveryStatus` / `paymentStatus`);
 *  4. the eight latest orders (index on `data`).
 *
 * Not a server action on purpose: only the admin page (behind the admin
 * layout check) calls it, and it returns customer names.
 */

const TIME_ZONE = "Europe/Kiev";
const DAY_MS = 24 * 60 * 60 * 1000;
const EMAIL_COLLATION = { locale: "en", strength: 2 };

const RANGE_CONFIG: Record<DashboardRange, { days: number; unit: "day" | "week" | "month"; label: string }> = {
  "7d": { days: 7, unit: "day", label: "7 днів" },
  "30d": { days: 30, unit: "day", label: "30 днів" },
  "90d": { days: 91, unit: "week", label: "90 днів" },
  "12m": { days: 365, unit: "month", label: "12 місяців" },
};

function metric(value: number, previous: number): Metric {
  return { value, previous, change: previous > 0 ? ((value - previous) / previous) * 100 : null };
}

/** Paid and not canceled: the orders that count as revenue. */
const PAID_EXPR = { $and: [{ $eq: ["$paymentStatus", "Success"] }, { $ne: ["$deliveryStatus", "Canceled"] }] };

type Totals = { paidRevenue: number; paidOrders: number; orders: number; unitsSold: number };
type Breakdown = { _id: string | null; count: number; value: number };

type WindowFacet = {
  totals: (Totals & { _id: boolean })[];
  series: { _id: string; paidRevenue: number; orders: number }[];
  deliveryStatuses: Breakdown[];
  paymentTypes: Breakdown[];
  deliveryMethods: Breakdown[];
  top: { _id: mongoose.Types.ObjectId | null; units: number }[];
  emails: { _id: string }[];
};

function breakdownFacet(field: string) {
  return [{ $match: { current: true } }, { $group: { _id: `$${field}`, count: { $sum: 1 }, value: { $sum: { $ifNull: ["$value", 0] } } } }, { $sort: { count: -1 as const } }];
}

async function windowFacet(previousFrom: Date, from: Date, to: Date, unit: "day" | "week" | "month"): Promise<WindowFacet> {
  const [row] = await Order.aggregate<WindowFacet>([
    { $match: { data: { $gte: previousFrom, $lt: to } } },
    {
      $project: {
        data: 1,
        value: 1,
        email: 1,
        deliveryStatus: 1,
        paymentType: 1,
        deliveryMethod: 1,
        products: 1,
        current: { $gte: ["$data", from] },
        paid: PAID_EXPR,
      },
    },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: "$current",
              orders: { $sum: 1 },
              paidOrders: { $sum: { $cond: ["$paid", 1, 0] } },
              paidRevenue: { $sum: { $cond: ["$paid", { $ifNull: ["$value", 0] }, 0] } },
              unitsSold: { $sum: { $cond: ["$paid", { $sum: { $ifNull: ["$products.amount", []] } }, 0] } },
            },
          },
        ],
        series: [
          { $match: { current: true } },
          {
            $group: {
              // Bucket by the shop's calendar, not UTC, so late-evening orders land on the right day.
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: { $dateTrunc: { date: "$data", unit, timezone: TIME_ZONE, startOfWeek: "monday" } },
                  timezone: TIME_ZONE,
                },
              },
              orders: { $sum: 1 },
              paidRevenue: { $sum: { $cond: ["$paid", { $ifNull: ["$value", 0] }, 0] } },
            },
          },
        ],
        deliveryStatuses: breakdownFacet("deliveryStatus"),
        paymentTypes: breakdownFacet("paymentType"),
        deliveryMethods: breakdownFacet("deliveryMethod"),
        top: [
          { $match: { current: true, paid: true } },
          { $unwind: "$products" },
          { $group: { _id: "$products.product", units: { $sum: { $ifNull: ["$products.amount", 0] } } } },
        ],
        emails: [{ $match: { email: { $nin: [null, ""] } } }, { $group: { _id: { $toLower: "$email" } } }],
      },
    },
  ]);
  return row;
}

/**
 * Customers (by e-mail, any letter case) whose first order ever falls into
 * each window. Only the customers active in the two windows are looked at.
 */
async function newCustomers(emails: string[], previousFrom: Date, from: Date): Promise<{ current: number; previous: number }> {
  if (emails.length === 0) return { current: 0, previous: 0 };
  const [row] = await Order.aggregate<{ current: number; previous: number }>([
    { $match: { email: { $in: emails } } },
    { $group: { _id: { $toLower: "$email" }, first: { $min: "$data" } } },
    {
      $group: {
        _id: null,
        current: { $sum: { $cond: [{ $gte: ["$first", from] }, 1, 0] } },
        previous: { $sum: { $cond: [{ $and: [{ $gte: ["$first", previousFrom] }, { $lt: ["$first", from] }] }, 1, 0] } },
      },
    },
  ]).collation(EMAIL_COLLATION);
  return { current: row?.current ?? 0, previous: row?.previous ?? 0 };
}

async function openOrders(): Promise<DashboardOverview["pipeline"]> {
  const sumOf = (match: object) => [{ $match: match }, { $group: { _id: null, count: { $sum: 1 }, value: { $sum: { $ifNull: ["$value", 0] } } } }];
  const [row] = await Order.aggregate([
    // Each branch of the $or can use an index; the $facet then only sees open orders.
    { $match: { $or: [{ deliveryStatus: { $in: ["Proceeding", "Indelivery"] } }, { paymentStatus: "Pending" }] } },
    { $project: { value: 1, deliveryStatus: 1, paymentStatus: 1 } },
    {
      $facet: {
        new: sumOf({ deliveryStatus: "Proceeding" }),
        inDelivery: sumOf({ deliveryStatus: "Indelivery" }),
        awaitingPayment: sumOf({ paymentStatus: "Pending", deliveryStatus: { $ne: "Canceled" } }),
      },
    },
  ]);
  return (["new", "inDelivery", "awaitingPayment"] as const).map((key) => ({
    key,
    count: row?.[key]?.[0]?.count ?? 0,
    value: row?.[key]?.[0]?.value ?? 0,
  }));
}

async function recentOrders(limit = 8): Promise<DashboardOverview["recentOrders"]> {
  const rows = await Order.find({})
    .sort({ data: -1 })
    .limit(limit)
    .select("id name surname value paymentStatus deliveryStatus data products.amount")
    .lean<{ id?: string; name?: string; surname?: string; value?: number; paymentStatus?: string; deliveryStatus?: string; data?: Date; products?: { amount?: number }[] }[]>();

  return rows.map((row) => ({
    id: row.id ?? "",
    customer: [row.name, row.surname].filter(Boolean).join(" ") || "Без імені",
    value: row.value ?? 0,
    paymentStatus: row.paymentStatus ?? "",
    deliveryStatus: row.deliveryStatus ?? "",
    date: row.data ? new Date(row.data).toISOString() : "",
    items: (row.products ?? []).reduce((sum, product) => sum + (product.amount ?? 0), 0),
  }));
}

const zeroTotals: Totals = { paidRevenue: 0, paidOrders: 0, orders: 0, unitsSold: 0 };
const breakdownRows = (rows: Breakdown[]) => rows.map((row) => ({ name: row._id ?? "Не вказано", count: row.count, value: row.value }));

export async function getDashboardOverview(range: DashboardRange, now: Date = new Date()): Promise<DashboardOverview> {
  await connectToDB();

  const config = RANGE_CONFIG[range];
  const to = now;
  const from = new Date(to.getTime() - config.days * DAY_MS);
  const previousFrom = new Date(from.getTime() - config.days * DAY_MS);

  const [facet, pipelineRows, recent, catalog, runtime] = await Promise.all([
    windowFacet(previousFrom, from, to, config.unit),
    openOrders(),
    recentOrders(),
    getCatalogStatus(),
    getCatalogRuntime(),
  ]);
  const customers = await newCustomers(
    facet.emails.map((row) => row._id),
    previousFrom,
    from,
  );

  const current = facet.totals.find((row) => row._id === true) ?? zeroTotals;
  const previous = facet.totals.find((row) => row._id === false) ?? zeroTotals;
  const averageOf = (totals: Totals) => (totals.paidOrders > 0 ? totals.paidRevenue / totals.paidOrders : 0);

  return {
    range,
    rangeLabel: config.label,
    from: from.toISOString(),
    to: to.toISOString(),
    bucketUnit: config.unit,
    metrics: {
      paidRevenue: metric(current.paidRevenue, previous.paidRevenue),
      orders: metric(current.orders, previous.orders),
      averageOrder: metric(averageOf(current), averageOf(previous)),
      unitsSold: metric(current.unitsSold, previous.unitsSold),
      newCustomers: metric(customers.current, customers.previous),
    },
    series: fillSeries(facet.series, from, to, config.unit, TIME_ZONE),
    pipeline: pipelineRows,
    deliveryStatuses: breakdownRows(facet.deliveryStatuses).map((row) => ({ status: row.name, count: row.count, value: row.value })),
    paymentTypes: breakdownRows(facet.paymentTypes),
    deliveryMethods: breakdownRows(facet.deliveryMethods),
    topProducts: rankTopProducts(
      facet.top.map((row) => ({ productId: row._id ? String(row._id) : "", units: row.units })),
      runtime.variants.groupByProductId,
    ),
    recentOrders: recent,
    catalog,
  };
}
