"use server";

import { redis } from "@/lib/redis";
import { fetchAllProducts } from "../product.actions";
import { getCategoriesNamesIdsTotalProducts } from "../categories.actions";
import { getFilterSettingsAndDelay } from "../filter.actions";
import { groupProducts } from "@/lib/utils";
import { revalidateTag, unstable_cache } from "next/cache";

// Constants
const CATALOG_TAG = "catalog-data";

// --- New and Modified Cached Functions ---

// New: Caches individual product data chunks retrieved from Redis.
// Each chunk will be a separate, small entry in the unstable_cache.
const fetchIndividualCatalogChunkCached = unstable_cache(
  async (index: number) => {
    // Log for debugging: indicates which chunk is being fetched and if it's from cache.
    console.log(`Attempting to fetch product data chunk ${index} from Redis (and cache)`);
    const chunk = await redis.get(`catalog_chunk_${index}`);
    if (!chunk) {
        // If a specific chunk is missing from Redis, it indicates an inconsistency.
        // In a production app, you might want a more sophisticated fallback,
        // e.g., re-triggering a full catalog rebuild if a critical chunk is missing.
        throw new Error(`Missing catalog_chunk_${index} in Redis.`);
    }
    // Ensure the chunk is returned as a string.
    return String(chunk);
  },
  // Unique key for this unstable_cache function, distinguishing individual chunks.
  // The 'index' argument ensures each chunk gets a unique cache entry.
  ['catalog_chunk_data_individual'],
  // Use the same tag for all catalog-related data, allowing unified revalidation.
  { tags: [CATALOG_TAG], revalidate: false }
);

// New: Caches the total count of product data chunks from Redis.
// This is a small piece of metadata, ideal for unstable_cache.
const fetchCatalogChunkCountCached = unstable_cache(
  async () => {
    console.log("Attempting to fetch catalog chunk count from Redis (and cache)");
    let countStr = await redis.get("catalog_chunk_count");

    if (!countStr) {
      // If the count is missing, it suggests the catalog chunks might not be ready
      // or were cleared. Attempt to rebuild them to ensure data consistency.
      console.warn("catalog_chunk_count missing in Redis. Attempting to rebuild catalog chunks.");
      await fetchAndCreateCatalogChunks(); // This function will populate Redis.
      countStr = await redis.get("catalog_chunk_count"); // Try fetching again after rebuild.
      if (!countStr) {
          throw new Error("Failed to retrieve catalog_chunk_count even after rebuild attempt.");
      }
    }

    const count = parseInt(String(countStr), 10); // Ensure countStr is treated as a string
    if (isNaN(count)) {
        throw new Error("Invalid format for catalog_chunk_count in Redis; expected a number.");
    }
    return count;
  },
  ['catalog_chunk_count'], // Unique key for this specific piece of metadata.
  { tags: [CATALOG_TAG], revalidate: false }
);

// Existing: Fetches and caches categories data.
const fetchCategoriesCached = unstable_cache(
  async () => {
    console.log("Attempting to fetch categories from Redis (and cache)");
    const raw = await redis.get("catalog_categories");
    // Explicitly check if raw is a string before parsing.
    // If not a string (e.g., an object), it's considered invalid cache.
    if (typeof raw !== 'string') {
        console.error("Cached categories data is not a string, re-fetching.");
        return await fetchAndCreateCategoriesCache();
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      // If parsing fails, the Redis entry might be corrupt. Re-fetch and create.
      console.error("Error parsing cached categories, re-fetching:", error);
      return await fetchAndCreateCategoriesCache();
    }
  },
  ["catalog_categories"], // Unique key for categories cache.
  { tags: [CATALOG_TAG], revalidate: false }
);

// Existing: Fetches and caches filter settings data.
const fetchFilterSettingsCached = unstable_cache(
  async () => {
    console.log("Attempting to fetch filter settings from Redis (and cache)");
    const raw = await redis.get("filter_settings");
    // Explicitly check if raw is a string before parsing.
    // If not a string (e.g., an object), it's considered invalid cache.
    if (typeof raw !== 'string') {
        console.error("Cached filter settings data is not a string, re-fetching.");
        return await fetchAndCreateFilterSettingsCache();
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      // If parsing fails, re-fetch and create the cache entry.
      console.error("Error parsing cached filter settings, re-fetching:", error);
      return await fetchAndCreateFilterSettingsCache();
    }
  },
  ["filter_settings"], // Unique key for filter settings cache.
  { tags: [CATALOG_TAG], revalidate: false }
);

// --- Non-Cached Data Combination Function ---

// This function combines all product data chunks. It is NOT wrapped by unstable_cache
// because its return value (the full product data) can be larger than 2MB.
export async function getCombinedProductData() {
  console.log("Assembling combined product data from chunks...");
  try {
    // First, get the total number of chunks using its cached accessor.
    const count = await fetchCatalogChunkCountCached();
    const pieces: string[] = [];
    // Then, fetch each individual chunk using its cached accessor.
    for (let i = 0; i < count; i++) {
      const chunk = await fetchIndividualCatalogChunkCached(i);
      pieces.push(chunk);
    }
    // Finally, join all chunks and parse the complete JSON string.
    return JSON.parse(pieces.join(""));
  } catch (error) {
    // If any part of the cached chunk retrieval fails, fall back to
    // fetching all products directly and rebuilding the Redis chunks.
    console.error("Error retrieving or combining product data from cache, falling back to direct fetch and rebuild:", error);
    // This ensures data is always available even if cache is inconsistent.
    const data = await fetchAndCreateCatalogChunks();
    // Ensure data is an array, even if empty.
    return Array.isArray(data) ? data : [];
  }
}

// --- Modified Main Exported Function ---

// This main function now returns all the data (product data, categories, filter settings).
// It is NOT wrapped by unstable_cache itself to avoid hitting the 2MB limit
// when returning the large product data. However, its internal calls to
// fetchIndividualCatalogChunkCached, fetchCategoriesCached, and fetchFilterSettingsCached
// will still leverage Next.js's data cache.
export const fetchCatalogWithCache = async () => {
  console.log("Fetching all catalog data (products, categories, filter settings)...");
  try {
    // Use Promise.all to fetch all data concurrently.
    const [data, categories, filterSettingsData] = await Promise.all([
      getCombinedProductData(), // This is the large product data, not cached directly here.
      fetchCategoriesCached(),  // This is cached.
      fetchFilterSettingsCached(), // This is cached.
    ]);

    // Return all fetched data.
    return { data, categories, filterSettingsData };
  } catch (error) {
    // If any part of the overall fetch fails, fall back to direct fetch and cache population.
    console.error("Overall catalog data fetch error, falling back to direct fetch and rebuild:", error);
    const data = await fetchAndCreateCatalogChunks();
    const categories = await fetchAndCreateCategoriesCache();
    const filterSettingsData = await fetchAndCreateFilterSettingsCache();
    // Ensure return values are arrays/objects as expected, even if empty.
    return {
      data: Array.isArray(data) ? data : [],
      categories: categories || [],
      filterSettingsData: filterSettingsData || {}
    };
  }
};

// --- Existing Helper Functions (no major changes needed) ---

// Creates and stores product data in Redis in multiple chunks.
export async function createCatalogChunks(groupedProducts: any) {
  const json = JSON.stringify(groupedProducts);
  // Define a chunk size (e.g., 512 KB) to split the data.
  const chunkSize = 512 * 1024;
  const count = Math.ceil(json.length / chunkSize);

  // Store each chunk in Redis with a unique key.
  await Promise.all(
    Array.from({ length: count }).map((_, i) => {
      const chunk = json.slice(i * chunkSize, (i + 1) * chunkSize);
      return redis.set(`catalog_chunk_${i}`, chunk);
    })
  );
  // Store the total chunk count for later retrieval.
  await redis.set("catalog_chunk_count", count.toString());
}

// Fetches all products, groups them, and stores them in Redis chunks.
export async function fetchAndCreateCatalogChunks() {
  console.log("Fetching all products and creating new catalog chunks in Redis...");
  const products = await fetchAllProducts();
  const groupedProducts = groupProducts(products);

  await createCatalogChunks(groupedProducts);
  // Note: revalidateTag is not called here. It's called when clearing the cache.
  // Ensure an array is always returned.
  return Array.isArray(groupedProducts) ? groupedProducts : [];
}

// Fetches categories, stores them in Redis, and returns them.
export async function fetchAndCreateCategoriesCache() {
  console.log("Fetching and creating categories cache in Redis...");
  const categories = await getCategoriesNamesIdsTotalProducts();
  await redis.set("catalog_categories", JSON.stringify(categories));
  // Note: revalidateTag is not called here.
  // Ensure an array is always returned, or an empty array if null/undefined.
  return categories || [];
}

// Fetches filter settings, stores them in Redis, and returns them.
export async function fetchAndCreateFilterSettingsCache() {
  console.log("Fetching and creating filter settings cache in Redis...");
  const filterSettings = await getFilterSettingsAndDelay();
  await redis.set("filter_settings", JSON.stringify(filterSettings));
  // Note: revalidateTag is not called here.
  // Ensure an object is always returned, or an empty object if null/undefined.
  return filterSettings || {};
}

// Clears all catalog-related keys from Redis and revalidates the Next.js cache tag.
export async function clearCatalogCache() {
  console.log("Clearing all catalog related caches and Redis keys...");
  // Get all keys starting with 'catalog_chunk_'
  const keys = await redis.keys("catalog_chunk_*");
  // Delete all relevant Redis keys.
  await Promise.all([
    ...keys.map((key) => redis.del(key)),
    redis.del("catalog_chunk_count"),
    redis.del("catalog_categories"),
    redis.del("filter_settings"),
  ]);
  // Crucially, revalidate the main catalog tag to invalidate all associated unstable_cache entries.
  revalidateTag(CATALOG_TAG);
  console.log("Catalog cache cleared and revalidated.");
}
