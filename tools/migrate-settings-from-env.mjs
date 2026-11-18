#!/usr/bin/env node
/**
 * Moves the Nova Poshta settings from an env file into the database, where the
 * admin panel ("Доставка" → "Відправник") keeps them. After that the server
 * no longer needs those variables and the owner can change the values alone.
 *
 *   SETTINGS_MONGODB_URL="mongodb://127.0.0.1:27018/nordiva_local?replicaSet=rs-local&directConnection=true" \
 *     node tools/migrate-settings-from-env.mjs                 # dry run: reports, writes nothing
 *     node tools/migrate-settings-from-env.mjs --apply         # writes
 *     node tools/migrate-settings-from-env.mjs --env path/to/.env.production --apply
 *
 * What it moves:
 *   NOVA_POSHTA_API_KEY      -> collection "settings", sealed (AES-256-GCM), never in plain text
 *   NOVA_SENDER_REF          -> sender code          (store document, delivery.novapost.sender)
 *   NOVA_SENDER_CONTACT_REF  -> contact person code
 *   NOVA_SENDER_PHONE        -> sender phone
 *
 * The key is sealed with the same secret the app uses: SETTINGS_SECRET, or
 * ENCRYPTION_KEY, or NEXTAUTH_SECRET (the first that is set) taken from the
 * SAME env file. The running server must have that same variable with that
 * same value, otherwise it cannot open the key; so point --env at the file
 * the server is really deployed with.
 *
 * A value already saved in the admin is kept; --force replaces it.
 * Running it twice changes nothing the second time.
 *
 * The database URL comes only from SETTINGS_MONGODB_URL (never from the env
 * file). A non-local host is refused unless --allow-remote is passed as well.
 * The key itself is never printed, only its last four characters.
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { maskSecret, openSecret, pickSecret, sealSecret } from "./settings-seal.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
let mongodb;
try {
  mongodb = createRequire(path.join(here, "local-db") + "/")("mongodb");
} catch {
  mongodb = createRequire(path.join(here, "..") + "/")("mongodb");
}
const { MongoClient } = mongodb;

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((arg) => arg.startsWith("--")));
const APPLY = flags.has("--apply");
const FORCE = flags.has("--force");
const envIndex = argv.indexOf("--env");
const envPath = path.resolve(envIndex >= 0 && argv[envIndex + 1] ? argv[envIndex + 1] : ".env.local");

const KEY_NAME = "novaposhta.apiKey";
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SENDER_FIELDS = [
  { variable: "NOVA_SENDER_REF", field: "counterpartyRef", label: "sender code", valid: (value) => GUID.test(value) },
  { variable: "NOVA_SENDER_CONTACT_REF", field: "contactRef", label: "contact person code", valid: (value) => GUID.test(value) },
  { variable: "NOVA_SENDER_PHONE", field: "phone", label: "sender phone", valid: (value) => value.replace(/\D/g, "").length >= 10 },
];

function fail(message) {
  console.error(message);
  process.exit(2);
}

/* ---- where to write ---- */
const url = process.env.SETTINGS_MONGODB_URL;
if (!url) fail("SETTINGS_MONGODB_URL is not set. Refusing to run (there is no default on purpose).");
const host = (() => {
  try {
    return new URL(url.replace(/^mongodb(\+srv)?:/, "http:")).hostname;
  } catch {
    return "";
  }
})();
if (!["127.0.0.1", "localhost", "::1"].includes(host) && !flags.has("--allow-remote")) {
  fail(`Host "${host}" is not local. Pass --allow-remote as well if you really mean it.`);
}

/* ---- what to move ---- */
if (!fs.existsSync(envPath)) fail(`Env file not found: ${envPath}`);
const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
  if (!match || line.trim().startsWith("#")) continue;
  env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
}

const apiKey = (env.NOVA_POSHTA_API_KEY ?? "").replace(/\s+/g, "");
const secret = pickSecret(env);

const client = new MongoClient(url);
await client.connect();
const db = client.db();
console.log(`${APPLY ? "APPLYING to" : "Dry run on"} ${host}/${db.databaseName}, values from ${path.basename(envPath)}`);

const movable = [];
let wrote = 0;
try {
  /* 1. The API key. */
  if (!apiKey) {
    console.log("NOVA_POSHTA_API_KEY: not in the env file, nothing to move");
  } else if (!/^[A-Za-z0-9]{24,64}$/.test(apiKey)) {
    console.log("NOVA_POSHTA_API_KEY: does not look like a Nova Poshta key (letters and digits only), skipped");
  } else if (!secret) {
    console.log("NOVA_POSHTA_API_KEY: NOT moved, the env file has none of SETTINGS_SECRET / ENCRYPTION_KEY / NEXTAUTH_SECRET to seal it with");
  } else {
    const settings = db.collection("settings");
    const existing = await settings.findOne({ key: KEY_NAME });
    const opened = existing ? openSecret(existing.sealed, secret.value) : null;
    const describe = `${maskSecret(apiKey)} sealed with ${secret.name}`;
    if (existing && opened === apiKey) {
      console.log(`NOVA_POSHTA_API_KEY: already saved (${maskSecret(apiKey)}), nothing to do`);
      movable.push("NOVA_POSHTA_API_KEY");
    } else if (existing && !FORCE) {
      console.log(
        opened
          ? `NOVA_POSHTA_API_KEY: a different key is saved in the admin (${maskSecret(opened)}); kept. Pass --force to replace it with ${maskSecret(apiKey)}.`
          : `NOVA_POSHTA_API_KEY: a key is saved in the admin, but ${secret.name} from this env file does not open it; kept. Pass --force to replace it.`,
      );
    } else {
      console.log(`NOVA_POSHTA_API_KEY: ${APPLY ? "saving" : "would save"} ${describe}${existing ? " (replacing the saved one)" : ""}`);
      if (APPLY) {
        const now = new Date();
        await settings.updateOne(
          { key: KEY_NAME },
          { $set: { sealed: sealSecret(apiKey, secret.value), updatedBy: "перенесено з налаштувань сервера", updatedAt: now }, $setOnInsert: { createdAt: now } },
          { upsert: true },
        );
        wrote += 1;
      }
      movable.push("NOVA_POSHTA_API_KEY");
    }
  }

  /* 2. The sender data, kept in the store document's `local` JSON. */
  const stores = db.collection("stores");
  const store = await stores.findOne({}, { projection: { local: 1 } });
  let local = {};
  try {
    local = JSON.parse(store?.local || "{}") ?? {};
  } catch {
    local = {};
  }
  local.delivery ??= {};
  local.delivery.novapost ??= {};
  local.delivery.novapost.warehouses ??= [];
  const sender = (local.delivery.novapost.sender ??= {});

  let senderChanged = false;
  for (const { variable, field, label, valid } of SENDER_FIELDS) {
    const value = (env[variable] ?? "").trim();
    const saved = typeof sender[field] === "string" ? sender[field].trim() : "";
    if (!value) {
      console.log(`${variable}: not in the env file, nothing to move`);
    } else if (!valid(value)) {
      console.log(`${variable}: "${value}" does not look like a ${label}, skipped`);
    } else if (saved === value) {
      console.log(`${variable}: already saved (${value}), nothing to do`);
      movable.push(variable);
    } else if (saved && !FORCE) {
      console.log(`${variable}: the admin already has another ${label} (${saved}); kept. Pass --force to replace it with ${value}.`);
    } else {
      console.log(`${variable}: ${APPLY ? "saving" : "would save"} ${label} ${value}${saved ? ` (replacing ${saved})` : ""}`);
      sender[field] = value;
      senderChanged = true;
      movable.push(variable);
    }
  }
  if (senderChanged && APPLY) {
    const text = JSON.stringify(local);
    if (store) await stores.updateOne({ _id: store._id }, { $set: { local: text } });
    else await stores.insertOne({ pages: [], local: text });
    wrote += 1;
  }

  if (!APPLY) {
    console.log("Nothing was written. Add --apply to save.");
  } else {
    console.log(`Done: ${wrote} document(s) written.`);
    if (movable.length) {
      console.log("Now in the database, so these can be removed from the server environment:");
      for (const name of movable) console.log(`  ${name}`);
      console.log("Before removing them: deploy this version, open Доставка → Відправник and check that it says «Ключ збережено» and that «Перевірити ключ» passes.");
      if (secret && movable.includes("NOVA_POSHTA_API_KEY")) console.log(`Keep ${secret.name} on the server unchanged: the saved key cannot be opened without it.`);
    }
  }
} finally {
  await client.close();
}
