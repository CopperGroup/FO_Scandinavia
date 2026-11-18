import { BRAND_PAGE_MIN, NO_BRAND } from "@/lib/brands";
import { buildNavigation, type DepartmentKey, type MenuConfig, type NavDepartment, type NavigationTree } from "@/lib/catalog/departments";
import { getCatalogRuntime } from "@/lib/catalog/server/service";
import type { CatalogListing } from "@/lib/catalog/types";
import { getSetting } from "@/lib/content/server";
import { MENU_KEY, cleanMenu } from "@/lib/menu";

export type StoreNavigation = NavigationTree & {
  /** Listings currently sold below their regular price. */
  saleCount: number;
  totalCount: number;
  /** categoryId → departments it belongs to, first one is the primary. */
  departmentsByCategory: Record<string, DepartmentKey[]>;
};

type Memo = { generation: string; navigation: StoreNavigation };
const globalForNavigation = globalThis as unknown as { __storeNavigation?: Memo };

/** The menu the owner saved in the admin ("Меню"), or null while the automatic one is in use. */
export async function getSavedMenu(): Promise<{ menu: MenuConfig; stamp: string; updatedAt: string | null; updatedBy: string } | null> {
  const saved = await getSetting(MENU_KEY);
  if (!saved) return null;
  const { menu } = cleanMenu(saved.values);
  // A record that holds no department (damaged) is treated as "not saved": the shop must never be left without a menu.
  if (menu.departments.length === 0) return null;
  return { menu, stamp: saved.updatedAt ?? "saved", updatedAt: saved.updatedAt, updatedBy: saved.updatedBy };
}

/** Department menu for the current catalog snapshot; rebuilt only when the catalog or the saved menu changes. */
export async function getNavigation(): Promise<StoreNavigation> {
  const [runtime, saved] = await Promise.all([getCatalogRuntime(), getSavedMenu()]);
  const generation = `${runtime.generation}|${saved?.stamp ?? "auto"}`;
  const memo = globalForNavigation.__storeNavigation;
  if (memo?.generation === generation) return memo.navigation;

  const { listings, categories } = runtime.snapshot;
  const tree = buildNavigation(categories, listings, saved?.menu);

  const departmentsByCategory: Record<string, DepartmentKey[]> = {};
  for (const department of tree.departments) {
    for (const id of department.categoryIds) (departmentsByCategory[id] ??= []).push(department.key);
  }

  const navigation: StoreNavigation = {
    ...tree,
    saleCount: listings.filter((listing) => listing.discountPercent > 0).length,
    totalCount: listings.length,
    departmentsByCategory,
  };
  globalForNavigation.__storeNavigation = { generation, navigation };
  return navigation;
}

export function findDepartment(navigation: StoreNavigation, key: string | undefined | null): NavDepartment | undefined {
  return key ? navigation.departments.find((department) => department.key === key) : undefined;
}

export const departmentHref = (key: DepartmentKey) => `/catalog?department=${key}`;
export const categoryHref = (id: string, department?: DepartmentKey) =>
  department ? `/catalog?department=${department}&categories=${id}` : `/catalog?categories=${id}`;

/* -------------------------------------------------------------------------- */
/*                               Card projection                              */
/* -------------------------------------------------------------------------- */

/** Everything a product card needs, small enough to pass to client components. */
export type CardData = {
  key: string;
  id: string;
  productId: string;
  title: string;
  name: string;
  vendor: string;
  image: string | null;
  hoverImage: string | null;
  url: string;
  price: number;
  priceToShow: number;
  priceMin: number;
  priceMax: number;
  discountPercent: number;
  sizes: string[];
  variantCount: number;
  axisLabel: string | null;
  colorCount: number;
  isNew: boolean;
  /** The card opens a product without a size picked yet, so the page asks for one. */
  mustChoose: boolean;
};

const NEW_WINDOW_MS = 21 * 24 * 60 * 60 * 1000;

export function toCard(listing: CatalogListing, target?: { id: string; targeted: boolean }, now = Date.now()): CardData {
  return {
    key: listing.key,
    id: target?.id ?? listing.id,
    productId: listing.productId,
    title: listing.title,
    name: listing.name,
    vendor: listing.vendor,
    image: listing.image,
    hoverImage: listing.hoverImage ?? null,
    url: listing.url,
    price: listing.price,
    priceToShow: listing.priceToShow,
    priceMin: listing.priceMin,
    priceMax: listing.priceMax,
    discountPercent: listing.discountPercent,
    sizes: listing.variants.map((variant) => variant.label ?? "").filter(Boolean),
    variantCount: listing.variants.length,
    axisLabel: listing.axisLabel,
    colorCount: listing.colorCount,
    isNew: listing.createdAt > 0 && now - listing.createdAt < NEW_WINDOW_MS,
    mustChoose: listing.variants.length > 1 && !target?.targeted,
  };
}

/* -------------------------------------------------------------------------- */
/*                                  Home page                                 */
/* -------------------------------------------------------------------------- */

export type HomeData = {
  newest: CardData[];
  onSale: CardData[];
  popular: CardData[];
  brands: { name: string; count: number }[];
};

function take(listings: CatalogListing[], limit: number, used: Set<string>): CardData[] {
  const picked: CardData[] = [];
  const vendors = new Map<string, number>();
  for (const listing of listings) {
    if (picked.length === limit) break;
    if (!listing.image || used.has(listing.key)) continue;
    // A rail should not be ten cards of one brand.
    const perVendor = vendors.get(listing.vendor) ?? 0;
    if (perVendor >= 3) continue;
    vendors.set(listing.vendor, perVendor + 1);
    used.add(listing.key);
    picked.push(toCard(listing));
  }
  return picked;
}

let homeMemo: { generation: string; limit: number; data: HomeData } | null = null;

/** Rails of the home page. Built once per catalog snapshot, not on every visit. */
export async function getHomeData(limit = 10): Promise<HomeData> {
  const runtime = await getCatalogRuntime();
  if (homeMemo && homeMemo.generation === runtime.generation && homeMemo.limit === limit) return homeMemo.data;
  const data = buildHomeData(runtime.snapshot.listings, limit);
  homeMemo = { generation: runtime.generation, limit, data };
  return data;
}

function buildHomeData(listings: CatalogListing[], limit: number): HomeData {
  const used = new Set<string>();

  const popular = take(
    listings.filter((listing) => listing.salesCount > 0).sort((a, b) => b.salesCount - a.salesCount || b.createdAt - a.createdAt),
    limit,
    used,
  );
  const onSale = take(
    listings.filter((listing) => listing.discountPercent > 0).sort((a, b) => b.discountPercent - a.discountPercent || b.createdAt - a.createdAt),
    limit,
    used,
  );
  const newest = take([...listings].sort((a, b) => b.createdAt - a.createdAt), limit, used);

  // Brand names arrive from feeds in mixed case ("ELLOS", "Ellos"): count them as one.
  const brandCounts = new Map<string, { name: string; count: number }>();
  for (const listing of listings) {
    const name = listing.vendor.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const entry = brandCounts.get(key);
    if (entry) entry.count += 1;
    else brandCounts.set(key, { name, count: 1 });
  }
  const brands = Array.from(brandCounts.values()).sort((a, b) => b.count - a.count).slice(0, 14);

  return { newest, onSale, popular, brands };
}

/* -------------------------------------------------------------------------- */
/*                                 Brand pages                                */
/* -------------------------------------------------------------------------- */

export type BrandPage = { name: string; count: number };

let brandMemo: { generation: string; brands: BrandPage[] } | null = null;

/**
 * Brands with enough cards in stock to have a page of their own in search
 * engines ("/catalog?vendor=Ellos"). The name is the spelling the catalog
 * shows and filters by.
 */
export async function getBrandPages(): Promise<BrandPage[]> {
  const runtime = await getCatalogRuntime();
  if (brandMemo?.generation === runtime.generation) return brandMemo.brands;

  const counts = new Map<string, number>();
  for (const listing of runtime.snapshot.listings) {
    const name = listing.vendor.trim();
    if (name && name !== NO_BRAND) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const brands = Array.from(counts, ([name, count]) => ({ name, count }))
    .filter((brand) => brand.count >= BRAND_PAGE_MIN)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "uk"));
  brandMemo = { generation: runtime.generation, brands };
  return brands;
}

/* -------------------------------------------------------------------------- */
/*                                Product page                                */
/* -------------------------------------------------------------------------- */

/**
 * Other items from the product's categories: the same brand first, then the
 * best sellers. Other sizes and colours of the product itself are left out,
 * the page already offers them in its selectors.
 */
export async function getRelatedCards(productId: string, categoryIds: string[], limit = 10): Promise<CardData[]> {
  const { snapshot, variants } = await getCatalogRuntime();
  const categories = new Set(categoryIds);
  if (categories.size === 0) return [];

  const own = snapshot.listings.find((listing) => listing.variants.some((variant) => variant.id === productId));
  const ownGroup = variants.groupByProductId.get(productId);
  const ownModel = ownGroup?.modelKey ?? null;
  const modelOf = new Map(snapshot.groups.map((group) => [group.key, group.modelKey]));

  return snapshot.listings
    .filter(
      (listing) =>
        listing.image &&
        listing.key !== own?.key &&
        listing.key !== ownGroup?.key &&
        !(ownModel && modelOf.get(listing.key) === ownModel) &&
        listing.category.some((id) => categories.has(id)),
    )
    .sort(
      (a, b) =>
        Number(b.vendor === own?.vendor) - Number(a.vendor === own?.vendor) || b.salesCount - a.salesCount || b.createdAt - a.createdAt,
    )
    .slice(0, limit)
    .map((listing) => toCard(listing));
}

/** The catalog card a product belongs to (null when nothing of it is in stock). */
export async function getProductCard(productId: string): Promise<CardData | null> {
  const { snapshot } = await getCatalogRuntime();
  const listing = snapshot.listings.find((entry) => entry.variants.some((variant) => variant.id === productId));
  return listing ? toCard(listing) : null;
}
