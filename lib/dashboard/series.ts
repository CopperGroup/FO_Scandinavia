import type { DashboardOverview } from "./types";

/**
 * Pure helpers of the dashboard loader (unit-tested): filling the chart's
 * empty buckets and ranking best sellers by product group.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
type Unit = "day" | "week" | "month";

/** Calendar date (YYYY-MM-DD) of an instant in the shop's time zone. */
export function localDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** First day of the bucket a calendar date belongs to, as a UTC-midnight date used only for stepping. */
export function bucketStart(key: string, unit: Unit): Date {
  const date = new Date(`${key}T00:00:00.000Z`);
  if (unit === "week") return new Date(date.getTime() - ((date.getUTCDay() + 6) % 7) * DAY_MS);
  if (unit === "month") return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  return date;
}

function nextBucket(date: Date, unit: Unit): Date {
  if (unit === "month") return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return new Date(date.getTime() + (unit === "week" ? 7 : 1) * DAY_MS);
}

/** Every bucket of the window, so a quiet day shows as zero instead of vanishing from the axis. */
export function fillSeries(
  rows: { _id: string; paidRevenue: number; orders: number }[],
  from: Date,
  to: Date,
  unit: Unit,
  timeZone: string,
): DashboardOverview["series"] {
  const byStart = new Map(rows.map((row) => [row._id, row]));
  const series: DashboardOverview["series"] = [];
  const last = bucketStart(localDateKey(new Date(to.getTime() - 1), timeZone), unit);
  for (let cursor = bucketStart(localDateKey(from, timeZone), unit); cursor.getTime() <= last.getTime(); cursor = nextBucket(cursor, unit)) {
    const key = cursor.toISOString().slice(0, 10);
    const row = byStart.get(key);
    series.push({ start: key, paidRevenue: row?.paidRevenue ?? 0, orders: row?.orders ?? 0 });
  }
  return series;
}

type Group = { key: string; title: string; members: { image?: string | null }[] };

/** Best sellers of the period, with the sizes of one item counted together; links to the size that sold best. */
export function rankTopProducts(rows: { productId: string; units: number }[], groupByProductId: Map<string, Group>, limit = 6): DashboardOverview["topProducts"] {
  const byGroup = new Map<string, DashboardOverview["topProducts"][number] & { productUnits: Map<string, number> }>();

  for (const row of rows) {
    const group = groupByProductId.get(row.productId);
    if (!group) continue; // Deleted products are not ranked.

    const entry = byGroup.get(group.key) ?? {
      key: group.key,
      productId: row.productId,
      title: group.title,
      image: group.members.find((member) => member.image)?.image ?? null,
      units: 0,
      variants: 0,
      productUnits: new Map<string, number>(),
    };
    entry.units += row.units;
    entry.productUnits.set(row.productId, row.units);
    byGroup.set(group.key, entry);
  }

  return Array.from(byGroup.values())
    .sort((a, b) => b.units - a.units || a.title.localeCompare(b.title, "uk"))
    .slice(0, limit)
    .map(({ productUnits, ...entry }) => {
      const [bestSeller] = Array.from(productUnits.entries()).sort((a, b) => b[1] - a[1]);
      return { ...entry, productId: bestSeller?.[0] ?? entry.productId, variants: productUnits.size };
    });
}
