import { compareSizes, facetValue, isSizeParamName, normalizeSize } from "./attributes";
import { normalizeForSearch } from "./text";
import type { CatalogCategory, CatalogListing, FilterSettings, ListingVariant } from "./types";

export const CATALOG_PAGE_SIZE = 24;

export const SORT_KEYS = ["default", "low_price", "hight_price", "new", "popular", "discount"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export type SelectFilter = { name: string; values: Set<string> };
export type UnitFilter = { name: string; min: number; max: number };

export type CatalogQuery = {
  page: number;
  sort: SortKey;
  search: string;
  categories: string[];
  vendors: string[];
  /** Size labels ("XL", "38"); a listing matches when one of them is in stock. */
  sizes: string[];
  /** Only listings sold below their regular price. */
  onSale: boolean;
  minPrice: number | null;
  maxPrice: number | null;
  selectFilters: SelectFilter[];
  unitFilters: UnitFilter[];
};

export type SelectFacet = { totalProducts: number; type: string; values: { value: string; valueTotalProducts: number }[] };
export type UnitFacet = { totalProducts: number; type: string; min: number; max: number };

export type SizeFacetValue = { value: string; count: number };

export type CatalogResultItem = {
  listing: CatalogListing;
  /** Product the card should open: the variant the query asked for, else the default. */
  targetId: string;
  /** True when the query singled out one variant (article number, size filter). */
  targeted: boolean;
};

export type CatalogResult = {
  items: CatalogResultItem[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  facets: {
    minPrice: number;
    maxPrice: number;
    vendors: string[];
    /** Sizes in stock within the category scope, in wearing order. */
    sizes: SizeFacetValue[];
    selectParams: Record<string, SelectFacet>;
    unitParams: Record<string, UnitFacet>;
  };
  counts: {
    categoriesCount: Record<string, number>;
    vendorsCount: Record<string, number>;
  };
};

/* -------------------------------------------------------------------------- */
/*                                   Parsing                                  */
/* -------------------------------------------------------------------------- */

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function toNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Entries are comma separated, but a value may itself contain a comma
 * ("19,3"). A fragment without the "--" marker continues the previous entry.
 */
function splitEntries(value: string): string[] {
  const entries: string[] = [];
  for (const fragment of value.split(",")) {
    if (fragment.includes("--") || entries.length === 0) entries.push(fragment);
    else entries[entries.length - 1] += `,${fragment}`;
  }
  return entries.filter((entry) => entry.includes("--"));
}

export function parseCatalogQuery(raw: RawParams): CatalogQuery {
  const page = Math.max(1, Math.floor(toNumber(first(raw.page)) ?? 1));
  const sortValue = first(raw.sort);
  const sort = (SORT_KEYS as readonly string[]).includes(sortValue) ? (sortValue as SortKey) : "default";

  const selectFilters: SelectFilter[] = splitEntries(first(raw.selectParams)).flatMap((entry) => {
    const separator = entry.indexOf("--");
    const name = entry.slice(0, separator);
    const values = entry
      .slice(separator + 2)
      .split("__")
      .filter((value) => value.length > 0)
      .map((value) => facetValue(name, value));
    return name && values.length > 0 ? [{ name, values: new Set(values) }] : [];
  });

  const unitFilters: UnitFilter[] = splitEntries(first(raw.unitParams)).flatMap((entry) => {
    const separator = entry.indexOf("--");
    const name = entry.slice(0, separator);
    const [min, max] = entry.slice(separator + 2).split("m").map((part) => toNumber(part));
    return name && min !== null && max !== null && min !== undefined && max !== undefined ? [{ name, min, max }] : [];
  });

  return {
    page,
    sort,
    search: first(raw.search).trim(),
    categories: first(raw.categories).split(",").map((id) => id.trim()).filter(Boolean),
    vendors: first(raw.vendor).split(",").map((vendor) => vendor.trim()).filter(Boolean),
    sizes: first(raw.size).split("__").map((size) => size.trim()).filter(Boolean),
    onSale: first(raw.sale) === "1",
    minPrice: toNumber(first(raw.minPrice)),
    maxPrice: toNumber(first(raw.maxPrice)),
    selectFilters,
    unitFilters,
  };
}

/* -------------------------------------------------------------------------- */
/*                                  Matching                                  */
/* -------------------------------------------------------------------------- */

/** The longest number in a value such as "250 г" or "1,5 л". */
export function extractNumber(input: string): number | null {
  const matches = input.match(/\d+(?:[.,]\d+)?/g);
  if (!matches) return null;
  const longest = matches.reduce((best, current) => (current.length > best.length ? current : best));
  const parsed = Number.parseFloat(longest.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function paramOf(listing: CatalogListing, variant: ListingVariant, name: string): string | undefined {
  return variant.params[name] ?? listing.params[name];
}

/** Variants of a listing that satisfy every param and price filter at once. */
function matchingVariants(listing: CatalogListing, query: CatalogQuery): ListingVariant[] {
  const { selectFilters, unitFilters, minPrice, maxPrice, sizes, onSale } = query;
  if (
    selectFilters.length === 0 &&
    unitFilters.length === 0 &&
    minPrice === null &&
    maxPrice === null &&
    sizes.length === 0 &&
    !onSale
  ) {
    return listing.variants;
  }

  return listing.variants.filter((variant) => {
    if (minPrice !== null && variant.priceToShow < minPrice) return false;
    if (maxPrice !== null && variant.priceToShow > maxPrice) return false;
    if (onSale && variant.priceToShow >= variant.price) return false;
    if (sizes.length > 0 && (variant.size === null || !sizes.includes(variant.size))) return false;

    for (const filter of selectFilters) {
      const value = paramOf(listing, variant, filter.name);
      if (value === undefined || !filter.values.has(value)) return false;
    }

    for (const filter of unitFilters) {
      const value = paramOf(listing, variant, filter.name);
      const numeric = value === undefined ? null : extractNumber(value);
      if (numeric === null || numeric < filter.min || numeric > filter.max) return false;
    }

    return true;
  });
}

function relevance(listing: CatalogListing, terms: string[]): number {
  const title = normalizeForSearch(listing.title);
  let score = 0;
  for (const term of terms) {
    if (listing.variants.some((variant) => variant.articleNumber.toLowerCase() === term)) score += 6;
    else if (title.startsWith(term)) score += 4;
    else if (title.split(" ").some((word) => word.startsWith(term))) score += 3;
    else if (title.includes(term)) score += 2;
    else score += 1;
  }
  return score;
}

function comparator(sort: SortKey, scores: Map<string, number> | null) {
  const tieBreak = (a: CatalogListing, b: CatalogListing) => b.createdAt - a.createdAt || a.key.localeCompare(b.key);
  switch (sort) {
    case "low_price":
      return (a: CatalogListing, b: CatalogListing) => a.priceMin - b.priceMin || tieBreak(a, b);
    case "hight_price":
      return (a: CatalogListing, b: CatalogListing) => b.priceMin - a.priceMin || tieBreak(a, b);
    case "popular":
      return (a: CatalogListing, b: CatalogListing) => b.salesCount - a.salesCount || tieBreak(a, b);
    case "discount":
      return (a: CatalogListing, b: CatalogListing) => b.discountPercent - a.discountPercent || tieBreak(a, b);
    case "new":
      return tieBreak;
    default:
      if (!scores) return tieBreak;
      return (a: CatalogListing, b: CatalogListing) =>
        (scores.get(b.key) ?? 0) - (scores.get(a.key) ?? 0) || tieBreak(a, b);
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Facets                                   */
/* -------------------------------------------------------------------------- */

function valuesOf(listing: CatalogListing, name: string): string[] {
  const values = new Set<string>();
  if (listing.params[name] !== undefined) values.add(listing.params[name]);
  for (const variant of listing.variants) if (variant.params[name] !== undefined) values.add(variant.params[name]);
  return Array.from(values);
}

function compareFacetValues(name: string) {
  if (isSizeParamName(name)) {
    return (a: string, b: string) => compareSizes(normalizeSize(a), normalizeSize(b));
  }
  return (a: string, b: string) => a.localeCompare(b, "uk", { numeric: true });
}

function buildParamFacets(scoped: CatalogListing[], categories: string[], filterSettings: FilterSettings) {
  const selectParams: Record<string, SelectFacet> = {};
  const unitParams: Record<string, UnitFacet> = {};

  for (const categoryId of categories) {
    const settings = filterSettings[categoryId];
    if (!settings?.params) continue;
    for (const [name, param] of Object.entries(settings.params)) {
      if (typeof param?.type !== "string") continue;
      if (param.type.startsWith("unit-")) unitParams[name] = { totalProducts: param.totalProducts, type: param.type, min: 0, max: 0 };
      else if (param.type === "select") selectParams[name] = { totalProducts: param.totalProducts, type: param.type, values: [] };
    }
  }

  const selectNames = Object.keys(selectParams);
  const unitNames = Object.keys(unitParams);
  if (selectNames.length === 0 && unitNames.length === 0) return { selectParams, unitParams };

  const valueCounts: Record<string, Map<string, number>> = {};
  const unitRanges: Record<string, { min: number; max: number }> = {};

  for (const listing of scoped) {
    for (const name of selectNames) {
      const counts = (valueCounts[name] ??= new Map());
      for (const value of valuesOf(listing, name)) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    for (const name of unitNames) {
      for (const value of valuesOf(listing, name)) {
        const numeric = extractNumber(value);
        if (numeric === null) continue;
        const range = (unitRanges[name] ??= { min: numeric, max: numeric });
        range.min = Math.min(range.min, numeric);
        range.max = Math.max(range.max, numeric);
      }
    }
  }

  for (const name of selectNames) {
    const compare = compareFacetValues(name);
    selectParams[name].values = Array.from(valueCounts[name] ?? [])
      .map(([value, valueTotalProducts]) => ({ value, valueTotalProducts }))
      .sort((a, b) => compare(a.value, b.value));
  }
  for (const name of unitNames) {
    if (unitRanges[name]) Object.assign(unitParams[name], unitRanges[name]);
  }

  return { selectParams, unitParams };
}

function countBy(listings: CatalogListing[], keysOf: (listing: CatalogListing) => string[]): Record<string, number> {
  const counts: Record<string, number> = { "": listings.length };
  for (const listing of listings) {
    for (const key of keysOf(listing)) if (key) counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/* -------------------------------------------------------------------------- */
/*                                    Query                                   */
/* -------------------------------------------------------------------------- */

export type QuerySource = {
  listings: CatalogListing[];
  categories: CatalogCategory[];
  filterSettings: FilterSettings;
};

export function runCatalogQuery(source: QuerySource, query: CatalogQuery, pageSize = CATALOG_PAGE_SIZE): CatalogResult {
  // 1. Category scope. Facets describe the scope, not the fully filtered set.
  const knownCategories = new Set(source.categories.map((category) => category.categoryId));
  const selectedCategories = query.categories.filter((id) => knownCategories.has(id));
  const categorySet = new Set(selectedCategories);
  const scoped =
    query.categories.length === 0
      ? source.listings
      : source.listings.filter((listing) => listing.category.some((id) => categorySet.has(id)));

  const { selectParams, unitParams } = buildParamFacets(scoped, selectedCategories, source.filterSettings);

  let minPrice = Infinity;
  let maxPrice = -Infinity;
  const vendorSet = new Set<string>();
  const sizeCounts = new Map<string, number>();
  for (const listing of scoped) {
    minPrice = Math.min(minPrice, listing.priceMin);
    maxPrice = Math.max(maxPrice, listing.priceMax);
    if (listing.vendor) vendorSet.add(listing.vendor);
    const seen = new Set<string>();
    for (const variant of listing.variants) {
      if (variant.size === null || seen.has(variant.size)) continue;
      seen.add(variant.size);
      sizeCounts.set(variant.size, (sizeCounts.get(variant.size) ?? 0) + 1);
    }
  }
  const sizes: SizeFacetValue[] = Array.from(sizeCounts, ([value, count]) => ({ value, count })).sort((a, b) =>
    compareSizes(normalizeSize(a.value), normalizeSize(b.value)),
  );

  // 2. Filters.
  const terms = normalizeForSearch(query.search).split(" ").filter(Boolean);
  const wholeQuery = terms.join(" ");
  const vendors = new Set(query.vendors);
  const scores = terms.length > 0 ? new Map<string, number>() : null;
  const targets = new Map<string, string>();
  const filtered: CatalogListing[] = [];

  for (const listing of scoped) {
    if (vendors.size > 0 && !vendors.has(listing.vendor)) continue;
    if (terms.length > 0 && !terms.every((term) => listing.searchText.includes(term))) continue;

    const matched = matchingVariants(listing, query);
    if (matched.length === 0) continue;

    // Open the exact variant when the query names one: by article number, or by narrowing filters.
    const byArticle = terms.length > 0 ? matched.find((variant) => variant.articleNumber.toLowerCase() === wholeQuery) : undefined;
    const narrowed = matched.length < listing.variants.length ? matched[0] : undefined;
    const target = byArticle ?? narrowed;
    if (target) targets.set(listing.key, target.id);

    scores?.set(listing.key, relevance(listing, terms));
    filtered.push(listing);
  }

  // 3. Sort and paginate. `filtered` is a fresh array, so the shared snapshot is never reordered.
  const sorted = filtered.sort(comparator(query.sort, scores));
  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(query.page, pageCount);
  const items = sorted.slice((page - 1) * pageSize, page * pageSize).map((listing) => ({
    listing,
    targetId: targets.get(listing.key) ?? listing.id,
    targeted: targets.has(listing.key),
  }));

  return {
    items,
    total,
    page,
    pageCount,
    pageSize,
    facets: {
      minPrice: Number.isFinite(minPrice) ? Math.floor(minPrice) : 0,
      maxPrice: Number.isFinite(maxPrice) ? Math.ceil(maxPrice) : 0,
      vendors: Array.from(vendorSet).sort((a, b) => a.localeCompare(b, "uk")),
      sizes,
      selectParams,
      unitParams,
    },
    counts: {
      categoriesCount: countBy(sorted, (listing) => listing.category),
      vendorsCount: countBy(sorted, (listing) => [listing.vendor]),
    },
  };
}
