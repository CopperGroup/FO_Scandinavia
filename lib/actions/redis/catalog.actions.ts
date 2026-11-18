"use server";

import { getCatalogSnapshot, invalidateCatalog, rebuildCatalog } from "@/lib/catalog/server/service";
import { getSession } from "@/lib/getServerSession";
import { fetchUserRole } from "../user.actions";

/**
 * Server-action entry points to the catalog service (lib/catalog).
 * Kept at this path because product, category and filter actions import it.
 */

/** Marks the storefront catalog stale; the next visitor triggers a rebuild. */
export async function clearCatalogCache(): Promise<void> {
  await invalidateCatalog();
}

/** Rebuilds the catalog right away and reports what it contains. Admins only. */
export async function rebuildCatalogNow() {
  const email = await getSession();
  const role = email ? await fetchUserRole({ email }) : null;
  if (role !== "Admin" && role !== "Owner") {
    throw new Error("Only administrators can rebuild the catalog");
  }

  await invalidateCatalog();
  const { snapshot } = await rebuildCatalog();
  return { builtAt: snapshot.builtAt, stats: snapshot.stats };
}

/** Listings, categories and filter settings in the shape older callers expect. */
export async function fetchCatalogWithCache() {
  const snapshot = await getCatalogSnapshot();
  return {
    data: snapshot.listings,
    categories: snapshot.categories,
    filterSettingsData: { filterSettings: snapshot.filterSettings, delay: snapshot.filterDelay },
  };
}

/** Public catalog feed: one entry per listing, without any customer data. */
export async function getCombinedProductData() {
  const snapshot = await getCatalogSnapshot();
  return snapshot.listings.map((listing) => ({
    _id: listing.id,
    id: listing.productId,
    name: listing.title,
    images: listing.image ? [listing.image] : [],
    price: listing.price,
    priceToShow: listing.priceToShow,
    vendor: listing.vendor,
    category: listing.category,
    variants: listing.variants.map((variant) => ({
      _id: variant.id,
      articleNumber: variant.articleNumber,
      label: variant.label,
    })),
  }));
}
