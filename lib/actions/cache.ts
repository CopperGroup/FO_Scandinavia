"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { cache } from "react";
import { ProductType } from "../types/types";
import { fetchAllProducts, fetchProductAndRelevantParams, fetchProductsLength, fetchPurchaseNotificationsInfo } from "./product.actions";
import { Store } from "@/constants/store";
import { fetchPageDataByName } from "./page.actions";

const paths = {
    categories: "/admin/categories",
    createProduct: "/admin/createProduct",
    products: "/admin/products",
    dashboard: "/admin/dashboard",
    statistics: "/admin/statistics",
    orders: "/admin/Orders",
    payments: "/admin/payments",
    clients: "/admin/clients",
    filter: "/admin/filter",
    pixel: "/admin/pixel"
} as const

const adminPaths = [
    {
        name: 'createProduct',
        values: [paths.categories, paths.products, paths.filter],
        user_cache: {
            catalog: true,
            productPage: false,
            allProductPages: true
        }
    },
    {
        name: 'updateProduct',
        values: [paths.categories, paths.products, paths.dashboard, paths.statistics, paths.filter],
        user_cache: {
            catalog: true,
            productPage: true,
            allProductPages: true
        }
    },
    {
        name: 'deleteProduct',
        values: [paths.categories, paths.products, paths.dashboard, paths.statistics, paths.filter],
        user_cache: {
            catalog: true,
            productPage: false,
            allProductPages: true
        }
    },
    {
        name: 'createOrder',
        values: [paths.categories, paths.dashboard, paths.orders, paths.payments, paths.statistics],
        user_cache: {
            catalog: false,
            productPage: false,
            allProductPages: false
        }
    },
    {
        name: 'updateOrder',
        values: [paths.categories, paths.dashboard, paths.orders, paths.payments, paths.statistics],
        user_cache: {
            catalog: false,
            productPage: false,
            allProductPages: false
        }
    },
    {
        name: "createUser",
        values: [paths.clients, paths.statistics],
        user_cache: {
            catalog: false,
            productPage: false,
            allProductPages: false
        }
    },
    {
        name: 'likeProduct',
        values: [paths.statistics, paths.categories],
        user_cache: {
            catalog: true,
            productPage: false,
            allProductPages: false
        }
    },
    {
        name: "addToCart",
        values: [paths.dashboard, paths.statistics],
        user_cache: {
            catalog: false,
            productPage: false,
            allProductPages: false
        }
    },
    {
        name: "createCategory",
        values: [paths.categories, paths.createProduct, paths.filter],
        user_cache: {
            catalog: true,
            productPage: false,
            allProductPages: true
        }
    },
    {
        name: "updateCategory",
        values: [paths.categories, paths.createProduct, paths.filter, paths.statistics, paths.dashboard, paths.products],
        user_cache: {
            catalog: true,
            productPage: false,
            allProductPages: true
        }
    }, 
    {
        name: "deleteCategory",
        values: [paths.categories, paths.createProduct, paths.filter, paths.statistics, paths.dashboard, paths.products],
        user_cache: {
            catalog: true,
            productPage: false,
            allProductPages: true
        }
    },
    {
        name: "createPixel",
        values: [paths.pixel],
        user_cache: {
            catalog: false,
            productPage: false,
            allProductPages: false
        }
    },
    {
        name: "updatePixel",
        values: [paths.pixel],
        user_cache: {
            catalog: false,
            productPage: false,
            allProductPages: false
        }
    },
    {
        name: "deletePixel",
        values: [paths.pixel],
        user_cache: {
            catalog: false,
            productPage: false,
            allProductPages: false
        }
    }
] as const;

type ConditionalProps<T extends typeof adminPaths[number]["name"]> = 
    Extract<typeof adminPaths[number], { name: T }> extends { user_cache: { productPage: true } }
        ?  string 
        : undefined;

export default async function clearCache<T extends typeof adminPaths[number]["name"]>(
    functionNames: T | T[],
    productId: ConditionalProps<T>
) {
    const functionNamesArray = Array.isArray(functionNames) ? functionNames : [functionNames];

    let shouldClearCatalogCache = false;
    let shouldClearAllProductPagesCache = false;

    functionNamesArray.forEach(functionName => {
        const path = adminPaths.filter(({ name, values }) => name === functionName);

        if (path[0].name.length > 0 && path[0].user_cache?.catalog) {
            shouldClearCatalogCache = true; // Set flag to true if catalog needs clearing
        }

        if (path[0].name.length > 0 && path[0].user_cache?.allProductPages) {
            shouldClearAllProductPagesCache = true;
        }

        path[0]?.values.forEach((value: string) => {
            revalidatePath(value);
        });
    });

    if(shouldClearCatalogCache) {
        revalidateTag("catalog-data");
        revalidatePath("/catalog")
    }

    if(productId) {
        revalidateTag(`${Store.name}-product-${productId}`)
        revalidatePath("/catalog")
    }

    if(shouldClearAllProductPagesCache) {
        revalidateTag(`${Store.name}-product`)
        revalidatePath("/catalog")
    }
}

export const fetchProductPageInfo = cache(
    async (currentProductId: string, key: keyof ProductType, splitChar?: string, index?: number) => {
      return unstable_cache(
        async () => {
          const { product, selectParams } = await fetchProductAndRelevantParams(currentProductId, key, splitChar, index);
          return { product, selectParams };
        },
        [`${Store.name}-product-${currentProductId}`],
        { tags: [`${Store.name}-product-${currentProductId}`, `${Store.name}-product`] }
      )();
    }
);
 
export const fetchPurchaseNotificationsInfoCache = cache(
    unstable_cache(
        async () => {
            const info = await fetchPurchaseNotificationsInfo();

            return info
        },
        ['purchaseNotificationsInfo'],
        { 
          tags: [`${Store.name}-product`],
        }
    )
)

export const fetchPageDataByNameCache = cache(
    async (name: string) => {
      return unstable_cache(
        async () => {
          const data = await fetchPageDataByName({ name }, 'json');
          return data;
        },
        [`${name}-page`],
        { tags: [`${name}-page`] }
      )();
    }
  );

  const BATCH_SIZE = 250;

  export const fetchAllProductsLength = unstable_cache(
    async () => {
        const length = await fetchProductsLength();
        console.log(`Cached product length: ${length}`);
        return length;
    },
    [`${Store.name}-products-length`],
    { tags: [`${Store.name}-product-length`, `${Store.name}-product-all`] }
);

// This caches individual batches of products.
const fetchProductBatchCache = (batchIndex: number) => {
    return cache(
        unstable_cache(
            async (index: number) => {
                // This function will only be called if a batch is not in cache or revalidated.
                // It fetches the full list *if needed* for slicing.
                // In a highly optimized scenario, your backend would provide an API for paginated fetching.
                console.log(`Fetching batch ${index} data to be cached.`);
                const allProducts = await fetchAllProducts();
                const start = index * BATCH_SIZE;
                const end = start + BATCH_SIZE;
                const batch = allProducts.slice(start, end);
                console.log(`Caching batch ${index}: ${batch.length} products`);
                return batch;
            },
            [`${Store.name}-products-batch-${batchIndex}`],
            { tags: [`${Store.name}-product-batch-${batchIndex}`, `${Store.name}-product-all`] }
        )
    );
};

// Main function to get all products. It checks the length first.
// Uses React's `cache` for memoization within the request.
export const fetchAllProductsCache = cache(
    async () => {
        // 1. Get the current total number of products from its cache
        const currentTotalLength = await fetchAllProductsLength();

        let products: any[] = [];
        let numBatches = Math.ceil(currentTotalLength / BATCH_SIZE);
        let shouldRefetchAll = false;

        // Try to gather products from existing batches
        const productPromises: Promise<any[]>[] = [];
        for (let i = 0; i < numBatches; i++) {
            // We use a try-catch for each batch to detect if any batch is missing or corrupted
            // A more robust check might involve comparing a version/hash
            productPromises.push(fetchProductBatchCache(i)(i).catch(e => {
                console.warn(`Error fetching batch ${i}: ${e.message}. Will trigger full refetch.`);
                shouldRefetchAll = true; // Mark to refetch all if any batch fails
                return []; // Return empty for this promise to allow Promise.all to complete
            }));
        }

        const batchedResults = await Promise.all(productPromises);
        const combinedBatches = batchedResults.flat();

        // 2. Determine if a full refetch of all products is necessary
        //    - If `shouldRefetchAll` is true (e.g., a batch was missing/corrupted)
        //    - If the combined length from existing batches doesn't match the current total length
        if (shouldRefetchAll || combinedBatches.length !== currentTotalLength) {
            console.log("Product count mismatch or batch error. Re-fetching and re-caching all products.");
            const allProducts = await fetchAllProducts();
            products = allProducts; // Use the freshly fetched products

            // Re-cache all batches
            const reCachePromises: Promise<any[]>[] = [];
            const newNumBatches = Math.ceil(products.length / BATCH_SIZE);

            // Revalidate the total length cache if the actual length changed
            if (products.length !== currentTotalLength) {
                 // Trigger revalidation for the total length cache
                 // In a real app, you'd call revalidateTag here if you can access it in this context
                 // For now, we'll rely on fetchAllProductsLength to eventually get the new value.
                 // A more direct way would be to call `revalidateTag(`${Store.name}-product-length`)`
                 // from a Server Action or Route Handler when a product is added/removed.
                 console.log("Total product length changed. Ensure `revalidateTag` for length is triggered elsewhere.");
            }

            for (let i = 0; i < newNumBatches; i++) {
                const batchData = products.slice(i * BATCH_SIZE, (i * BATCH_SIZE) + BATCH_SIZE);
                // Directly call the underlying async function of unstable_cache for manual caching
                // This bypasses the memoization of `fetchProductBatchCache` for this specific "force re-cache" scenario
                // This is a bit advanced and usually managed by `revalidateTag`
                // A simpler, but less direct, way is just to let the next calls to `fetchProductBatchCache` re-fill the cache
                // if they were invalidated by `revalidateTag(`${Store.name}-product-all`)`.
                // For demonstration, let's trigger the batched cache function directly.
                reCachePromises.push(
                    unstable_cache(
                        async (idx: number) => {
                            console.log(`Force re-caching batch ${idx}`);
                            return batchData; // Use the slice from the fresh `allProducts`
                        },
                        [`${Store.name}-products-batch-${i}`],
                        { tags: [`${Store.name}-product-batch-${i}`, `${Store.name}-product-all`] }
                    )(i) // Execute the cached function with the index
                );
            }
            await Promise.all(reCachePromises); // Wait for all batches to be re-cached
        } else {
            // If lengths match and no errors, use the combined batches
            products = combinedBatches;
            console.log("Using products from existing cached batches.");
        }

        return JSON.stringify(products);
    }
);
