import { buildListing } from "./listing";
import type {
  CatalogCategory,
  CatalogListing,
  CatalogSnapshot,
  CatalogStats,
  FilterSettings,
  SourceProduct,
} from "./types";
import { groupProducts } from "./variants";
import { buildVendorMap } from "./vendors";

/** Bump when the snapshot shape changes so cached copies are rebuilt, not misread. */
export const SNAPSHOT_VERSION = 5;

export type SnapshotInput = {
  products: SourceProduct[];
  categories: CatalogCategory[];
  filterSettings: FilterSettings;
  filterDelay: number;
  now?: Date;
};

/**
 * Turns the raw product list into everything the storefront reads: catalog
 * listings (one per variant group with stock) and the variant groups
 * themselves (all products, for the size/colour selectors on product pages).
 */
export function buildCatalogSnapshot(input: SnapshotInput): CatalogSnapshot {
  // One spelling per brand, so "H&M" and "Hennes&Mauritz" are a single filter option.
  const vendors = buildVendorMap(input.products.map((product) => product.vendor));
  const products = input.products.map((product) => {
    const vendor = product.vendor ? vendors.get(product.vendor.trim()) : undefined;
    return vendor && vendor !== product.vendor ? { ...product, vendor } : product;
  });

  const { groups, identities } = groupProducts(products);

  const sellableColorsByModel = new Map<string, number>();
  for (const group of groups) {
    if (!group.modelKey || !group.members.some((member) => member.purchasable)) continue;
    sellableColorsByModel.set(group.modelKey, (sellableColorsByModel.get(group.modelKey) ?? 0) + 1);
  }

  const listings: CatalogListing[] = [];
  for (const group of groups) {
    const colorCount = group.modelKey ? sellableColorsByModel.get(group.modelKey) ?? 1 : 1;
    const listing = buildListing(group, identities.get(group.key) ?? [], colorCount);
    if (listing) listings.push(listing);
  }

  const stats: CatalogStats = {
    products: input.products.length,
    purchasableProducts: input.products.filter((product) => product.isAvailable && (product.quantity ?? 0) > 0).length,
    groups: groups.length,
    listings: listings.length,
    multiVariantListings: listings.filter((listing) => listing.variants.length > 1).length,
    largestGroup: groups.reduce((max, group) => Math.max(max, group.members.length), 0),
    productsWithoutParams: input.products.filter((product) => !product.params?.length).length,
    productsWithoutImages: input.products.filter((product) => !product.images?.length).length,
    productsWithoutCategory: input.products.filter((product) => !product.category?.length).length,
    duplicateProducts: groups.reduce((sum, group) => sum + group.members.filter((member) => member.duplicateOf).length, 0),
    fallbackAxisGroups: groups.filter((group) => group.axes[0]?.key === "variant").length,
  };

  return {
    version: SNAPSHOT_VERSION,
    builtAt: (input.now ?? new Date()).toISOString(),
    listings,
    groups,
    categories: input.categories,
    filterSettings: input.filterSettings,
    filterDelay: input.filterDelay,
    stats,
  };
}
