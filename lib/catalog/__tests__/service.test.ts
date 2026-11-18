import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";
import type { SnapshotInput } from "../snapshot";
import type { SourceProduct } from "../types";

// The service reads these when it is first loaded, so they are set before the import below.
process.env.CATALOG_CACHE_DRIVER = "memory";
process.env.CATALOG_POINTER_RECHECK_MS = "0"; // look at the shared cache on every read, as a second instance would
process.env.CATALOG_REFRESH_RETRY_MS = "0";

type Service = typeof import("../server/service");
let service: Service;
let store: import("../server/kv").KeyValueStore;

function product(name: string): SourceProduct {
  return {
    _id: `id-${name}`,
    id: `sku-${name}`,
    name,
    articleNumber: `art-${name}`,
    images: [`https://img.test/${name}.jpg`],
    isAvailable: true,
    quantity: 5,
    url: "",
    price: 100,
    priceToShow: 100,
    vendor: "Vendor",
    category: ["cat"],
    params: [],
    description: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    salesCount: 0,
  };
}

/** A stand-in for the database: what is "saved" now, and a gate that holds a read open like a slow query. */
const db = {
  names: ["Перший"],
  reads: 0,
  failNext: false,
  gate: null as Promise<void> | null,
  open: () => {},
  hold() {
    this.gate = new Promise<void>((resolve) => (this.open = resolve));
  },
  release() {
    this.open();
    this.gate = null;
  },
};

async function load(): Promise<SnapshotInput> {
  db.reads += 1;
  if (db.failNext) {
    db.failNext = false;
    throw new Error("database is away");
  }
  // The rows are taken now; a change made while the read is still open is not in them.
  const names = [...db.names];
  if (db.gate) await db.gate;
  return {
    products: names.map(product),
    categories: [{ name: "Категорія", categoryId: "cat", totalProducts: names.length, subCategories: [] }],
    filterSettings: {},
    filterDelay: 250,
  };
}

const titles = async () => (await service.getCatalogSnapshot()).listings.map((listing) => listing.title).sort();

/** The answer must come at once: it fails instead of waiting for a rebuild. */
async function atOnce<T>(promise: Promise<T>): Promise<T> {
  const late = Symbol("late");
  const result = await Promise.race([promise, new Promise<typeof late>((resolve) => setTimeout(() => resolve(late), 200))]);
  assert.notEqual(result, late, "the read waited for a rebuild");
  return result as T;
}

async function until(check: () => Promise<boolean>, what: string): Promise<void> {
  for (let i = 0; i < 200; i++) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail(`never happened: ${what}`);
}

describe("catalog service: a change never makes shoppers wait", () => {
  before(async () => {
    service = await import("../server/service");
    store = (await import("../server/kv")).getKeyValueStore();
    service.setCatalogSourceForTests(load);
  });

  beforeEach(async () => {
    db.release();
    service.forgetCatalogForTests();
    await store.del(["catalog:v5:current", "catalog:v5:edition"]);
    db.names = ["Перший"];
    db.reads = 0;
    db.failNext = false;
    // A catalog is in place before each case, as on a running shop.
    assert.deepEqual(await titles(), ["Перший"]);
  });

  it("builds once and then serves from memory and the cache", async () => {
    assert.equal(db.reads, 1);
    assert.deepEqual(await titles(), ["Перший"]);
    assert.equal(db.reads, 1);
  });

  it("serves the previous catalog while the new one is being built, then the new one", async () => {
    db.hold();
    db.names = ["Перший", "Другий"];
    await service.invalidateCatalog();

    // The rebuild is running (its database read is still open): pages get the previous catalog without delay.
    await until(async () => db.reads === 2, "the rebuild starts on its own, without a visitor");
    assert.deepEqual(await atOnce(titles()), ["Перший"]);
    assert.deepEqual(await atOnce(titles()), ["Перший"]);

    db.release();
    await until(async () => (await titles()).length === 2, "the new catalog replaces the previous one");
    assert.deepEqual(await titles(), ["Другий", "Перший"]);
    assert.equal(db.reads, 2, "one rebuild for one change");
  });

  it("does not lose a change saved while a rebuild is reading", async () => {
    db.hold();
    db.names = ["Перший", "Другий"];
    await service.invalidateCatalog();

    // A second save lands while the first rebuild still has its read open.
    await until(async () => db.reads === 2, "the first rebuild is reading");
    db.names = ["Перший", "Другий", "Третій"];
    await service.invalidateCatalog();
    assert.deepEqual(await atOnce(titles()), ["Перший"]);

    db.release();
    await until(async () => (await titles()).length === 3, "the catalog includes the later save");
  });

  it("after a restart serves the cached catalog at once and refreshes it when it predates the last change", async () => {
    // A save is recorded, but the process stops before its rebuild is published.
    db.hold();
    db.names = ["Перший", "Другий"];
    await service.invalidateCatalog();
    service.forgetCatalogForTests();
    db.gate = null; // the new process reads normally; the old read is never answered

    assert.deepEqual(await atOnce(titles()), ["Перший"], "the cached catalog is served, not rebuilt first");
    await until(async () => (await titles()).length === 2, "the restarted process refreshes the stale cached catalog");
  });

  it("a restarted process trusts a cached catalog that is up to date", async () => {
    service.forgetCatalogForTests();
    assert.deepEqual(await titles(), ["Перший"]);
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(db.reads, 1, "no rebuild: the cache already holds the current catalog");
  });

  it("keeps the previous catalog when a rebuild fails, and tries again", async () => {
    db.failNext = true;
    db.names = ["Перший", "Другий"];
    await service.invalidateCatalog();

    assert.deepEqual(await atOnce(titles()), ["Перший"]);
    await until(async () => (await titles()).length === 2, "the next read retries the rebuild");
  });

  it("an explicit rebuild returns the fresh catalog", async () => {
    db.names = ["Новий"];
    await service.invalidateCatalog();
    const { snapshot } = await service.rebuildCatalog();
    assert.deepEqual(snapshot.listings.map((listing) => listing.title), ["Новий"]);
  });
});
