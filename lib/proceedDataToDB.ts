import { createUrlProduct, deleteProduct, fetchUrlProducts, updateUrlProduct } from "./actions/product.actions";
import { clearCatalogCache } from "./actions/redis/catalog.actions";
import { createUrlCategories } from "./actions/categories.actions";
import { CategoryType, FetchedCategory, ProductType } from "./types/types";

interface Product {
    _id: string,
    id: string | null,
    name: string | null,
    isAvailable: boolean,
    quantity: number,
    url: string | null,
    priceToShow: number,
    price: number,
    images: (string | null)[],
    vendor: string | null,
    description: string | null,
    articleNumber: string | null,
    params: {
        name: string | null,
        value: string | null
    }[],
    isFetched: boolean,
    categoryId: string
}

// Helper function to process items in batches with a delay
async function processInBatches<T>(
    items: T[],
    asyncOperation: (item: T) => Promise<any>,
    batchSize: number = 10,
    delayMs: number = 15000
) {
    let operationCount = 0;
    for (const item of items) {
        if (operationCount > 0 && operationCount % batchSize === 0) {
            console.log(`Processed ${operationCount} operations, waiting for ${delayMs / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        await asyncOperation(item);
        operationCount++;
    }
}

export async function proceedDataToDB(data: Product[], selectedRowsIds: (string | null)[], categories: FetchedCategory[], mergeProducts: boolean) {
    try {
        const stringifiedUrlProducts = await fetchUrlProducts("json");
        let urlProducts: Product[] = JSON.parse(stringifiedUrlProducts as string);

        const leftOverProducts = urlProducts.filter(
            urlProduct => !data.some(product => product.articleNumber === urlProduct.articleNumber)
        );

        const processedIds = new Set<string>();
        const newProducts = [];
        const productsToUpdate = [];

        const result = await createUrlCategories({ categories }, "json");
        const createdCategories: CategoryType[] = JSON.parse(result);

        for (const product of data) {
            const category_id = createdCategories.find(cat => cat.id === product.categoryId)?._id || "No-category";

            if (product.id && selectedRowsIds.includes(product.id) && !processedIds.has(product.id)) {
                const existingProductIndex = urlProducts.findIndex(urlProduct => urlProduct.articleNumber === product.articleNumber);

                if (existingProductIndex !== -1) {
                    productsToUpdate.push({
                        ...product,
                        _id: urlProducts[existingProductIndex]._id,
                        category: [category_id],
                    });
                } else {
                    newProducts.push({
                        ...product,
                        category: [category_id],
                    });
                }
                processedIds.add(product.id);
            }
        }

        // Perform bulk update with batching and delay
        if (productsToUpdate.length > 0) {
            console.log(`Starting batch update for ${productsToUpdate.length} products...`);
            await processInBatches(productsToUpdate, async (productToUpdate) => {
                await updateUrlProduct(productToUpdate);
            });
            console.log("Batch update finished.");
        }

        // Perform bulk insert for new products with batching and delay
        if (newProducts.length > 0) {
            console.log(`Starting batch create for ${newProducts.length} new products...`);
            await processInBatches(newProducts, async (newProduct) => {
                await createUrlProduct(newProduct);
            });
            console.log("Batch create finished.");
        }

        // Delete left-over products with batching and delay
        if (mergeProducts && leftOverProducts.length > 0) {
            console.log(`Starting batch delete for ${leftOverProducts.length} leftover products...`);
            await processInBatches(leftOverProducts, async (leftOverProduct) => {
                //IMPORTANT! Not clearing catalog cache, because, it will be cleared later, line 85 (in original)
                await deleteProduct({ productId: leftOverProduct.id as string }, "keep-catalog-cache");
            });
            console.log("Batch delete finished.");
        }

        await clearCatalogCache();

        return null;
    } catch (error: any) {
        throw new Error(`Error proceeding products to DB: ${error.message}`);
    }
}