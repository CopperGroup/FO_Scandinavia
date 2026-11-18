/**
 * Catalog URL contract, shared by server-rendered links and the filter panel.
 *
 *   department   women | men | kids | shoes | home | food
 *   categories   id,id
 *   search       free text
 *   sort         default | new | popular | low_price | hight_price | discount
 *   size         XL__L            (values joined by "__": a size may contain a comma)
 *   vendor       H&M,Ellos
 *   minPrice / maxPrice
 *   sale         1
 *   selectParams Колір--Чорний__Білий,Матеріал--Бавовна
 *   unitParams   Вага--100m500
 *   page         1…
 */

export type RawSearchParams = Record<string, string | string[] | undefined>;

export const CATALOG_PATH = "/catalog";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

/** Search params as a flat string map, empty values dropped. */
export function flattenParams(raw: RawSearchParams | URLSearchParams): Record<string, string> {
  const flat: Record<string, string> = {};
  if (raw instanceof URLSearchParams) {
    raw.forEach((value, key) => {
      if (value !== "" && !(key in flat)) flat[key] = value;
    });
    return flat;
  }
  for (const [key, value] of Object.entries(raw)) {
    const text = first(value);
    if (text !== "") flat[key] = text;
  }
  return flat;
}

/**
 * Catalog link with some params changed. A null or empty value removes the
 * param. Any change other than the page itself returns to page 1.
 */
export function catalogHref(current: Record<string, string>, changes: Record<string, string | null | undefined> = {}): string {
  const next: Record<string, string> = { ...current };
  if (!("page" in changes)) delete next.page;
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === undefined || value === "") delete next[key];
    else next[key] = value;
  }
  if (next.page === "1") delete next.page;
  if (next.sort === "default") delete next.sort;

  const query = new URLSearchParams(next).toString();
  return query ? `${CATALOG_PATH}?${query}` : CATALOG_PATH;
}

export const splitList = (value: string | undefined, separator: string) =>
  (value ?? "").split(separator).map((part) => part.trim()).filter(Boolean);

/** Adds the value when absent, removes it when present. */
export function toggleInList(value: string | undefined, item: string, separator: string): string {
  const items = splitList(value, separator);
  const next = items.includes(item) ? items.filter((entry) => entry !== item) : [...items, item];
  return next.join(separator);
}

/* ------------------------------ select params ----------------------------- */

export type SelectParamState = Record<string, string[]>;

/** Mirrors the tolerant parsing of the query engine: a fragment without "--" continues the previous entry. */
export function parseSelectParams(value: string | undefined): SelectParamState {
  const entries: string[] = [];
  for (const fragment of (value ?? "").split(",")) {
    if (fragment.includes("--") || entries.length === 0) entries.push(fragment);
    else entries[entries.length - 1] += `,${fragment}`;
  }
  const state: SelectParamState = {};
  for (const entry of entries) {
    const separator = entry.indexOf("--");
    if (separator <= 0) continue;
    const values = entry.slice(separator + 2).split("__").filter(Boolean);
    if (values.length > 0) state[entry.slice(0, separator)] = values;
  }
  return state;
}

export function serializeSelectParams(state: SelectParamState): string {
  return Object.entries(state)
    .filter(([, values]) => values.length > 0)
    .map(([name, values]) => `${name}--${values.join("__")}`)
    .join(",");
}

export function toggleSelectParam(value: string | undefined, name: string, item: string): string {
  const state = parseSelectParams(value);
  const current = state[name] ?? [];
  state[name] = current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item];
  return serializeSelectParams(state);
}

/* ------------------------------- unit params ------------------------------ */

export type UnitParamState = Record<string, { min: string; max: string }>;

export function parseUnitParams(value: string | undefined): UnitParamState {
  const state: UnitParamState = {};
  for (const entry of (value ?? "").split(",")) {
    const separator = entry.indexOf("--");
    if (separator <= 0) continue;
    const [min, max] = entry.slice(separator + 2).split("m");
    if (min !== undefined && max !== undefined) state[entry.slice(0, separator)] = { min, max };
  }
  return state;
}

export function serializeUnitParams(state: UnitParamState): string {
  return Object.entries(state)
    .filter(([, range]) => range.min !== "" && range.max !== "")
    .map(([name, range]) => `${name}--${range.min}m${range.max}`)
    .join(",");
}

/** Params that count as "a filter is applied" (sorting and paging do not). */
export const FILTER_KEYS = ["size", "vendor", "minPrice", "maxPrice", "sale", "selectParams", "unitParams"] as const;

export function activeFilterCount(params: Record<string, string>): number {
  let count = splitList(params.size, "__").length + splitList(params.vendor, ",").length;
  if (params.minPrice || params.maxPrice) count += 1;
  if (params.sale === "1") count += 1;
  count += Object.values(parseSelectParams(params.selectParams)).reduce((sum, values) => sum + values.length, 0);
  count += Object.keys(parseUnitParams(params.unitParams)).length;
  return count;
}
