import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { WorkQueue } from "./queue";
import { originalAddress, type PhotoRequest } from "./request";

/**
 * Resized photos for the shop.
 *
 * A photo that was resized before is read from disk and answered at once; it
 * never waits for anything. A photo that still has to be resized goes through
 * a queue that makes ONE at a time: a resize takes a whole processor core,
 * and the app has 1.5, so this is what keeps pages fast while photos are being
 * made. A visitor is never left waiting on that queue either: when the photo
 * cannot be ready within a couple of seconds, the browser is sent to the photo
 * as it was uploaded, and the resized copy is finished in the background for
 * the next visitor.
 *
 * The same queue also resizes photos ahead of time (lib/photo/filler.ts), in a
 * second line that moves only when no visitor is waiting.
 */

// One processor thread per resize: the page-building thread keeps the rest.
sharp.concurrency(1);

/** Kept in the same Docker volume as Next's own resized pictures, so releases do not empty it. */
const CACHE_DIR = process.env.PHOTO_CACHE_DIR || path.join(process.cwd(), process.env.NEXT_DIST_DIR || ".next", "cache", "images", "photos-v1");
const PUBLIC_DIR = path.join(process.cwd(), "public");

const RESIZE_CONCURRENCY = Math.max(1, Number(process.env.PHOTO_RESIZE_CONCURRENCY ?? 1));
/** A visitor waits this long for a photo being made, then gets the uploaded one instead. */
const WAIT_MS = Number(process.env.PHOTO_WAIT_MS ?? 2500);
/** With more jobs than this ahead, the wait would be longer than that anyway: answer with the uploaded photo at once. */
const WAIT_QUEUE = Number(process.env.PHOTO_WAIT_QUEUE ?? 8);
/** Resizes that may stand in line. Past this, new ones are not queued at all until the line shortens. */
const MAX_QUEUE = Number(process.env.PHOTO_MAX_QUEUE ?? 300);

const FETCH_TIMEOUT_MS = 10_000;
const MAX_SOURCE_BYTES = 40 * 1024 * 1024;
/** A resized copy untouched for this long gets its date refreshed when used, so the weekly clean-up keeps it. */
const TOUCH_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const LOG_INTERVAL_MS = 30_000;

const CONTENT_TYPES = { webp: "image/webp", jpg: "image/jpeg", png: "image/png" } as const;
type Extension = keyof typeof CONTENT_TYPES;

type Made = { file: string; extension: Extension } | { passThrough: true };

type PhotoState = {
  queue: WorkQueue<Made>;
  passThrough: Set<string>;
  lastLogAt: number;
  sentOriginals: number;
  /** When a visitor last asked for a photo that had to be made. */
  lastVisitorWorkAt: number;
  /** The last photo fetched, kept for the next size of the same photo. */
  lastSource: { id: string; body: Buffer } | null;
};
const globalForPhotos = globalThis as unknown as { __photoState?: PhotoState };
const state: PhotoState = (globalForPhotos.__photoState ??= {
  queue: new WorkQueue<Made>(RESIZE_CONCURRENCY),
  passThrough: new Set(),
  lastLogAt: 0,
  sentOriginals: 0,
  lastVisitorWorkAt: 0,
  lastSource: null,
});

export type PhotoAnswer =
  | { kind: "photo"; body: Buffer; contentType: string; etag: string; made: boolean; longLived: boolean }
  | { kind: "original"; location: string }
  | { kind: "missing" };

class SourceMissing extends Error {}

const hash = (text: string) => crypto.createHash("sha256").update(text).digest("hex");

function cacheFile(key: string, extension: Extension): string {
  return path.join(CACHE_DIR, key.slice(0, 2), `${key}.${extension}`);
}

async function readCached(key: string, extensions: Extension[]): Promise<{ body: Buffer; extension: Extension } | null> {
  for (const extension of extensions) {
    const file = cacheFile(key, extension);
    try {
      const body = await fs.readFile(file);
      void fs
        .stat(file)
        .then((info) => (Date.now() - info.mtimeMs > TOUCH_AFTER_MS ? fs.utimes(file, new Date(), new Date()) : undefined))
        .catch(() => undefined);
      return { body, extension };
    } catch {
      // not made yet in this format
    }
  }
  return null;
}

/** The file of a picture in the public folder; null when it is not there. */
async function localFile(pathname: string): Promise<{ file: string; version: string } | null> {
  const file = path.join(PUBLIC_DIR, ...pathname.split("/").filter(Boolean));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return null;
  try {
    const info = await fs.stat(file);
    return info.isFile() ? { file, version: `${info.size}-${Math.round(info.mtimeMs)}` } : null;
  } catch {
    return null;
  }
}

async function loadSource(request: PhotoRequest, local: { file: string } | null): Promise<Buffer> {
  if (request.source.kind === "local") {
    if (!local) throw new SourceMissing();
    return fs.readFile(local.file);
  }

  // Several sizes of one photo are usually made one after another: fetch it once.
  if (state.lastSource?.id === request.source.url) return state.lastSource.body;
  const body = await fetchSource(request.source.url);
  state.lastSource = { id: request.source.url, body };
  return body;
}

async function fetchSource(url: string): Promise<Buffer> {
  // No redirects are followed: the address was checked against the allowed hosts, a redirect target was not.
  const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (response.status === 404 || response.status === 410) throw new SourceMissing();
  if (!response.ok) throw new Error(`the photo storage answered ${response.status}`);
  if (Number(response.headers.get("content-length") ?? 0) > MAX_SOURCE_BYTES) throw new Error("the photo is too large");
  const body = Buffer.from(await response.arrayBuffer());
  if (body.length > MAX_SOURCE_BYTES) throw new Error("the photo is too large");
  return body;
}

async function make(request: PhotoRequest, key: string, local: { file: string } | null): Promise<Made> {
  const source = await loadSource(request, local);
  const meta = await sharp(source, { failOn: "none" }).metadata();
  // Animations are served as they are: resizing would keep only the first frame.
  if ((meta.pages ?? 1) > 1) return { passThrough: true };

  const image = sharp(source, { sequentialRead: true, failOn: "none" }).rotate().resize({ width: request.width, withoutEnlargement: true });
  let extension: Extension;
  if (request.format === "webp") {
    extension = "webp";
    image.webp({ quality: request.quality });
  } else if (meta.hasAlpha) {
    extension = "png";
    image.png({ quality: request.quality });
  } else {
    extension = "jpg";
    image.jpeg({ quality: request.quality, progressive: true });
  }
  const body = await image.toBuffer();

  const file = cacheFile(key, extension);
  await fs.mkdir(path.dirname(file), { recursive: true });
  // Written under another name first: a reader never finds half a file.
  const draft = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(draft, body);
  await fs.rename(draft, file);
  return { file, extension };
}

function noteOriginalSent(): void {
  state.sentOriginals += 1;
  const now = Date.now();
  if (now - state.lastLogAt < LOG_INTERVAL_MS) return;
  console.info(`[photo] busy: ${state.queue.size} resizes in line, ${state.sentOriginals} visitors were sent the uploaded photo instead of waiting`);
  state.lastLogAt = now;
  state.sentOriginals = 0;
}

function photoAnswer(body: Buffer, extension: Extension, key: string, made: boolean, request: PhotoRequest): PhotoAnswer {
  // A stored photo never changes under its address; a picture from the public folder can change with a release.
  return { kind: "photo", body, contentType: CONTENT_TYPES[extension], etag: `"${key.slice(0, 32)}"`, made, longLived: request.source.kind === "remote" };
}

type Located = { key: string; local: { file: string; version: string } | null; extensions: Extension[] };

/** Where the resized copy of this request lives. Null when it is a local picture that does not exist. */
async function locate(request: PhotoRequest): Promise<Located | null> {
  const local = request.source.kind === "local" ? await localFile(request.source.path) : null;
  if (request.source.kind === "local" && !local) return null;
  const identity = request.source.kind === "local" ? `${request.source.path}#${local?.version}` : request.source.url;
  return {
    key: hash(`${identity}|${request.width}|${request.quality}|${request.format}`),
    local,
    extensions: request.format === "webp" ? ["webp"] : ["jpg", "png"],
  };
}

/** Answers one request for a resized photo. Never throws. */
export async function servePhoto(request: PhotoRequest): Promise<PhotoAnswer> {
  const original: PhotoAnswer = { kind: "original", location: originalAddress(request.source) };
  try {
    const located = await locate(request);
    if (!located) return { kind: "missing" };
    const { key, local, extensions } = located;
    if (state.passThrough.has(key)) return original;

    const cached = await readCached(key, extensions);
    if (cached) return photoAnswer(cached.body, cached.extension, key, false, request);

    // Not made yet. A visitor is waiting: this goes to the urgent line, ahead of everything made in advance.
    state.lastVisitorWorkAt = Date.now();
    const ahead = state.queue.urgent;
    if (!state.queue.get(key) && ahead >= MAX_QUEUE) {
      noteOriginalSent();
      return original;
    }
    const job = state.queue.run(key, () => make(request, key, local), "urgent");
    // The job outlives a visitor who stops waiting; its failure is reported to those still waiting, not to the process.
    job.catch(() => undefined);
    if (ahead > WAIT_QUEUE) {
      noteOriginalSent();
      return original;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const made = await Promise.race([job, new Promise<null>((resolve) => (timer = setTimeout(() => resolve(null), WAIT_MS)))]).finally(() => clearTimeout(timer));
    if (!made) {
      noteOriginalSent();
      return original;
    }
    if ("passThrough" in made) {
      state.passThrough.add(key);
      return original;
    }
    return photoAnswer(await fs.readFile(made.file), made.extension, key, true, request);
  } catch (error) {
    if (error instanceof SourceMissing) return { kind: "missing" };
    const now = Date.now();
    if (now - state.lastLogAt > LOG_INTERVAL_MS) {
      state.lastLogAt = now;
      console.error("[photo] could not resize, sending the uploaded photo:", error instanceof Error ? error.message : error);
    }
    return original;
  }
}

/** True while a visitor is waiting for a photo, or one was a moment ago (the rest of that page's photos are on their way). */
export function visitorsAreWaiting(quietMs: number): boolean {
  return state.queue.urgent > 0 || Date.now() - state.lastVisitorWorkAt < quietMs;
}

export type FillResult = "ready" | "made" | "skipped" | "failed";

/**
 * Makes one resized photo ahead of time, in the background line: it runs only
 * when no visitor's photo is waiting. "ready" means it was already there.
 */
export async function fillPhoto(request: PhotoRequest): Promise<FillResult> {
  try {
    const located = await locate(request);
    if (!located || state.passThrough.has(located.key)) return "skipped";
    const { key, local, extensions } = located;
    try {
      await fs.access(cacheFile(key, extensions[0]));
      return "ready";
    } catch {
      // not made yet
    }
    const made = await state.queue.run(key, () => make(request, key, local), "background");
    if ("passThrough" in made) {
      state.passThrough.add(key);
      return "skipped";
    }
    return "made";
  } catch {
    return "failed";
  }
}
