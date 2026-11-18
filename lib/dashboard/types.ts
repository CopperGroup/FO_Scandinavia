import type { CatalogStatus } from "@/lib/catalog/server/service";

/**
 * Shapes shared by the dashboard's server loader and its client component.
 * This file must stay free of server-only imports (type imports are fine).
 */

export const DASHBOARD_RANGES = ["7d", "30d", "90d", "12m"] as const;
export type DashboardRange = (typeof DASHBOARD_RANGES)[number];

export type Metric = { value: number; previous: number; change: number | null };

export type DashboardOverview = {
  range: DashboardRange;
  rangeLabel: string;
  from: string;
  to: string;
  bucketUnit: "day" | "week" | "month";
  metrics: {
    paidRevenue: Metric;
    orders: Metric;
    averageOrder: Metric;
    unitsSold: Metric;
    newCustomers: Metric;
  };
  series: { start: string; paidRevenue: number; orders: number }[];
  /** Orders that still need someone's attention, regardless of the selected period. */
  pipeline: { key: "new" | "inDelivery" | "awaitingPayment"; count: number; value: number }[];
  deliveryStatuses: { status: string; count: number; value: number }[];
  paymentTypes: { name: string; count: number; value: number }[];
  deliveryMethods: { name: string; count: number; value: number }[];
  topProducts: { key: string; productId: string; title: string; image: string | null; units: number; variants: number }[];
  recentOrders: {
    id: string;
    customer: string;
    value: number;
    paymentStatus: string;
    deliveryStatus: string;
    date: string;
    items: number;
  }[];
  catalog: CatalogStatus;
};

export function parseDashboardRange(value: string | string[] | undefined): DashboardRange {
  const single = Array.isArray(value) ? value[0] : value;
  return (DASHBOARD_RANGES as readonly string[]).includes(single ?? "") ? (single as DashboardRange) : "30d";
}
