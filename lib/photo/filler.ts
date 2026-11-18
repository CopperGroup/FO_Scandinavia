import { DEFAULT_QUALITY, isResizable, parsePhotoSource, type PhotoRequest } from "./request";

/**
 * Resizes the shop's photos ahead of visitors.
 *
 * It follows the catalog: every time the catalog is (re)built it gets the list
 * of photos on sale and makes the sizes browsers ask for that do not exist
 * yet. So a new product's photos are ready soon after it is saved, and after a
 * release nothing has to be done by hand.
 *
 * It is strictly second in line. A photo a visitor asked for is always made
 * first (the urgent line of lib/photo/queue.ts); this job makes one photo at a
 * time, only while no visitor is waiting and none was a moment ago, and rests
 * after each one so the processor is mostly left to the shop.
 *
 * On in production; PHOTO_FILL=off switches it off, PHOTO_FILL=on forces it on elsewhere.
 * PHOTO_FILL_HOURS=1-7 keeps it to those hours of the Kyiv day (from 01:00 until 07:00).
 * That is for the time the pages still take their pictures from Next's own
 * /_next/image (NEXT_PUBLIC_PHOTO_ROUTE off): those visitors do not pass through
 * this queue, so the job cannot see them and step aside.
 */

const ENABLED = process.env.PHOTO_FILL === "on" || (process.env.NODE_ENV === "production" && process.env.PHOTO_FILL !== "off");
/** Rest after each photo that had to be made. */
const PAUSE_MS = Number(process.env.PHOTO_FILL_PAUSE_MS ?? 400);
/** How long after a visitor's last unmade photo the job stays out of the way. */
const QUIET_MS = Number(process.env.PHOTO_FILL_QUIET_MS ?? 2000);
/** Wait after the catalog changes before starting: several saves in a row make one pass. */
const START_DELAY_MS = Number(process.env.PHOTO_FILL_START_MS ?? 20_000);
/** For trials: stop a pass after this many photos were made. */
const LIMIT = Number(process.env.PHOTO_FILL_LIMIT ?? 0);
/** Hours of the Kyiv day the job may work in: "1-7", or "22-6" across midnight. Empty: any time. */
const HOURS = /^(\d{1,2})-(\d{1,2})$/.exec((process.env.PHOTO_FILL_HOURS ?? "").trim());

/** Whether the job may work at this moment. */
export function withinFillHours(now: Date, hours: RegExpExecArray | null = HOURS): boolean {
  if (!hours) return true;
  const from = Number(hours[1]) % 24;
  const until = Number(hours[2]) % 24;
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Kyiv", hour: "2-digit", hourCycle: "h23" }).format(now));
  return from <= until ? hour >= from && hour < until : hour >= from || hour < until;
}

/** A photo that could not be made (a dead link of an old import) is tried again after this long. */
const RETRY_FAILED_MS = 24 * 60 * 60 * 1000;

/** After this many failures in a row from one site (an old import whose site is gone), its photos are left for the next pass. */
const HOST_GIVE_UP = 8;

/** First photo of every catalog card: thumbnails, cards on desktop and phone, the product page on a phone. */
const CARD_WIDTHS = [64, 256, 320, 420, 640, 828];
/** Every other photo of a product on sale: gallery thumbnails and the large view. */
const GALLERY_WIDTHS = [96, 640, 828];

type Task = { url: string; width: number };
type CatalogPhotos = { listings: { image: string | null; hoverImage?: string | null }[] };

type FillerState = {
  generation: number;
  running: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  latest: CatalogPhotos | null;
  /** Sizes known to exist. */
  done: Set<string>;
  /** Sizes that could not be made, and when. */
  failed: Map<string, number>;
};
const globalForFiller = globalThis as unknown as { __photoFiller?: FillerState };
const state: FillerState = (globalForFiller.__photoFiller ??= { generation: 0, running: false, timer: null, latest: null, done: new Set(), failed: new Map() });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Every photo of the products on sale, straight from the database (the catalog only knows the first one). */
async function galleryPhotos(): Promise<string[]> {
  try {
    const [{ default: Product }, { connectToDB }] = await Promise.all([import("@/lib/models/product.model"), import("@/lib/mongoose")]);
    await connectToDB();
    const rows = await Product.find({ isAvailable: true }).select("images").lean<{ images?: unknown[] }[]>();
    return rows.flatMap((row) => (row.images ?? []).filter((image): image is string => typeof image === "string" && image.length > 0));
  } catch (error) {
    console.error("[photo] could not list the product galleries:", error instanceof Error ? error.message : error);
    return [];
  }
}

/** What to make, most visible first: the catalog's cards, then the galleries. Sizes of one photo stay together. */
export function fillPlan(cards: string[], gallery: string[]): Task[] {
  const tasks: Task[] = [];
  const seen = new Set<string>();
  const add = (urls: string[], widths: number[]) => {
    for (const url of urls) {
      if (!isResizable(url) || !parsePhotoSource(url)) continue;
      for (const width of widths) {
        const id = `${url}|${width}`;
        if (seen.has(id)) continue;
        seen.add(id);
        tasks.push({ url, width });
      }
    }
  };
  add(cards, CARD_WIDTHS);
  add(gallery, GALLERY_WIDTHS);
  return tasks;
}

async function pass(generation: number, catalog: CatalogPhotos): Promise<void> {
  const { fillPhoto, visitorsAreWaiting } = await import("./server");
  const cards = catalog.listings.flatMap((listing) => [listing.image, listing.hoverImage]).filter((image): image is string => Boolean(image));
  const tasks = fillPlan(cards, await galleryPhotos());

  const startedAt = Date.now();
  let made = 0;
  let failed = 0;
  const failuresInARow = new Map<string, number>();
  const hostOf = (url: string) => (url.startsWith("/") ? "" : new URL(url).host);
  for (const task of tasks) {
    if (generation !== state.generation) return; // the catalog changed: a new pass takes over
    if (LIMIT > 0 && made >= LIMIT) break;

    const id = `${task.url}|${task.width}`;
    if (state.done.has(id)) continue;
    const failedAt = state.failed.get(id);
    if (failedAt && Date.now() - failedAt < RETRY_FAILED_MS) continue;

    // Only in its hours, when it was given any.
    while (!withinFillHours(new Date())) {
      await sleep(60_000);
      if (generation !== state.generation) return;
    }
    // Visitors first: stay out while any of their photos is being made or was a moment ago.
    while (visitorsAreWaiting(QUIET_MS)) await sleep(500);

    const source = parsePhotoSource(task.url);
    if (!source) continue;
    const host = hostOf(task.url);
    if ((failuresInARow.get(host) ?? 0) >= HOST_GIVE_UP) continue;
    const request: PhotoRequest = { source, width: task.width, quality: DEFAULT_QUALITY, format: "webp" };
    const result = await fillPhoto(request);
    if (result === "ready" || result === "skipped") {
      state.done.add(id);
      continue;
    }
    if (result === "made") {
      state.done.add(id);
      state.failed.delete(id);
      failuresInARow.set(host, 0);
      made += 1;
      if (made % 1000 === 0) console.info(`[photo] resizing ahead: ${made} made so far`);
    } else {
      state.failed.set(id, Date.now());
      failuresInARow.set(host, (failuresInARow.get(host) ?? 0) + 1);
      failed += 1;
    }
    await sleep(PAUSE_MS);
  }
  if (made > 0 || failed > 0) {
    console.info(`[photo] resized ahead: ${made} made, ${failed} could not be made, ${tasks.length} sizes of ${new Set(tasks.map((task) => task.url)).size} photos checked in ${Math.round((Date.now() - startedAt) / 1000)}s`);
  }
}

async function run(): Promise<void> {
  if (state.running) return;
  state.running = true;
  try {
    // A pass that was overtaken by a catalog change ends early; the newer catalog then gets its own.
    for (let generation = -1; generation !== state.generation && state.latest; ) {
      generation = state.generation;
      await pass(generation, state.latest);
    }
  } catch (error) {
    console.error("[photo] resizing ahead stopped:", error instanceof Error ? error.message : error);
  } finally {
    state.running = false;
  }
}

/** Called by the catalog service whenever it has a (new) catalog. */
export function catalogPhotosChanged(catalog: CatalogPhotos): void {
  if (!ENABLED) return;
  state.latest = catalog;
  state.generation += 1;
  if (state.timer) clearTimeout(state.timer);
  state.timer = setTimeout(() => {
    state.timer = null;
    void run();
  }, START_DELAY_MS);
  // The timer alone must not keep a script or a test alive.
  state.timer.unref?.();
}
