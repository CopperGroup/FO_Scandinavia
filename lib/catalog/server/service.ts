import { revalidateTag } from "next/cache";
import { parseCatalogQuery, runCatalogQuery, type CatalogResult } from "../query";
import { SNAPSHOT_VERSION, buildCatalogSnapshot } from "../snapshot";
import type { CatalogSnapshot, ProductVariants } from "../types";
import { buildVariantIndex, getProductVariants, type VariantIndex } from "../variants";
import type { SnapshotInput } from "../snapshot";
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
 * Writers call `invalidateCatalog()`. Shoppers never wait for the rebuild that
 * follows: the snapshot they were being served stays in use until the new one
 * is ready (a few seconds), then it is swapped in one step. Only a process
 * with nothing to serve at all (a first start with an empty cache) builds
 * while a visitor waits. Concurrent rebuilds in one process collapse into one.
 *
 * Staleness is tracked twice: `epoch` inside the process, and an "edition"
 * token in the key-value store that every invalidation replaces. A published
 * snapshot records the edition it was built for, so a process that starts
 * later, or another instance, can tell that the cached snapshot predates the
 * last change and refresh it.
 */

export const CATALOG_TAG = "catalog-data";

const KEY_PREFIX = `catalog:v${SNAPSHOT_VERSION}`;
const POINTER_KEY = `${KEY_PREFIX}:current`;
/** Replaced by every invalidation; a snapshot built for an older value is stale. */
const EDITION_KEY = `${KEY_PREFIX}:edition`;
const CHUNK_CHARS = 512 * 1024;
const GENERATION_TTL_SECONDS = 7 * 24 * 60 * 60;
/** How long a process trusts its snapshot before re-checking the shared pointer. */
const POINTER_RECHECK_MS = Number(process.env.CATALOG_POINTER_RECHECK_MS ?? 15000);
const MAX_BUILD_ATTEMPTS = 3;
/** After the cache fails, serve from memory this long before asking it again. */
const CACHE_BACKOFF_MS = 60_000;
/** After a background rebuild fails, keep serving the previous snapshot this long before trying again. */
const REFRESH_RETRY_MS = Number(process.env.CATALOG_REFRESH_RETRY_MS ?? 10_000);

type Pointer = { generation: string; chunks: number; builtAt: string; edition?: string };

export type CatalogRuntime = {
  generation: string;
  snapshot: CatalogSnapshot;
  variants: VariantIndex;
};

type ServiceState = {
  runtime: CatalogRuntime | null;
  /** `epoch` at the moment the build behind `runtime` started reading; lower than `epoch` means stale. */
  runtimeEpoch: number;
  checkedAt: number;
  /** Incremented by every invalidation; a build that started earlier is stale. */
  epoch: number;
  resolving: Promise<CatalogRuntime> | null;
  building: Promise<CatalogRuntime> | null;
  lastBuildMs: number | null;
  /** When the last background rebuild failed. */
  refreshFailedAt: number;
};

const globalForCatalog = globalThis as unknown as { __catalogService?: ServiceState };
const state: ServiceState = (globalForCatalog.__catalogService ??= {
  runtime: null,
  runtimeEpoch: 0,
  checkedAt: 0,
  epoch: 0,
  resolving: null,
  building: null,
  lastBuildMs: null,
  refreshFailedAt: 0,
});
// A state object kept across a hot reload may predate these fields.
state.runtimeEpoch ??= state.epoch;
state.refreshFailedAt ??= 0;

/** What a build reads. Tests put their own reader here. */
const source: { load: () => Promise<SnapshotInput> } = { load: loadSnapshotInput };

/**
 * Tells the job that resizes photos ahead of visitors which photos are on sale now
 * (lib/photo/filler.ts). Loaded on demand: the catalog works the same without it.
 */
function announcePhotos(runtime: CatalogRuntime): void {
  void import("../../photo/filler").then((filler) => filler.catalogPhotosChanged(runtime.snapshot)).catch(() => undefined);
}

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

async function publishGeneration(store: KeyValueStore, generation: string, snapshot: CatalogSnapshot, edition: string): Promise<void> {
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
  const pointer: Pointer = { generation, chunks, builtAt: snapshot.builtAt, edition };
  await store.set(POINTER_KEY, JSON.stringify(pointer), GENERATION_TTL_SECONDS);

  if (previous && previous.generation !== generation) {
    await store
      .del(Array.from({ length: previous.chunks }, (_, index) => chunkKey(previous.generation, index)))
      .catch(() => undefined);
  }
}

/** The edition the shared cache is at; "" when none was ever set or the cache cannot be read. */
async function readEdition(store: KeyValueStore): Promise<string> {
  try {
    return (await store.get(EDITION_KEY)) ?? "";
  } catch {
    return "";
  }
}

async function build(): Promise<CatalogRuntime> {
  const store = getKeyValueStore();
  for (let attempt = 1; ; attempt++) {
    const epoch = state.epoch;
    // Read before the database: a change made while this build is reading leaves it marked as stale.
    const edition = await readEdition(store);
    const startedAt = Date.now();

    const input = await source.load();
    const readMs = Date.now() - startedAt;
    const snapshot = buildCatalogSnapshot(input);
    const generation = `${startedAt.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const runtime = toRuntime(generation, snapshot);

    // An invalidation landed while this build was reading: its data may predate the write.
    if (state.epoch !== epoch && attempt < MAX_BUILD_ATTEMPTS) continue;

    // Published first, taken into use second: a read that looks at the cache in between
    // must not find the previous snapshot there and put it back in place of this one.
    try {
      await publishGeneration(store, generation, snapshot, edition);
    } catch (error) {
      // The process keeps serving from memory; other instances rebuild on their own.
      console.error("[catalog] could not publish snapshot to the cache:", error instanceof Error ? error.message : error);
    }

    state.runtime = runtime;
    state.runtimeEpoch = epoch;
    state.checkedAt = Date.now();
    state.refreshFailedAt = 0;
    state.lastBuildMs = Date.now() - startedAt;
    announcePhotos(runtime);

    console.info(
      `[catalog] built ${snapshot.stats.listings} listings from ${snapshot.stats.products} products in ${state.lastBuildMs}ms (database ${readMs}ms)`,
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

/**
 * Starts a rebuild nobody waits for, when the snapshot in use predates the
 * last change. The snapshot keeps being served until the new one replaces it.
 */
function refreshIfStale(): void {
  if (!state.runtime || state.runtimeEpoch >= state.epoch || state.building) return;
  if (Date.now() - state.refreshFailedAt < REFRESH_RETRY_MS) return;

  rebuildCatalog()
    .then(() => {
      // A change that landed too late for that build: go again.
      refreshIfStale();
    })
    .catch((error) => {
      state.refreshFailedAt = Date.now();
      console.error("[catalog] background rebuild failed, still serving the previous snapshot:", error instanceof Error ? error.message : error);
    });
}

async function resolve(): Promise<CatalogRuntime> {
  const store = getKeyValueStore();

  let pointer: Pointer | null = null;
  let edition = "";
  try {
    const [pointerRaw, editionRaw] = await Promise.all([store.get(POINTER_KEY), store.get(EDITION_KEY)]);
    pointer = parsePointer(pointerRaw);
    edition = editionRaw ?? "";
  } catch (error) {
    console.error("[catalog] cache unavailable:", error instanceof Error ? error.message : error);
    // Serve what we have rather than hammering a failing cache; otherwise build from the database.
    if (state.runtime) {
      state.checkedAt = Date.now() + CACHE_BACKOFF_MS - POINTER_RECHECK_MS;
      refreshIfStale();
      return state.runtime;
    }
    const rebuilt = await rebuildCatalog();
    state.checkedAt = Date.now() + CACHE_BACKOFF_MS - POINTER_RECHECK_MS;
    return rebuilt;
  }

  // The snapshot the cache points at was built before the last change (made here or by another instance).
  const pointerIsStale = pointer !== null && (pointer.edition ?? "") !== edition;

  if (pointer && state.runtime?.generation === pointer.generation) {
    if (pointerIsStale) state.runtimeEpoch = Math.min(state.runtimeEpoch, state.epoch - 1);
  } else if (pointer) {
    const held = state.runtime;
    const snapshot = await readGeneration(store, pointer).catch(() => null);
    // A rebuild that finished during that read is newer than what the read fetched.
    if (snapshot && state.runtime === held) {
      state.runtime = toRuntime(pointer.generation, snapshot);
      state.runtimeEpoch = pointerIsStale ? state.epoch - 1 : state.epoch;
      announcePhotos(state.runtime);
    }
  }

  if (state.runtime) {
    state.checkedAt = Date.now();
    refreshIfStale();
    return state.runtime;
  }

  // Nothing to serve at all: a first start with an empty cache.
  return rebuildCatalog();
}

/**
 * The catalog to serve: from memory, else from the cache, else built now.
 * After a change it is the previous snapshot for the few seconds the new one
 * takes to build.
 */
export function getCatalogRuntime(): Promise<CatalogRuntime> {
  if (state.runtime && Date.now() - state.checkedAt < POINTER_RECHECK_MS) {
    refreshIfStale();
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
 * Marks the catalog stale and starts rebuilding it. Call after any write that
 * changes what shoppers see: products, categories, filter settings. It does
 * not wait for the rebuild: the change shows in the shop a few seconds later,
 * and until then pages are served from the previous snapshot without delay.
 */
export async function invalidateCatalog(): Promise<void> {
  state.epoch += 1;

  try {
    // Tells other instances, and this one after a restart, that the cached snapshot is out of date.
    await getKeyValueStore().set(EDITION_KEY, `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  } catch (error) {
    console.error("[catalog] could not mark the cached snapshot as stale:", error instanceof Error ? error.message : error);
  }

  try {
    revalidateTag(CATALOG_TAG);
  } catch {
    // Outside a request scope (scripts, workers) there is no Next.js cache to revalidate.
  }

  refreshIfStale();
}

/** Tests only: a build reads from `load` instead of the database. */
export function setCatalogSourceForTests(load: () => Promise<SnapshotInput>): void {
  source.load = load;
}

/** Tests only: drops everything this process holds, as a restart would. The shared cache is left as it is. */
export function forgetCatalogForTests(): void {
  Object.assign(state, { runtime: null, runtimeEpoch: 0, checkedAt: 0, epoch: 0, resolving: null, building: null, lastBuildMs: null, refreshFailedAt: 0 });
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
