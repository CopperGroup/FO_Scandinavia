import { BRANDS_KEY, NO_BRAND, brandKey, brandTwinKey, cleanBrandList } from "@/lib/brands";
import { getCatalogSnapshot } from "@/lib/catalog/server/service";
import { vendorKey, vendorLabel } from "@/lib/catalog/vendors";
import { getSetting } from "@/lib/content/server";
import Product from "@/lib/models/product.model";
import { connectToDB } from "@/lib/mongoose";

/** A brand as the admin lists it. */
export type BrandRow = {
  name: string;
  /** Products that carry exactly this spelling. */
  products: number;
  /** Of them, the ones that can be bought now. */
  inStock: number;
  /** Other spellings of the same name in the catalog ("ELLOS" next to "Ellos"), the most used first: worth joining. */
  twins: string[];
  /** The spelling the shop shows and filters this brand by, or null when nothing of it is in the shop now. */
  storeName: string | null;
};

const collator = new Intl.Collator("uk", { sensitivity: "base", numeric: true });

/** Names the owner added by hand (they may have no products yet). */
export async function savedBrandNames(): Promise<string[]> {
  return cleanBrandList((await getSetting(BRANDS_KEY))?.values);
}

/** Every brand: the ones products carry and the ones added by hand, by name. */
export async function listBrands(): Promise<BrandRow[]> {
  await connectToDB();
  const [rows, saved, snapshot] = await Promise.all([
    Product.aggregate<{ _id: string | null; products: number; inStock: number }>([
      { $group: { _id: "$vendor", products: { $sum: 1 }, inStock: { $sum: { $cond: [{ $and: [{ $eq: ["$isAvailable", true] }, { $gt: [{ $ifNull: ["$quantity", 0] }, 0] }] }, 1, 0] } } } },
    ]),
    savedBrandNames(),
    // The shop shows spellings that differ only in case or punctuation as one brand; its name for each is in the catalog.
    getCatalogSnapshot().catch(() => null),
  ]);

  const brands = new Map<string, BrandRow>();
  for (const row of rows) {
    const name = String(row._id ?? "").trim();
    if (!name || name === NO_BRAND) continue;
    const existing = brands.get(name);
    if (existing) {
      existing.products += row.products;
      existing.inStock += row.inStock;
    } else brands.set(name, { name, products: row.products, inStock: row.inStock, twins: [], storeName: null });
  }
  for (const name of saved) if (!Array.from(brands.keys()).some((existing) => brandKey(existing) === brandKey(name))) brands.set(name, { name, products: 0, inStock: 0, twins: [], storeName: null });

  const inStore = new Map<string, string>();
  for (const listing of snapshot?.listings ?? []) if (listing.vendor) inStore.set(vendorKey(listing.vendor), listing.vendor);

  // One brand under several names: spellings ("ELLOS", "Ellos") and the names the shop already shows as one ("Hennes&Mauritz" is "H&M").
  const twinKey = (name: string) => brandTwinKey(vendorLabel(name));
  const byKey = new Map<string, BrandRow[]>();
  brands.forEach((brand) => byKey.set(twinKey(brand.name), [...(byKey.get(twinKey(brand.name)) ?? []), brand]));
  brands.forEach((brand) => {
    brand.twins = (byKey.get(twinKey(brand.name)) ?? [])
      .filter((other) => other.name !== brand.name)
      .sort((a, b) => b.products - a.products)
      .map((other) => other.name);
    brand.storeName = brand.inStock > 0 ? (inStore.get(vendorKey(brand.name)) ?? null) : null;
  });

  return Array.from(brands.values()).sort((a, b) => collator.compare(a.name, b.name));
}

/** Brand names for the list in the product form. */
export async function loadBrandNames(): Promise<string[]> {
  return (await listBrands()).map((brand) => brand.name);
}
