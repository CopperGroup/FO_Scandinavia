/**
 * URL helpers shared by the admin list pages. Pure functions: no server or
 * browser APIs, so they are unit-tested and usable from any component.
 */

export type ListParams = Record<string, string | undefined>;

/** A page number from the URL: a positive integer, 1 for anything else. */
export function parsePage(raw: string | string[] | undefined): number {
  const value = Number.parseInt(String(Array.isArray(raw) ? raw[0] : raw ?? "1"), 10);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 100000) : 1;
}

/** A search query from the URL: trimmed, at most 80 characters. */
export function parseQuery(raw: string | string[] | undefined): string {
  return String(Array.isArray(raw) ? raw[0] : raw ?? "").trim().slice(0, 80);
}

/** One of the allowed values, or the fallback. */
export function parseChoice<T extends string>(raw: string | string[] | undefined, allowed: readonly T[], fallback: T): T {
  const value = String(Array.isArray(raw) ? raw[0] : raw ?? "");
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/**
 * A link to the same list with some parameters changed. Values equal to their
 * default (and empty values) are left out, so URLs stay short and canonical.
 */
export function listHref(base: string, current: ListParams, changes: ListParams = {}, defaults: ListParams = {}): string {
  const next = { ...current, ...changes };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value === undefined || value === "" || value === defaults[key]) continue;
    if (key === "page" && value === "1") continue;
    params.set(key, value);
  }
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export const PAGE_SIZES = [25, 50, 100] as const;

/** Rows per page from the URL: one of PAGE_SIZES, else the default. */
export function parsePageSize(raw: string | string[] | undefined, fallback = 25): number {
  const value = Number.parseInt(String(Array.isArray(raw) ? raw[0] : raw ?? ""), 10);
  return (PAGE_SIZES as readonly number[]).includes(value) ? value : fallback;
}

/** Clamps the page into range and gives the number of rows to skip. */
export function pageWindow(total: number, page: number, size: number): { page: number; pageCount: number; skip: number } {
  const pageCount = Math.max(1, Math.ceil(Math.max(0, total) / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  return { page: current, pageCount, skip: (current - 1) * size };
}
