import { revalidateTag } from "next/cache";
import { parseCatalogQuery, runCatalogQuery, type CatalogResult } from "../query";
import { SNAPSHOT_VERSION, buildCatalogSnapshot } from "../snapshot";
import type { CatalogSnapshot, ProductVariants } from "../types";
import { buildVariantIndex, getProductVariants, type VariantIndex } from "../variants";
import { getKeyValueStore, type KeyValueStore } from "./kv";
import { loadSnapshotInput } from "./repository";

/**
 * Catalog service.
 *
 * The catalog is served from an immutable snapshot built from MongoDB:
 *
 *   L1  parsed snapshot held in process memory (no per-request JSON parsing)
 *   L2  the same snapshot in the key-value store, written as a new generation
 *       and published by flipping a single pointer key, so readers never see
 *       a half-written catalog
 *
 * Writers call `invalidateCatalog()`; the next read rebuilds. Concurrent
 * rebuilds in one process collapse into a single build.
 */

export const CATALOG_TAG = "catalog-data";

const KEY_PREFIX = `catalog:v${SNAPSHOT_VERSION}`;
const POINTER_KEY = `${KEY_PREFIX}:current`;
const CHUNK_CHARS = 512 * 1024;
const GENERATION_TTL_SECONDS = 7 * 24 * 60 * 60;
/** How long a process trusts its snapshot before re-checking the shared pointer. */
const POINTER_RECHECK_MS = Number(process.env.CATALOG_POINTER_RECHECK_MS ?? 15000);
const MAX_BUILD_ATTEMPTS = 3;
/** After the cache fails, serve from memory this long before asking it again. */
const CACHE_BACKOFF_MS = 60_000;

type Pointer = { generation: string; chunks: number; builtAt: string };

export type CatalogRuntime = {
  generation: string;
  snapshot: CatalogSnapshot;
  variants: VariantIndex;
};

type ServiceState = {
  runtime: CatalogRuntime | null;
  checkedAt: number;
  /** Incremented by every invalidation; a build that started earlier is stale. */
  epoch: number;
  resolving: Promise<CatalogRuntime> | null;
  building: Promise<CatalogRuntime> | null;
  lastBuildMs: number | null;
};

const globalForCatalog = globalThis as unknown as { __catalogService?: ServiceState };
const state: ServiceState = (globalForCatalog.__catalogService ??= {
  runtime: null,
  checkedAt: 0,
  epoch: 0,
  resolving: null,
  building: null,
  lastBuildMs: null,
});

function toRuntime(generation: string, snapshot: CatalogSnapshot): CatalogRuntime {
  return { generation, snapshot, variants: buildVariantIndex(snapshot.groups) };
}

function chunkKey(generation: string, index: number): string {
  return `${KEY_PREFIX}:${generation}:${index}`;
}

function parsePointer(raw: string | null): Pointer | null {
  if (!raw) return null;
  try {
    const pointer = JSON.parse(raw) as Pointer;
    return typeof pointer?.generation === "string" && Number.isInteger(pointer.chunks) ? pointer : null;
  } catch {
    return null;
  }
}

async function readGeneration(store: KeyValueStore, pointer: Pointer): Promise<CatalogSnapshot | null> {
  const pieces = await Promise.all(
    Array.from({ length: pointer.chunks }, (_, index) => store.get(chunkKey(pointer.generation, index))),
  );
  if (pieces.some((piece) => piece === null)) return null;

  try {
    const snapshot = JSON.parse(pieces.join("")) as CatalogSnapshot;
    return snapshot.version === SNAPSHOT_VERSION ? snapshot : null;
  } catch {
    return null;
  }
}

async function publishGeneration(store: KeyValueStore, generation: string, snapshot: CatalogSnapshot): Promise<void> {
  const json = JSON.stringify(snapshot);
  const chunks = Math.max(1, Math.ceil(json.length / CHUNK_CHARS));

  await Promise.all(
    Array.from({ length: chunks }, (_, index) =>
      store.set(
        chunkKey(generation, index),
        json.slice(index * CHUNK_CHARS, (index + 1) * CHUNK_CHARS),
        GENERATION_TTL_SECONDS,
      ),
    ),
  );

  // Every chunk is in place: flip the pointer, then drop the generation it replaced.
  const previous = parsePointer(await store.get(POINTER_KEY).catch(() => null));
  const pointer: Pointer = { generation, chunks, builtAt: snapshot.builtAt };
  await store.set(POINTER_KEY, JSON.stringify(pointer), GENERATION_TTL_SECONDS);

  if (previous && previous.generation !== generation) {
    await store
      .del(Array.from({ length: previous.chunks }, (_, index) => chunkKey(previous.generation, index)))
      .catch(() => undefined);
  }
}

async function build(): Promise<CatalogRuntime> {
  for (let attempt = 1; ; attempt++) {
    const epoch = state.epoch;
    const startedAt = Date.now();

    const snapshot = buildCatalogSnapshot(await loadSnapshotInput());
    const generation = `${startedAt.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const runtime = toRuntime(generation, snapshot);

    // An invalidation landed while this build was reading: its data may predate the write.
    if (state.epoch !== epoch && attempt < MAX_BUILD_ATTEMPTS) continue;

    state.runtime = runtime;
    state.checkedAt = Date.now();
    state.lastBuildMs = Date.now() - startedAt;

    try {
      await publishGeneration(getKeyValueStore(), generation, snapshot);
    } catch (error) {
      // The process keeps serving from memory; other instances rebuild on their own.
      console.error("[catalog] could not publish snapshot to the cache:", error instanceof Error ? error.message : error);
    }

    console.info(
      `[catalog] built ${snapshot.stats.listings} listings from ${snapshot.stats.products} products in ${state.lastBuildMs}ms`,
    );
    return runtime;
  }
}

/** Rebuilds the snapshot from MongoDB. Concurrent callers share one build. */
export function rebuildCatalog(): Promise<CatalogRuntime> {
  if (!state.building) {
    state.building = build().finally(() => {
      state.building = null;
    });
  }
  return state.building;
}

async function resolve(): Promise<CatalogRuntime> {
  const store = getKeyValueStore();

  let pointer: Pointer | null = null;
  try {
    pointer = parsePointer(await store.get(POINTER_KEY));
  } catch (error) {
    console.error("[catalog] cache unavailable:", error instanceof Error ? error.message : error);
    // Serve what we have rather than hammering a failing cache; otherwise build from the database.
    if (state.runtime) {
      state.checkedAt = Date.now() + CACHE_BACKOFF_MS - POINTER_RECHECK_MS;
      return state.runtime;
    }
    const rebuilt = await rebuildCatalog();
    state.checkedAt = Date.now() + CACHE_BACKOFF_MS - POINTER_RECHECK_MS;
    return rebuilt;
  }

  if (pointer && state.runtime?.generation === pointer.generation) {
    state.checkedAt = Date.now();
    return state.runtime;
  }

  if (pointer) {
    const snapshot = await readGeneration(store, pointer).catch(() => null);
    if (snapshot) {
      state.runtime = toRuntime(pointer.generation, snapshot);
      state.checkedAt = Date.now();
      return state.runtime;
    }
  }

  return rebuildCatalog();
}

/** The current catalog, from memory when fresh, else from the cache, else rebuilt. */
export function getCatalogRuntime(): Promise<CatalogRuntime> {
  if (state.runtime && Date.now() - state.checkedAt < POINTER_RECHECK_MS) {
    return Promise.resolve(state.runtime);
  }
  if (!state.resolving) {
    state.resolving = resolve().finally(() => {
      state.resolving = null;
    });
  }
  return state.resolving;
}

/**
 * Marks the catalog stale. Call after any write that changes what shoppers
 * see: products, categories, filter settings.
 */
export async function invalidateCatalog(): Promise<void> {
  state.epoch += 1;
  state.runtime = null;
  state.checkedAt = 0;

  const store = getKeyValueStore();
  try {
    const previous = parsePointer(await store.get(POINTER_KEY));
    const keys = [POINTER_KEY];
    if (previous) {
      for (let index = 0; index < previous.chunks; index++) keys.push(chunkKey(previous.generation, index));
    }
    await store.del(keys);
  } catch (error) {
    console.error("[catalog] could not clear the cached snapshot:", error instanceof Error ? error.message : error);
  }

  try {
    revalidateTag(CATALOG_TAG);
  } catch {
    // Outside a request scope (scripts, workers) there is no Next.js cache to revalidate.
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Read API                                  */
/* -------------------------------------------------------------------------- */

export async function getCatalogSnapshot(): Promise<CatalogSnapshot> {
  return (await getCatalogRuntime()).snapshot;
}

export type CatalogPage = CatalogResult & {
  categories: CatalogSnapshot["categories"];
  filterDelay: number;
};

export async function queryCatalog(searchParams: Record<string, string | string[] | undefined>): Promise<CatalogPage> {
  const { snapshot } = await getCatalogRuntime();
  const result = runCatalogQuery(snapshot, parseCatalogQuery(searchParams));
  return { ...result, categories: snapshot.categories, filterDelay: snapshot.filterDelay };
}

/** Size/colour choices for a product page, or null when the product is unknown to the catalog. */
export async function getVariantsForProduct(productId: string): Promise<ProductVariants | null> {
  const { variants } = await getCatalogRuntime();
  return getProductVariants(variants, productId);
}

export type CatalogStatus = {
  driver: KeyValueStore["driver"];
  generation: string;
  builtAt: string;
  lastBuildMs: number | null;
  stats: CatalogSnapshot["stats"];
};

export async function getCatalogStatus(): Promise<CatalogStatus> {
  const runtime = await getCatalogRuntime();
  return {
    driver: getKeyValueStore().driver,
    generation: runtime.generation,
    builtAt: runtime.snapshot.builtAt,
    lastBuildMs: state.lastBuildMs,
    stats: runtime.snapshot.stats,
  };
}
