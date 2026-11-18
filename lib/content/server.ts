import { unstable_cache } from "next/cache";
import { headers } from "next/headers";
import { cache } from "react";
import { getSessionUser, isStaffRole } from "@/lib/auth/guards";
import { Store } from "@/constants/store";
import Page from "@/lib/models/page.model";
import SiteContent from "@/lib/models/site-content.model";
import { connectToDB } from "@/lib/mongoose";
import { PRIVACY_POLICY_TEXT, PUBLIC_OFFER_TEXT } from "./legal";
import { CONTENT_PAGES, amountLabel, cleanContent, contentPage, defaultsFor, type ContentKey, type ContentPage, type ContentValues } from "./schema";
import {
  VARIABLES_KEY,
  applyVariables,
  legacyContacts,
  mergeVariables,
  usedNames,
  variableMap,
  type ContactKey,
  type VariableValues,
} from "./variables";

/**
 * Reading and saving the editable texts of the storefront. Server-only.
 *
 * Pages read through getContent(): one cached read of all edited pages, shared
 * by every page of the site and dropped when something is saved. If the
 * database cannot be reached the site shows the default texts: content must
 * never take a page down.
 */

export const CONTENT_TAG = "site-content";

/** Defaults that are too long for the schema file. */
const LONG_DEFAULTS: Partial<Record<ContentKey, ContentValues>> = {
  offer: { body: PUBLIC_OFFER_TEXT },
  privacy: { body: PRIVACY_POLICY_TEXT },
};

export function contentDefaults(page: ContentPage): ContentValues {
  return defaultsFor(page, LONG_DEFAULTS[page.key]);
}

type Stored = Record<string, { values: unknown; updatedAt: string | null; updatedBy: string }>;

const readStored = unstable_cache(
  async (): Promise<Stored> => {
    await connectToDB();
    const rows = await SiteContent.find({}).select("key values updatedAt updatedBy").lean<{ key: string; values: unknown; updatedAt?: Date; updatedBy?: string }[]>();
    const stored: Stored = {};
    for (const row of rows) {
      if (!row.updatedBy) continue; // only a preview draft, nothing saved
      stored[row.key] = { values: row.values, updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null, updatedBy: row.updatedBy ?? "" };
    }
    return stored;
  },
  ["site-content"],
  { tags: [CONTENT_TAG] },
);

const stored = cache(async (): Promise<Stored> => {
  try {
    return await readStored();
  } catch (error) {
    console.error("[content]", error instanceof Error ? error.message : error);
    return {};
  }
});

/** A draft older than this is somebody's abandoned editing session and is not shown. */
const DRAFT_LIFETIME_MS = 6 * 60 * 60 * 1000;

/**
 * True for a request of the page editor's preview frame made by an
 * administrator: middleware.ts marks it, the session is checked here. Such a
 * request sees the texts being typed in the editor instead of the saved ones.
 */
export const previewing = cache(async (): Promise<boolean> => {
  try {
    if (headers().get("x-content-preview") !== "1") return false;
    const user = await getSessionUser();
    return Boolean(user && isStaffRole(user.role));
  } catch {
    // No request (a build, a script): there is nothing to preview.
    return false;
  }
});

/**
 * The document whose unsaved copy this preview shows: the page (or the
 * variables) open in the editor that made the request. Only that one: an
 * editing session somebody abandoned on another page must not show up here.
 */
const draftKey = cache(async (): Promise<string> => {
  if (!(await previewing())) return "";
  try {
    return headers().get("x-content-draft") ?? "";
  } catch {
    return "";
  }
});

const drafts = cache(async (): Promise<Record<string, unknown>> => {
  await connectToDB();
  const rows = await SiteContent.find({ draftAt: { $gt: new Date(Date.now() - DRAFT_LIFETIME_MS) } }).select("key draft").lean<{ key: string; draft?: unknown }[]>();
  return Object.fromEntries(rows.filter((row) => row.draft && typeof row.draft === "object").map((row) => [row.key, row.draft]));
});

/** The texts of one page as written: the names of variables are still in them. */
async function readContent<T extends ContentValues = ContentValues>(key: ContentKey): Promise<T> {
  const page = contentPage(key)!;
  const defaults = contentDefaults(page);
  if ((await draftKey()) === key) {
    const draft = (await drafts())[key];
    // As typed, limits not enforced: the preview shows what the editor holds.
    if (draft) return cleanContent(page, draft, { strict: true, fallback: defaults }).values as T;
  }
  const saved = (await stored())[key];
  if (!saved) return defaults as T;
  return cleanContent(page, saved.values, { strict: false, fallback: defaults }).values as T;
}

/** The texts of one page: what was saved in the admin, the defaults for the rest, the values of the variables put in. */
export async function getContent<T extends ContentValues = ContentValues>(key: ContentKey): Promise<T> {
  return applyVariables(await readContent<T>(key), await getVariableMap());
}

/** The order sum from which delivery is free; 0 when free delivery is switched off. */
export async function getFreeDelivery(): Promise<number> {
  const { freeDelivery } = await readContent<{ freeDelivery: number }>("delivery");
  return Number.isFinite(freeDelivery) && freeDelivery > 0 ? freeDelivery : 0;
}

/* ------------------------------------------------------------------ */
/* Variables (./variables.ts)                                          */
/* ------------------------------------------------------------------ */

type LegacyContacts = Partial<Record<ContactKey, string>>;

async function findLegacyContacts(): Promise<LegacyContacts> {
  await connectToDB();
  const page = await Page.findOne({ name: "Contacts" }).select("dataInputs").lean<{ dataInputs?: unknown }>();
  return legacyContacts(page?.dataInputs);
}

/**
 * The contacts as they were kept before variables existed: the "Contacts"
 * record of the old page editor. Read so that a shop which has not saved its
 * settings yet (or has not run tools/migrate-contacts-to-variables.mjs) shows
 * the same phone and e-mail as before.
 */
const readLegacyContacts = unstable_cache(findLegacyContacts, ["site-content-legacy-contacts"], { tags: [CONTENT_TAG] });

const legacy = cache(async (): Promise<LegacyContacts> => {
  try {
    return await readLegacyContacts();
  } catch (error) {
    console.error("[content]", error instanceof Error ? error.message : error);
    return {};
  }
});

/** The contacts of the shop and the admin's own variables ("Налаштування"). */
export const getVariables = cache(async (): Promise<VariableValues> => mergeVariables((await stored())[VARIABLES_KEY]?.values, await legacy()).values);

const computedVariables = cache(async () => {
  const amount = await getFreeDelivery();
  return { store: Store.name, year: new Date().getFullYear(), amount: amount > 0 ? amountLabel(amount) : "" };
});

/** Name to value, for putting into a text. */
export const getVariableMap = cache(async (): Promise<Record<string, string>> => variableMap(await getVariables(), await computedVariables()));

/** For the admin editor: straight from the database, with a note of what came from the old record. */
export async function getVariablesForEditor(): Promise<{ values: VariableValues; fromLegacy: ContactKey[]; saved: boolean; updatedAt: string | null; updatedBy: string }> {
  await connectToDB();
  const row = await SiteContent.findOne({ key: VARIABLES_KEY }).select("values updatedAt updatedBy").lean<{ values: unknown; updatedAt?: Date; updatedBy?: string }>();
  const saved = Boolean(row?.updatedBy);
  const { values, fromLegacy } = mergeVariables(saved ? row?.values : undefined, await findLegacyContacts());
  return { values, fromLegacy, saved, updatedAt: saved && row?.updatedAt ? new Date(row.updatedAt).toISOString() : null, updatedBy: row?.updatedBy ?? "" };
}

export async function storeVariables(values: VariableValues, by: string): Promise<void> {
  await connectToDB();
  await SiteContent.updateOne({ key: VARIABLES_KEY }, { $set: { values, updatedBy: by } }, { upsert: true });
}

/** Titles of the saved pages whose texts name each of the given variables. */
export async function variableUsage(names: string[]): Promise<Record<string, string[]>> {
  const usage: Record<string, string[]> = {};
  if (names.length === 0) return usage;
  await connectToDB();
  const rows = await SiteContent.find({ key: { $in: CONTENT_PAGES.map((page) => page.key) }, updatedBy: { $nin: [null, ""] } }).select("key values").lean<{ key: string; values: unknown }[]>();
  for (const row of rows) {
    const page = contentPage(row.key);
    if (!page) continue;
    const used = usedNames(cleanContent(page, row.values, { strict: false, fallback: contentDefaults(page) }).values);
    for (const name of names) if (used.has(name)) (usage[name] ??= []).push(page.title);
  }
  return usage;
}

/** For the admin editor: the current texts, the defaults, and who changed the page last. */
export async function getContentForEditor(key: ContentKey): Promise<{ values: ContentValues; defaults: ContentValues; edited: boolean; updatedAt: string | null; updatedBy: string }> {
  const page = contentPage(key)!;
  const defaults = contentDefaults(page);
  // Straight from the database: the editor must show what is saved, not a cached copy.
  await connectToDB();
  const row = await SiteContent.findOne({ key }).select("values updatedAt updatedBy").lean<{ values: unknown; updatedAt?: Date; updatedBy?: string }>();
  // A document without an author holds only a preview draft: the page itself was never saved.
  if (!row || !row.updatedBy) return { values: defaults, defaults, edited: false, updatedAt: null, updatedBy: "" };
  return {
    values: cleanContent(page, row.values, { strict: false, fallback: defaults }).values,
    defaults,
    edited: true,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
    updatedBy: row.updatedBy ?? "",
  };
}

/** Which pages have been edited, for the list in the admin. */
export async function editedContentKeys(): Promise<Set<string>> {
  await connectToDB();
  const rows = await SiteContent.find({ updatedBy: { $nin: [null, ""] } }).select("key").lean<{ key: string }[]>();
  return new Set(rows.map((row) => row.key));
}

export async function storeContent(key: ContentKey, values: ContentValues, by: string): Promise<void> {
  await connectToDB();
  await SiteContent.updateOne({ key }, { $set: { values, updatedBy: by } }, { upsert: true });
}

export async function removeContent(key: ContentKey): Promise<void> {
  await connectToDB();
  await SiteContent.deleteOne({ key });
}

/** What the editor holds right now, for the preview frame only. Never shown to customers. */
export async function storeDraft(key: string, draft: unknown): Promise<void> {
  await connectToDB();
  await SiteContent.updateOne({ key }, { $set: { draft, draftAt: new Date() } }, { upsert: true });
}

export async function removeDraft(key: string): Promise<void> {
  await connectToDB();
  await SiteContent.updateOne({ key }, { $unset: { draft: "", draftAt: "" } });
  // A page that was only ever drafted has nothing left to keep.
  await SiteContent.deleteOne({ key, values: { $in: [null, {}] }, draft: { $exists: false }, updatedBy: { $in: [null, ""] } });
}

/* ------------------------------------------------------------------ */
/* Settings of the shop that are not page texts                        */
/* ------------------------------------------------------------------ */

/** A saved setting (the menu, the brand list, the policies), or null when it was never saved. Part of the same cached read as the texts. */
export async function getSetting(key: string): Promise<{ values: unknown; updatedAt: string | null; updatedBy: string } | null> {
  return (await stored())[key] ?? null;
}

export async function storeSetting(key: string, values: unknown, by: string): Promise<void> {
  await connectToDB();
  await SiteContent.updateOne({ key }, { $set: { values, updatedBy: by } }, { upsert: true });
}

export async function removeSetting(key: string): Promise<void> {
  await connectToDB();
  await SiteContent.deleteOne({ key });
}

export { CONTENT_PAGES };
