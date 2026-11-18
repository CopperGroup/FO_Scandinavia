"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { cache } from "react";
import { fetchProductForPage } from "./product.actions";
import { getVariantsForProduct, invalidateCatalog } from "../catalog/server/service";
import { Store } from "@/constants/store";

const ADMIN = {
    categories: "/admin/categories",
    createProduct: "/admin/createProduct",
    products: "/admin/products",
    dashboard: "/admin/dashboard",
    orders: "/admin/Orders",
    payments: "/admin/payments",
    clients: "/admin/clients",
    filter: "/admin/filter",
    pixel: "/admin/pixel",
} as const

type Effect = {
    /** Admin lists to refresh for the person who made the change. */
    admin: readonly string[]
    /** The storefront catalog (listing, navigation, filters) is rebuilt on its next read. */
    catalog: boolean
    /** Cached product pages to drop: the one that changed, every one, or none. */
    productPages: "one" | "all" | "none"
}

/**
 * What each kind of change makes stale. Keep this narrow: an entry that
 * invalidates more than it has to makes every shopper wait for a rebuild.
 */
const EFFECTS = {
    createProduct: { admin: [ADMIN.products, ADMIN.categories, ADMIN.filter], catalog: true, productPages: "none" },
    // One product edited: its own page and the catalog. Pass the product id.
    updateProduct: { admin: [ADMIN.products, ADMIN.categories, ADMIN.filter], catalog: true, productPages: "one" },
    // A bulk edit (prices, categories, import): one call for the whole batch.
    updateProducts: { admin: [ADMIN.products, ADMIN.categories, ADMIN.filter], catalog: true, productPages: "all" },
    deleteProduct: { admin: [ADMIN.products, ADMIN.categories, ADMIN.filter, ADMIN.dashboard], catalog: true, productPages: "all" },
    createOrder: { admin: [ADMIN.dashboard, ADMIN.orders, ADMIN.payments], catalog: false, productPages: "none" },
    updateOrder: { admin: [ADMIN.dashboard, ADMIN.orders, ADMIN.payments], catalog: false, productPages: "none" },
    createUser: { admin: [ADMIN.clients], catalog: false, productPages: "none" },
    // A like or an add-to-cart changes nothing a visitor sees.
    likeProduct: { admin: [], catalog: false, productPages: "none" },
    addToCart: { admin: [], catalog: false, productPages: "none" },
    // Category names appear in the breadcrumbs of product pages.
    createCategory: { admin: [ADMIN.categories, ADMIN.createProduct, ADMIN.filter], catalog: true, productPages: "none" },
    updateCategory: { admin: [ADMIN.categories, ADMIN.createProduct, ADMIN.filter, ADMIN.products], catalog: true, productPages: "all" },
    deleteCategory: { admin: [ADMIN.categories, ADMIN.createProduct, ADMIN.filter, ADMIN.products], catalog: true, productPages: "all" },
    createPixel: { admin: [ADMIN.pixel], catalog: false, productPages: "none" },
    updatePixel: { admin: [ADMIN.pixel], catalog: false, productPages: "none" },
    deletePixel: { admin: [ADMIN.pixel], catalog: false, productPages: "none" },
} as const satisfies Record<string, Effect>

export type CacheEvent = keyof typeof EFFECTS

/**
 * Tells the caches what just changed. Call it ONCE per user action, after the
 * writes, with every kind of change the action made.
 *
 * `productId` is the product whose page changed ("updateProduct"); a list of
 * ids is accepted for a small batch. Other events ignore it.
 */
export default async function clearCache(events: CacheEvent | CacheEvent[], productId?: string | string[] | null) {
    const list = Array.isArray(events) ? events : [events]
    const effects: Effect[] = list.map((name) => EFFECTS[name]).filter(Boolean)

    const adminPaths = new Set(effects.flatMap((effect) => effect.admin))
    adminPaths.forEach((path) => revalidatePath(path))

    const ids = (Array.isArray(productId) ? productId : productId ? [productId] : []).map(String)
    const allPages = effects.some((effect) => effect.productPages === "all") || (effects.some((effect) => effect.productPages === "one") && ids.length === 0)

    if (allPages) revalidateTag(PRODUCT_TAG)
    else if (effects.some((effect) => effect.productPages === "one")) ids.forEach((id) => revalidateTag(productTag(id)))

    if (effects.some((effect) => effect.catalog)) await invalidateCatalog()
}

const PRODUCT_TAG = `${Store.name}-product`
const productTag = (id: string) => `${Store.name}-product-${id}`

/**
 * Everything the product page renders. The product document is cached per
 * product; the size/colour choices are read from the live catalog snapshot so
 * they always agree with what the catalog shows.
 */
export const fetchProductPageInfo = cache(
    async (currentProductId: string) => {
      const product = await unstable_cache(
        async () => fetchProductForPage(currentProductId),
        [`${Store.name}-product-page-${currentProductId}`],
        { tags: [productTag(currentProductId), PRODUCT_TAG] }
      )();

      const variants = await getVariantsForProduct(currentProductId);

      return { product, variants };
    }
);

