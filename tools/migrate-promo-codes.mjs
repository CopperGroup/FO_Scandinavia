#!/usr/bin/env node
/**
 * Puts the personal promo codes issued before the admin had a list of them
 * into that list (collection "promocodes"), for every customer at once.
 *
 *   PROMO_MONGODB_URL="mongodb://127.0.0.1:27018/nordiva_local?replicaSet=rs-local&directConnection=true" \
 *     node tools/migrate-promo-codes.mjs            # dry run: reports, writes nothing
 *     node tools/migrate-promo-codes.mjs --apply    # writes
 *
 * The site works without this script: a customer's old codes are put into the
 * list the first time that customer opens "Мої промокоди", the checkout, or
 * applies one (lib/promo/server.ts, adoptLegacyCodes). Running it makes all of
 * them visible in the admin panel straight away.
 *
 * An old code is text in the customer's record (users.discounts):
 *   "DV-" + percent + 4 digits + 3 letters of the e-mail + date (YYYYMMDD) + uses left
 * It becomes a personal code of the same customer with the same text and
 * discount. The old check refused a code on the date written in it, so its last
 * working day is the day before. A code with no uses left becomes a used one.
 *
 * Each used code is linked to the orders it was used on (orders.promocode of
 * the same customer), so the admin shows those orders under the code.
 *
 * Adds documents to "promocodes", and fills in the order of a use that has
 * none on an old code already in the list; nothing else is changed, nothing is
 * deleted, and users.discounts is left as it is. Running it twice changes
 * nothing the second time.
 *
 * The database URL comes only from PROMO_MONGODB_URL. A non-local host is
 * refused unless --allow-remote is passed as well.
 *
 * The reading of the old format is the same as legacyPromo() in
 * lib/promo/rules.ts; change the two together.
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

const APPLY = process.argv.includes("--apply");
const ALLOW_REMOTE = process.argv.includes("--allow-remote");
const url = process.env.PROMO_MONGODB_URL;
if (!url) {
  console.error("Set PROMO_MONGODB_URL to the database to work on.");
  process.exit(1);
}
const local = /^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url);
if (!local && !ALLOW_REMOTE) {
  console.error("PROMO_MONGODB_URL is not a local database. Pass --allow-remote if that is what you mean.");
  process.exit(1);
}

const DAY_MS = 24 * 60 * 60 * 1000;
const CODE_SHAPE = /^DV-[A-Z0-9._-]{5,37}$/; // LEGACY_CODE_SHAPE in lib/promo/rules.ts

/** The old text as a document of the list, or null when the text is not such a code. */
function legacyPromo(text, owner) {
  const code = String(text ?? "").replace(/\s+/g, "").toUpperCase();
  const body = code.split("-")[1] ?? "";
  const tail = 4 + 3 + 8 + 1;
  if (!code.startsWith("DV-") || body.length < tail + 1 || !CODE_SHAPE.test(code)) return null;
  const percentText = body.slice(0, body.length - tail);
  const rest = body.slice(percentText.length + 4 + 3);
  const dateText = rest.slice(0, 8);
  const percent = Number.parseInt(percentText, 10);
  const usesLeft = Number.parseInt(rest.slice(8), 10);
  if (!/^\d+$/.test(percentText) || !/^\d{8}$/.test(dateText) || !Number.isInteger(usesLeft) || percent < 1 || percent > 99) return null;
  const written = Date.parse(`${dateText.slice(0, 4)}-${dateText.slice(4, 6)}-${dateText.slice(6, 8)}T00:00:00Z`);
  if (Number.isNaN(written)) return null;
  const spent = usesLeft <= 0;
  return {
    code,
    percent,
    owner,
    startDay: null,
    endDay: new Date(written - DAY_MS).toISOString().slice(0, 10),
    maxUses: null,
    perCustomer: spent ? 1 : usesLeft,
    minOrder: 0,
    active: true,
    note: "",
    source: "legacy",
    uses: spent ? [{ user: owner, order: null, at: null }] : [],
    usedCount: spent ? 1 : 0,
    createdBy: "",
  };
}

const client = new MongoClient(url);
await client.connect();
try {
  const db = client.db();
  const promocodes = db.collection("promocodes");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  // The orders an old code was used on: same customer, same code, not a test order. The last character of an old
  // code is its uses left and changes when the code is used, so codes are compared without it.
  const stemOf = (code) => String(code ?? "").replace(/\s+/g, "").toUpperCase().slice(0, -1);
  const ordersByKey = new Map();
  const orders = await db.collection("orders").find({ promocode: /^\s*DV-/i, user: { $ne: null }, isTest: { $ne: true } }, { projection: { id: 1, user: 1, promocode: 1, data: 1, createdAt: 1 } }).toArray();
  for (const order of orders) {
    if (!order.id) continue;
    const key = `${order.user}|${stemOf(order.promocode)}`;
    if (!ordersByKey.has(key)) ordersByKey.set(key, []);
    ordersByKey.get(key).push({ order: String(order.id), at: order.data ?? order.createdAt ?? null });
  }
  for (const list of ordersByKey.values()) list.sort((a, b) => new Date(a.at ?? 0) - new Date(b.at ?? 0));
  const usesOf = (key, owner) => (ordersByKey.get(key) ?? []).map((row) => ({ user: owner, order: row.order, at: row.at }));

  const existing = await promocodes.find({ source: "legacy" }, { projection: { code: 1, owner: 1, uses: 1, usedCount: 1, perCustomer: 1 } }).toArray();
  const known = new Set(existing.map((row) => `${row.owner}|${row.code.slice(0, -1)}`));
  const taken = new Set((await promocodes.find({}, { projection: { code: 1 } }).toArray()).map((row) => row.code));

  const users = await db.collection("users").find({ "discounts.0": { $exists: true } }, { projection: { discounts: 1 } }).toArray();
  const add = [];
  const counts = { customers: users.length, texts: 0, alreadyThere: 0, notACode: 0, working: 0, used: 0, expired: 0, linked: 0 };
  for (const user of users) {
    for (const text of user.discounts ?? []) {
      counts.texts += 1;
      const doc = typeof text === "string" ? legacyPromo(text, user._id) : null;
      if (!doc) { counts.notACode += 1; continue; }
      const key = `${user._id}|${doc.code.slice(0, -1)}`;
      if (known.has(key) || taken.has(doc.code)) { counts.alreadyThere += 1; continue; }
      known.add(key);
      taken.add(doc.code);
      const uses = usesOf(key, user._id);
      if (uses.length > 0) {
        // The real orders replace the placeholder use; a code with uses left keeps them on top.
        counts.linked += uses.length;
        const left = doc.usedCount > 0 ? 0 : doc.perCustomer;
        doc.uses = uses;
        doc.usedCount = uses.length;
        doc.perCustomer = Math.max(1, uses.length + left);
      }
      if (doc.usedCount > 0 && doc.usedCount >= doc.perCustomer) counts.used += 1;
      else if (doc.endDay < today) counts.expired += 1;
      else counts.working += 1;
      add.push({ ...doc, createdAt: new Date(), updatedAt: new Date() });
    }
  }

  // Codes already in the list (put there when their customer opened the checkout) whose use has
  // no order yet: the order is filled in. Uses with an order stay as they are.
  const fill = [];
  for (const row of existing) {
    const key = `${row.owner}|${row.code.slice(0, -1)}`;
    const found = usesOf(key, row.owner);
    const withOrder = (row.uses ?? []).filter((use) => use.order);
    const placeholders = (row.uses ?? []).filter((use) => !use.order);
    const missing = found.filter((use) => !withOrder.some((kept) => kept.order === use.order));
    if (placeholders.length === 0 || missing.length === 0) continue;
    const linked = missing;
    const uses = [...withOrder, ...linked, ...placeholders.slice(linked.length)];
    fill.push({ updateOne: { filter: { _id: row._id }, update: { $set: { uses, usedCount: uses.length, perCustomer: Math.max(row.perCustomer ?? 1, uses.length), updatedAt: new Date() } } } });
    counts.linked += linked.length;
  }

  console.log(`customers with old codes: ${counts.customers}; texts read: ${counts.texts}`);
  console.log(`already in the list: ${counts.alreadyThere}; not a promo code: ${counts.notACode}`);
  console.log(`to add: ${add.length} (still working: ${counts.working}, used: ${counts.used}, expired: ${counts.expired})`);
  console.log(`orders with an old code: ${orders.length}; linked to their code: ${counts.linked}; codes already in the list that get their order filled in: ${fill.length}`);

  if (!APPLY) {
    console.log("Dry run: nothing was written. Add --apply to write.");
  } else if (add.length > 0 || fill.length > 0) {
    if (add.length > 0) console.log(`added: ${(await promocodes.insertMany(add, { ordered: false })).insertedCount}`);
    if (fill.length > 0) console.log(`orders filled in: ${(await promocodes.bulkWrite(fill)).modifiedCount}`);
  } else {
    console.log("Nothing to do.");
  }
} finally {
  await client.close();
}
