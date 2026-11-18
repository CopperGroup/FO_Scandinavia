import Setting from "@/lib/models/setting.model";
import { connectToDB } from "@/lib/mongoose";
import { canSealSecrets, maskSecret, openSecret, sealSecret } from "@/lib/secrets";

/**
 * The Nova Poshta API key. Server-only: nothing here may be imported by a
 * client component, and the key itself never leaves this module except to the
 * two functions that talk to Nova Poshta.
 *
 * Where the key comes from, in order:
 *   1. the key the owner pasted on the "Доставка" page (sealed in the database);
 *   2. the NOVA_POSHTA_API_KEY environment variable, as a fallback.
 *
 * Every place that needs the key calls getNovaPoshtaKey(); nothing else reads
 * the environment variable.
 */

export const NOVA_POSHTA_KEY_NAME = "novaposhta.apiKey";

/** How long an opened key is kept in memory before the database is asked again. */
const CACHE_MS = 60_000;
/** "No key saved" is remembered for less: a key added from outside (the migration script) shows up quickly. */
const CACHE_EMPTY_MS = 10_000;

export type KeySource = "saved" | "env" | "missing";

type Resolved = {
  key: string;
  source: KeySource;
  /** A key is saved, but this server cannot open it (the sealing secret changed). */
  unreadable: boolean;
  updatedAt: Date | null;
  updatedBy: string;
};

const globalForKey = globalThis as unknown as { __novaPoshtaKey?: { value: Resolved; expires: number } | null };

/** Drops the copy kept in memory. Called after the key is saved or deleted. */
export function forgetNovaPoshtaKey(): void {
  globalForKey.__novaPoshtaKey = null;
}

function fromEnvironment(): string {
  return process.env.NOVA_POSHTA_API_KEY?.trim() ?? "";
}

async function resolve(): Promise<Resolved> {
  const kept = globalForKey.__novaPoshtaKey;
  if (kept && kept.expires > Date.now()) return kept.value;

  let saved: { sealed?: string; updatedAt?: Date; updatedBy?: string } | null = null;
  try {
    await connectToDB();
    saved = await Setting.findOne({ key: NOVA_POSHTA_KEY_NAME }).select("sealed updatedAt updatedBy").lean<{ sealed?: string; updatedAt?: Date; updatedBy?: string }>();
  } catch {
    // The database is unreachable: use the environment for now and ask again on the next call.
    const key = fromEnvironment();
    return { key, source: key ? "env" : "missing", unreadable: false, updatedAt: null, updatedBy: "" };
  }

  const opened = saved?.sealed ? openSecret(saved.sealed) : null;
  const env = fromEnvironment();
  const value: Resolved = opened
    ? { key: opened, source: "saved", unreadable: false, updatedAt: saved?.updatedAt ?? null, updatedBy: saved?.updatedBy ?? "" }
    : { key: env, source: env ? "env" : "missing", unreadable: Boolean(saved?.sealed), updatedAt: null, updatedBy: "" };

  globalForKey.__novaPoshtaKey = { value, expires: Date.now() + (opened ? CACHE_MS : CACHE_EMPTY_MS) };
  return value;
}

/** The key to call Nova Poshta with; an empty string when none is set. */
export async function getNovaPoshtaKey(): Promise<string> {
  return (await resolve()).key;
}

export type KeyStatus = {
  source: KeySource;
  /** Last four characters behind dots; empty when there is no key. */
  mask: string;
  unreadable: boolean;
  updatedAt: string | null;
  updatedBy: string;
  /** False when the server has no secret to seal with, so a key cannot be saved from the admin. */
  canSeal: boolean;
  /** A key is also set in the server environment (it takes over when the saved one is deleted). */
  envFallback: boolean;
};

/** What the delivery page may show about the key. Never the key itself. */
export async function novaPoshtaKeyStatus(): Promise<KeyStatus> {
  const resolved = await resolve();
  return {
    source: resolved.source,
    mask: resolved.key ? maskSecret(resolved.key) : "",
    unreadable: resolved.unreadable,
    updatedAt: resolved.updatedAt ? new Date(resolved.updatedAt).toISOString() : null,
    updatedBy: resolved.updatedBy,
    canSeal: canSealSecrets(),
    envFallback: Boolean(fromEnvironment()),
  };
}

/**
 * Tidies a pasted key and says whether it can be one. Nova Poshta keys are a
 * run of Latin letters and digits (32 of them at the time of writing).
 */
export function readPastedKey(raw: unknown): { ok: true; key: string } | { ok: false; error: string } {
  const key = typeof raw === "string" ? raw.replace(/\s+/g, "") : "";
  if (!key) return { ok: false, error: "Вставте ключ." };
  if (!/^[A-Za-z0-9]{24,64}$/.test(key)) {
    return { ok: false, error: "Це не схоже на ключ Нової пошти: він складається лише з латинських літер і цифр (зазвичай 32 символи). Скопіюйте його з кабінету повністю." };
  }
  return { ok: true, key };
}

/** Seals the key and stores it. The caller has already checked who is asking. */
export async function storeNovaPoshtaKey(key: string, by: string): Promise<void> {
  const sealed = sealSecret(key);
  await connectToDB();
  await Setting.updateOne({ key: NOVA_POSHTA_KEY_NAME }, { $set: { sealed, updatedBy: by } }, { upsert: true });
  forgetNovaPoshtaKey();
}

/** Removes the saved key. Returns false when there was none. */
export async function removeNovaPoshtaKey(): Promise<boolean> {
  await connectToDB();
  const result = await Setting.deleteOne({ key: NOVA_POSHTA_KEY_NAME });
  forgetNovaPoshtaKey();
  return result.deletedCount > 0;
}
