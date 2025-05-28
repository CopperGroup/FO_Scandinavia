"use server";

import { redis } from "@/lib/redis";
import { fetchAllProducts } from "../product.actions";
import { getCategoriesNamesIdsTotalProducts } from "../categories.actions";
import { getFilterSettingsAndDelay } from "../filter.actions";
import { FilterSettingsData, ProductType } from "@/lib/types/types";
import { filterProductsByKey, groupProducts } from "@/lib/utils";
import { revalidateTag, unstable_cache } from "next/cache";
import { cache } from "react";

export async function createCatalogChunks (filtredProducts: any) {
    console.log("[createCatalogChunks] Starting. Input data type:", typeof filtredProducts, "Is Array?", Array.isArray(filtredProducts));
    if (Array.isArray(filtredProducts)) {
        console.log("[createCatalogChunks] Input array length:", filtredProducts.length);
    }

    const jsonData = JSON.stringify(filtredProducts);
    const dataSize = Buffer.byteLength(jsonData, 'utf8');
    const MAX_SIZE = 512 * 1024;

    console.log(`[createCatalogChunks] jsonData character length: ${jsonData.length}`);
    console.log(`[createCatalogChunks] dataSize (bytes): ${dataSize}`);
    console.log(`[createCatalogChunks] MAX_SIZE (bytes): ${MAX_SIZE}`);

    if (dataSize === 0) {
        console.log("[createCatalogChunks] jsonData is empty. Setting chunk_count to 0.");
        await redis.set("catalog_chunk_count", 0);
        return;
    }

    // Original calculation (potential issue here with mixing byte-size chunkSize and char-based slice)
    const numberOfChunks = Math.ceil(dataSize / MAX_SIZE);
    const originalChunkSize = Math.ceil(dataSize / numberOfChunks + 1); // This is in bytes

    console.log(`[createCatalogChunks] Calculated numberOfChunks: ${numberOfChunks}`);
    console.log(`[createCatalogChunks] Original calculated chunkSize (bytes, for character slice): ${originalChunkSize}`);

    const chunks = [];

    // Original chunking loop (prone to issues if originalChunkSize is used with character-based slice)
    // Using a corrected loop based on character lengths for demonstration if MAX_SIZE was char based
    // For byte-based chunking, buffer slicing is better (see alternative below logs)
    // Let's simulate character-based chunking logic if MAX_SIZE was meant for characters
    const characterChunkSize = Math.ceil(jsonData.length / numberOfChunks);
    console.log(`[createCatalogChunks] If chunking by characters, characterChunkSize would be: ${characterChunkSize}`);


    // Sticking to your original logic for logging, but be aware of its pitfalls:
    // The loop condition `i < jsonData.length` and `i += originalChunkSize`
    // with `originalChunkSize` being byte-based can lead to unexpected behavior.
    console.log("[createCatalogChunks] Starting chunking loop with original logic (byte-sized chunkSize for character slice):");
    for (let i = 0; i < jsonData.length; i += originalChunkSize) {
        const chunk = jsonData.slice(i, i + originalChunkSize);
        chunks.push(chunk);
        console.log(`[createCatalogChunks] Loop i=${i}, pushed chunk of char length: ${chunk.length}. Chunks array size: ${chunks.length}`);
    }
    
    // A more robust way to chunk by bytes is to use Buffers:
    /*
    const buffer = Buffer.from(jsonData, 'utf8');
    for (let i = 0; i < numberOfChunks; i++) {
        const start = i * MAX_SIZE;
        const end = Math.min(start + MAX_SIZE, dataSize);
        const chunkBuffer = buffer.slice(start, end);
        chunks.push(chunkBuffer.toString('utf8'));
        console.log(`[createCatalogChunks] Buffer slicing: Pushed chunk ${i+1}/${numberOfChunks}, byte length: ${Buffer.byteLength(chunks[chunks.length-1], 'utf8')}`);
    }
    */
    
    console.log(`[createCatalogChunks] Total chunks created: ${chunks.length}`);

    if (chunks.length === 0 && dataSize > 0) {
        console.warn("[createCatalogChunks] Warning: No chunks were created, but dataSize is greater than 0. Check chunking logic.");
    }


    for (let i = 0; i < chunks.length; i++) {
        const key = `catalog_chunk_${i}`;
        await redis.set(key, chunks[i]);
        console.log(`[createCatalogChunks] Stored chunk ${i} in Redis with key: ${key}, chunk char length: ${chunks[i].length}, chunk byte length: ${Buffer.byteLength(chunks[i], 'utf8')}`);
    }

    await redis.set("catalog_chunk_count", chunks.length);
    console.log(`[createCatalogChunks] Stored catalog_chunk_count: ${chunks.length}`);
};

export async function fetchCatalog () {
    console.log("[fetchCatalog] Attempting to fetch catalog from Redis.");
    try{
        const chunks = [];
        let chunkIndex = 0;

        const chunkCountStr: string | null = await redis.get("catalog_chunk_count");
        console.log(`[fetchCatalog] Raw catalog_chunk_count from Redis: '${chunkCountStr}' (type: ${typeof chunkCountStr})`);

        if (chunkCountStr === null) {
            console.error("[fetchCatalog] 'catalog_chunk_count' is null. Catalog product chunks missing or not yet created.");
            throw new Error("Catalog product chunks count is missing");
        }
        
        const chunkCount: number = parseInt(chunkCountStr, 10);
        if (isNaN(chunkCount)) {
            console.error(`[fetchCatalog] Failed to parse 'catalog_chunk_count': '${chunkCountStr}'.`);
            throw new Error("Invalid catalog product chunks count");
        }
        
        console.log(`[fetchCatalog] Parsed chunk count: ${chunkCount}`);

        if (chunkCount === 0) {
            console.log("[fetchCatalog] Chunk count is 0. Returning empty data or re-fetching.");
            // Decide if empty data is valid or if it should trigger a re-fetch like in the catch block.
            // For now, let's assume it triggers a re-fetch as per the catch block's behavior.
            throw new Error("Catalog is empty (chunk count is 0).");
        }

        while (chunkIndex < chunkCount) {
            const chunkKey = `catalog_chunk_${chunkIndex}`;
            const chunk = await redis.get(chunkKey);
            console.log(`[fetchCatalog] Attempting to fetch chunk: ${chunkKey}`);

            if(chunk) {
                chunks.push(chunk);
                console.log(`[fetchCatalog] Fetched chunk ${chunkIndex}. Chunk char length: ${chunk.length}. Total chunks fetched: ${chunks.length}`);
            } else {
                console.error(`[fetchCatalog] Chunk ${chunkIndex} (${chunkKey}) is missing from Redis.`);
                throw new Error(`Catalog product chunk ${chunkIndex} is missing`);
            }
            chunkIndex++;
        }

        if(chunks.length !== chunkCount) {
            console.error(`[fetchCatalog] Mismatch: Expected ${chunkCount} chunks, but fetched ${chunks.length} chunks.`);
            throw new Error("Catalog product chunks missing or incomplete");
        }

        console.log("[fetchCatalog] Successfully fetched all chunks from Redis.");

        const combinedChunks = chunks.join('');
        console.log(`[fetchCatalog] Combined chunks character length: ${combinedChunks.length}`);
        
        const data = JSON.parse(combinedChunks);
        console.log("[fetchCatalog] Successfully parsed combined chunks. Data type:", typeof data);
        
        let rawCategoriesFromRedis: string | null = await redis.get("catalog_categories");
        console.log(`[fetchCatalog] Raw catalog_categories from Redis: type ${typeof rawCategoriesFromRedis}, length ${rawCategoriesFromRedis?.length}`);
        let categories;
        if (!rawCategoriesFromRedis) {
            console.log("[fetchCatalog] catalog_categories not found in Redis. Fetching and creating cache.");
            categories = await fetchAndCreateCategoriesCache();
        } else {
            try {
                categories = JSON.parse(rawCategoriesFromRedis); // Assuming it's a JSON string
                console.log("[fetchCatalog] Parsed catalog_categories from Redis.");
            } catch (e) {
                console.error("[fetchCatalog] Failed to parse catalog_categories from Redis, using raw string or re-fetching.", e);
                // Depending on requirements, you might want to throw or re-fetch
                categories = rawCategoriesFromRedis; // Or trigger re-fetch
            }
        }
        
        const rawFilterSettingsFromRedis: string | null = await redis.get("filter_settings");
        console.log(`[fetchCatalog] Raw filter_settings from Redis: type ${typeof rawFilterSettingsFromRedis}, length ${rawFilterSettingsFromRedis?.length}`);
        let filterSettingsData;
        if(!rawFilterSettingsFromRedis) {
            console.log("[fetchCatalog] filter_settings not found in Redis. Fetching and creating cache.");
            filterSettingsData = await fetchAndCreateFilterSettingsCache();
        } else {
             try {
                filterSettingsData = JSON.parse(rawFilterSettingsFromRedis); // Assuming it's a JSON string
                console.log("[fetchCatalog] Parsed filter_settings from Redis.");
            } catch (e) {
                console.error("[fetchCatalog] Failed to parse filter_settings from Redis, using raw string or re-fetching.", e);
                filterSettingsData = rawFilterSettingsFromRedis; // Or trigger re-fetch
            }
        }
        
        console.log("[fetchCatalog] Successfully processed categories and filter settings.");
        return { data, categories, filterSettingsData };
    } catch (error) {
        console.error("[fetchCatalog] Error encountered. Re-fetching all data.", error);
        // Fallback: fetch and create all data if any error occurs
        const data = await fetchAndCreateCatalogChunks();
        const categories = await fetchAndCreateCategoriesCache();
        const filterSettingsData = await fetchAndCreateFilterSettingsCache();
        console.log("[fetchCatalog] Fallback: Successfully re-fetched and created all data.");
        return { data, categories, filterSettingsData };
    }
}

export async function fetchAndCreateCatalogChunks() {
    console.log("[fetchAndCreateCatalogChunks] Starting to fetch and create catalog chunks.");
    try {
        let filtredProducts: any = await fetchAllProducts();
        console.log("[fetchAndCreateCatalogChunks] Fetched all products.");

        // filtredProducts = filterProductsByKey(filtredProducts as ProductType[], "articleNumber", "-", -1, 3)
        filtredProducts = groupProducts(filtredProducts);
        console.log("[fetchAndCreateCatalogChunks] Grouped products.");
        
        await createCatalogChunks(filtredProducts);
        console.log("[fetchAndCreateCatalogChunks] Called createCatalogChunks.");
        
        // The call to clearCatalogCache() here seems problematic.
        // It deletes the chunks you just created immediately after creating them.
        // This might be intended if fetchCatalogWithCache is supposed to pick up the new data
        // after revalidation, but it means `catalog_chunk_count` and chunks will be gone
        // for any direct `fetchCatalog` call that might happen before `fetchAndCreateCatalogChunks` completes
        // or if `clearCatalogCache` runs before `createCatalogChunks` finishes writing to Redis properly.
        // Consider if this clear operation is correctly placed.
        // await clearCatalogCache(); 
        // console.log("[fetchAndCreateCatalogChunks] Called clearCatalogCache. If this was unintentional, chunks are now gone.");

        console.log("[fetchAndCreateCatalogChunks] Successfully fetched and processed products for chunks.");
        return filtredProducts;
    } catch (error: any) {
        console.error(`[fetchAndCreateCatalogChunks] Error: ${error.message}`);
        throw new Error(`Error fetching catalog data: ${error.message}`);
    }
}

export async function clearCatalogCache() {
    console.log("[clearCatalogCache] Starting to clear catalog-related cache from Redis.");
    let cursor = '0';
    const matchPattern = '*catalog*'; // This pattern is broad and will match 'catalog_chunk_count', 'catalog_chunk_*', 'catalog_categories'.
                                      // Be careful if other keys contain "catalog" that shouldn't be deleted.
    let deletedKeysCount = 0;

    try {
        do {
            const scanResult = await redis.scan(cursor, { match: matchPattern, count: 100 });
            cursor = scanResult[0];
            const keys = scanResult[1];
            console.log(`[clearCatalogCache] SCAN cursor: ${cursor}, found keys: ${keys.length}`);

            if (keys.length > 0) {
                console.log(`[clearCatalogCache] Deleting keys: ${keys.join(", ")}`);
                await redis.del(...keys);
                deletedKeysCount += keys.length;
            }
        } while (cursor !== '0')
        console.log(`[clearCatalogCache] Finished SCAN/DEL for pattern '${matchPattern}'. Deleted ${deletedKeysCount} keys.`);

        console.log("[clearCatalogCache] Explicitly deleting 'catalog_categories' and 'filter_settings'.");
        await redis.del("catalog_categories"); // May have already been deleted by SCAN if it matches '*catalog*'
        await redis.del("filter_settings");    // This one does not match '*catalog*' unless it's named e.g. 'catalog_filter_settings'

        // Revalidating the tag for `fetchCatalogWithCache` after clearing
        revalidateTag("catalog-data");
        console.log("[clearCatalogCache] Revalidated tag 'catalog-data'. Cache clearing complete.");
    } catch (error: any) {
        console.error(`[clearCatalogCache] Error: ${error.message}`);
        throw new Error(`Error clearing catalog cache: ${error.message}`);
    }
}

export async function fetchAndCreateCategoriesCache() {
    console.log("[fetchAndCreateCategoriesCache] Starting.");
    try {
        const categories = await getCategoriesNamesIdsTotalProducts();
        console.log("[fetchAndCreateCategoriesCache] Fetched categories data.");
        const jsonCategories = JSON.stringify(categories);
        await redis.set("catalog_categories", jsonCategories);
        console.log("[fetchAndCreateCategoriesCache] Stored categories in Redis. JSON length:", jsonCategories.length);
        return categories;
    } catch (error: any) {
        console.error(`[fetchAndCreateCategoriesCache] Error: ${error.message}`);
        throw new Error(`Error creating categories catalog cache: ${error.message}`);
    }
}

export async function fetchAndCreateFilterSettingsCache() {
    console.log("[fetchAndCreateFilterSettingsCache] Starting.");
    try {
        const data = await getFilterSettingsAndDelay();
        console.log("[fetchAndCreateFilterSettingsCache] Fetched filter settings and delay data.");
        const jsonFilterSettings = JSON.stringify(data);
        await redis.set("filter_settings", jsonFilterSettings);
        console.log("[fetchAndCreateFilterSettingsCache] Stored filter settings in Redis. JSON length:", jsonFilterSettings.length);
        return data;
    } catch (error: any) {
        console.error(`[fetchAndCreateFilterSettingsCache] Error: ${error.message}`);
        throw new Error(`Error creating filter settings cache: ${error.message}`);
    }
}

export const fetchCatalogWithCache = cache(
    unstable_cache(
        async () => {
            console.log("[fetchCatalogWithCache] Cache miss or revalidation. Calling fetchCatalog.");
            const { data, categories, filterSettingsData } = await fetchCatalog();
            console.log("[fetchCatalogWithCache] fetchCatalog returned. Caching result.");
            return { data, categories, filterSettingsData };
        },
        ['fetchCatalog'], // Cache key parts
        {
            tags: ["catalog-data"], // Tags for revalidation
            // Consider adding a revalidate timeout if appropriate, e.g., revalidate: 3600 (1 hour)
        }
    )
);