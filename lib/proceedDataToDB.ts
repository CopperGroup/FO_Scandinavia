import { createUrlProduct, deleteProduct, fetchUrlProducts, updateUrlProduct } from "./actions/product.actions";
import { clearCatalogCache } from "./actions/redis/catalog.actions";
import { fetchAllCategories, findCategoryByExternalId, persistCategory } from "./actions/categories.actions";
import { CategoryType, FetchedCategory, ProductType } from "./types/types";
import mongoose from "mongoose";

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

interface UrlProduct {
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
  category: string[]
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
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        // console.log(item)
        await asyncOperation(item);
        operationCount++;
    }
}

async function createUrlCategories(
    { categories }: { categories: FetchedCategory[] },
  ): Promise<string> {
    try {
      const sorted = [...categories].sort((a, b) => {
        if (a.parentCategoryId && !b.parentCategoryId) return 1;
        if (!a.parentCategoryId && b.parentCategoryId) return -1;
        return 0;
      });
  
      const idMap = new Map<string, mongoose.Types.ObjectId>();
  
      for (const cat of sorted) {
        const result = await findCategoryByExternalId(cat.id);

        let doc = await JSON.parse(result)
        if (!doc) {
          const parentDbId = cat.parentCategoryId
            ? idMap.get(cat.parentCategoryId)
            : undefined;
          const newResult = await persistCategory(cat, parentDbId);

          doc = JSON.parse(newResult)
        }
  
        idMap.set(cat.id, doc._id);
      }
  
      const all = await fetchAllCategories("json");
      return all
    } catch (err: any) {
      throw new Error(`Error creating categories – ${err.message}`);
    }
  }
  
  // ✅ Main function
  export async function proceedDataToDB(
    data: Product[],
    selectedRowsIds: (string | null)[],
    categories: FetchedCategory[],
    mergeProducts: boolean,
    lockCategories: boolean, 
  ) {
    try {
      const stringifiedUrlProducts = await fetchUrlProducts("json");
      let urlProducts: UrlProduct[] = JSON.parse(stringifiedUrlProducts as string);
  
      const leftOverProducts = urlProducts.filter(
        urlProduct =>
          !data.some(product => product.articleNumber === urlProduct.articleNumber)
      );
  
      const processedIds = new Set<string>();
      const newProducts = [];
      const productsToUpdate = [];
  
      let result ="[]"
      if(!lockCategories) {
        result = await createUrlCategories({ categories });
      }
      const createdCategories: CategoryType[] = JSON.parse(result);
  
      for (const product of data) {
        const category_id =
          createdCategories.find(cat => cat.id === product.categoryId)?._id;
  
        if (
          product.id &&
          selectedRowsIds.includes(product.id) &&
          !processedIds.has(product.id)
        ) {
          const existingProductIndex = urlProducts.findIndex(
            urlProduct =>
              urlProduct.articleNumber === product.articleNumber
          );
  
          if (existingProductIndex !== -1) {
            productsToUpdate.push({
              ...product,
              _id: urlProducts[existingProductIndex]._id,
              category: lockCategories ? urlProducts.find(urlProduct => urlProduct.articleNumber === product.articleNumber)!.category :[category_id],
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
  
      if (productsToUpdate.length > 0) {
        await processInBatches(productsToUpdate, async (productToUpdate) => {
          await updateUrlProduct(productToUpdate);
        });
      }
  
      if (newProducts.length > 0) {
        await processInBatches(newProducts, async (newProduct) => {
          await createUrlProduct(newProduct);
        });
      }
  
      if (mergeProducts && leftOverProducts.length > 0) {
        await processInBatches(leftOverProducts, async (leftOverProduct) => {
          await deleteProduct(
            { productId: leftOverProduct.id as string },
            "keep-catalog-cache"
          );
        });
      }
  
      await clearCatalogCache();
      return null;
    } catch (error: any) {
      throw new Error(`Error proceeding products to DB: ${error.message}`);
    }
  }