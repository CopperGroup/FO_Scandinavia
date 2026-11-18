"use server";

import { parseCatalogQuery, runCatalogQuery } from "@/lib/catalog/query";
import { getCatalogRuntime } from "@/lib/catalog/server/service";
import { normalizeForSearch } from "@/lib/catalog/text";
import { getNavigation } from "@/lib/storefront/navigation";

export type SearchSuggestions = {
  query: string;
  total: number;
  products: {
    id: string;
    title: string;
    vendor: string;
    image: string | null;
    price: number;
    priceToShow: number;
  }[];
  categories: { id: string; name: string; count: number }[];
};

const MAX_QUERY_LENGTH = 80;

/** Instant results for the header search box. */
export async function suggestCatalog(input: string): Promise<SearchSuggestions> {
  const query = String(input ?? "").trim().slice(0, MAX_QUERY_LENGTH);
  if (query.length < 2) return { query, total: 0, products: [], categories: [] };

  const [{ snapshot }, navigation] = await Promise.all([getCatalogRuntime(), getNavigation()]);
  const result = runCatalogQuery(snapshot, parseCatalogQuery({ search: query }), 6);

  const terms = normalizeForSearch(query).split(" ").filter(Boolean);
  const seen = new Set<string>();
  const categories: SearchSuggestions["categories"] = [];
  const pool = [...navigation.departments.flatMap((department) => department.groups.flatMap((group) => group.categories)), ...navigation.other];
  for (const category of pool) {
    if (seen.has(category.id)) continue;
    seen.add(category.id);
    const name = normalizeForSearch(category.name);
    if (terms.every((term) => name.includes(term))) categories.push({ id: category.id, name: category.name, count: category.count });
  }

  return {
    query,
    total: result.total,
    products: result.items.map(({ listing, targetId }) => ({
      id: targetId,
      title: listing.title,
      vendor: listing.vendor,
      image: listing.image,
      price: listing.price,
      priceToShow: listing.priceToShow,
    })),
    categories: categories.sort((a, b) => b.count - a.count).slice(0, 4),
  };
}
