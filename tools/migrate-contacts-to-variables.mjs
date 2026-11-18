#!/usr/bin/env node
/**
 * Copies the shop's contacts from the old "Contacts" record (collection
 * "pages", written by the old page editor) into the settings the admin panel
 * keeps now ("Налаштування"; collection "sitecontents", document
 * { key: "variables" }).
 *
 *   SETTINGS_MONGODB_URL="mongodb://127.0.0.1:27018/nordiva_local?replicaSet=rs-local&directConnection=true" \
 *     node tools/migrate-contacts-to-variables.mjs            # dry run: reports, writes nothing
 *     node tools/migrate-contacts-to-variables.mjs --apply    # writes
 *
 * The site works without this script: a contact that was never saved as a
 * variable is read from the old record on every request (lib/content/server.ts,
 * getVariables). Running it makes the copy permanent, so the old record can be
 * dropped later, and it shows what will be taken before anything is written.
 *
 * What it moves (old input name -> variable):
 *   "Телефон"                        -> {телефон}
 *   "Email"                          -> {пошта}
 *   "Працюємо з"                     -> {графік}
 *   "Telegram(nickname)", "Telegram" -> {телеграм}  (the nick wins over the number)
 *   "Viber"                          -> {вайбер}
 * {адреса} did not exist before and stays empty.
 *
 * A contact the admin has already saved as a variable is kept, even an empty
 * one: emptying a field is a decision. --force replaces saved values with the
 * old ones wherever the old record has a value. The admin's own variables are
 * never touched, and the old record is never changed or deleted.
 * Running it twice changes nothing the second time.
 *
 * The database URL comes only from SETTINGS_MONGODB_URL. A non-local host is
 * refused unless --allow-remote is passed as well.
 *
 * The mapping of the old inputs is the same as legacyContacts() in
 * lib/content/variables.ts; change the two together.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
let mongodb;
try {
  mongodb = createRequire(path.join(here, "local-db") + "/")("mongodb");
} catch {
  mongodb = createRequire(path.join(here, "..") + "/")("mongodb");
}
const { MongoClient } = mongodb;

const flags = new Set(process.argv.slice(2).filter((arg) => arg.startsWith("--")));
const APPLY = flags.has("--apply");
const FORCE = flags.has("--force");

function fail(message) {
  console.error(message);
  process.exit(2);
}

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

const KEY = "variables";
/** Variable key, its name in a text, the old input names (first non-empty wins), the longest value kept. */
const CONTACTS = [
  { key: "phone", name: "телефон", from: ["Телефон"], max: 30 },
  { key: "email", name: "пошта", from: ["Email"], max: 120 },
  { key: "hours", name: "графік", from: ["Працюємо з"], max: 60 },
  { key: "telegram", name: "телеграм", from: ["Telegram(nickname)", "Telegram"], max: 40 },
  { key: "viber", name: "вайбер", from: ["Viber"], max: 30 },
  { key: "address", name: "адреса", from: [], max: 160 },
];
const tidy = (value, max) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

const client = new MongoClient(url);
await client.connect();
const db = client.db();
console.log(`${APPLY ? "APPLYING to" : "Dry run on"} ${host}/${db.databaseName}`);

try {
  const page = await db.collection("pages").findOne({ name: "Contacts" }, { projection: { dataInputs: 1 } });
  const old = new Map();
  for (const row of Array.isArray(page?.dataInputs) ? page.dataInputs : []) {
    const name = String(row?.name ?? "").trim();
    const value = String(row?.value ?? "").trim();
    if (name && value) old.set(name, value);
  }
  console.log(page ? `Old "Contacts" record: ${old.size} filled input(s)` : 'Old "Contacts" record: not found');

  const contents = db.collection("sitecontents");
  const existing = await contents.findOne({ key: KEY });
  // A document without an author holds only an editor's preview draft: nothing was saved yet.
  const saved = Boolean(existing?.updatedBy);
  const savedContacts = saved && existing.values && typeof existing.values.contacts === "object" && existing.values.contacts ? existing.values.contacts : {};
  const custom = saved && Array.isArray(existing.values?.custom) ? existing.values.custom : [];
  console.log(saved ? `Variables: saved in the admin by ${existing.updatedBy}, own variables: ${custom.length}` : "Variables: not saved yet");

  const next = {};
  let changes = 0;
  for (const contact of CONTACTS) {
    const legacy = tidy(contact.from.map((name) => old.get(name)).find(Boolean), contact.max);
    const has = Object.prototype.hasOwnProperty.call(savedContacts, contact.key);
    const current = has ? tidy(savedContacts[contact.key], contact.max) : "";
    const label = `{${contact.name}}`.padEnd(12);
    if (has && current === legacy) {
      next[contact.key] = current;
      console.log(`${label} already "${current}", nothing to do`);
    } else if (has && !(FORCE && legacy)) {
      next[contact.key] = current;
      console.log(`${label} kept as saved in the admin: "${current}"${legacy ? ` (the old record has "${legacy}"; --force would put it back)` : ""}`);
    } else {
      next[contact.key] = legacy;
      changes += 1;
      console.log(`${label} ${APPLY ? "set to" : "would be set to"} "${legacy}"${legacy ? "" : " (the old record has no value)"}${has ? ` (replacing "${current}")` : ""}`);
    }
  }

  if (changes === 0) {
    console.log("Nothing to change.");
  } else if (!APPLY) {
    console.log(`Nothing was written. ${changes} value(s) would change; add --apply to save.`);
  } else {
    const now = new Date();
    await contents.updateOne(
      { key: KEY },
      {
        $set: { values: { contacts: next, custom }, updatedBy: saved ? existing.updatedBy : "перенесено зі старих контактів", updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
    console.log(`Done: ${changes} value(s) written.`);
    console.log("The site was already showing the old contacts, so customers see no change. After --force, restart the server or save any page under Сторінки: the site keeps a cached copy of the texts until then.");
  }
  if (!next.phone || !next.email) console.log("Note: the phone or the e-mail is empty. The site shows the built-in ones (constants/store) until they are filled in under Налаштування.");
} finally {
  await client.close();
}
