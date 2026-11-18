import type { MetadataRoute } from "next";
import { Store } from "@/constants/store";
import { getCatalogSnapshot } from "@/lib/catalog/server/service";
import { brandHref } from "@/lib/brands";
import { catalogCanonical } from "@/lib/seo";
import { getBrandPages, getNavigation } from "@/lib/storefront/navigation";

// Built per request from the live catalog instead of at build time.
export const dynamic = "force-dynamic";

const INFO_PAGES = ["/info/delivery-payment", "/info/warranty-services", "/info/contacts", "/info/public-offer", "/info/conf-policy"];

/**
 * The pages a search engine should know: the home page, the info pages, every
 * department and category under the address it is indexed by (the canonical
 * one), the brands with a page of their own, and every product that can be bought. Each size of a model is its own
 * page with its own address, so each is listed: the list does not change when
 * one size sells out and another becomes the first in stock.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // This version of Next writes the address into the XML as it is, so "&" is escaped here: a bare "&" makes the file invalid.
  const entry = (path: string) => ({ url: `${Store.domain}${path}`.replace(/&/g, "&amp;") });
  const entries: MetadataRoute.Sitemap = [entry("/"), ...INFO_PAGES.map(entry)];

  try {
    const [navigation, { listings }, brands] = await Promise.all([getNavigation(), getCatalogSnapshot(), getBrandPages()]);

    const listed = new Set<string>();
    for (const department of navigation.departments) {
      entries.push(entry(catalogCanonical({ departmentKey: department.key, categoryIds: [] })));
      for (const group of department.groups) {
        for (const category of group.categories) listed.add(category.id);
      }
    }
    for (const category of navigation.other) listed.add(category.id);
    listed.forEach((id) => entries.push(entry(catalogCanonical({ departmentKey: navigation.departmentsByCategory[id]?.[0], categoryIds: [id] }))));

    for (const brand of brands) entries.push(entry(brandHref(brand.name)));

    const products = new Set<string>();
    for (const listing of listings) {
      if (listing.variants.length === 0) products.add(listing.id);
      for (const variant of listing.variants) products.add(variant.id);
    }
    products.forEach((id) => entries.push(entry(`/catalog/${id}`)));
  } catch (error) {
    console.error("Could not build the catalog part of the sitemap:", error);
  }

  return entries;
}
