#!/usr/bin/env node
/**
 * Creates the indexes the order and client lists rely on, and makes the order
 * number unique.
 *
 *   INDEX_MONGODB_URL="mongodb://127.0.0.1:27018/nordiva_local?replicaSet=rs-local&directConnection=true" \
 *     node tools/create-indexes.mjs            # dry run: reports, writes nothing
 *     node tools/create-indexes.mjs --apply    # creates the indexes
 *
 * Most indexes are also declared in the Mongoose schemas and appear on their
 * own when the app starts. The one that cannot is the order number: the old
 * non-unique index `id_1` has to be dropped before the unique one is created,
 * and only when no two orders share a number. This script checks that first.
 *
 * The URL comes only from INDEX_MONGODB_URL. A non-local host is refused
 * unless --allow-remote is passed as well.
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

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const url = process.env.INDEX_MONGODB_URL;

if (!url) {
  console.error("INDEX_MONGODB_URL is not set. Refusing to run (there is no default on purpose).");
  process.exit(2);
}
const host = (() => {
  try {
    return new URL(url.replace(/^mongodb(\+srv)?:/, "http:")).hostname;
  } catch {
    return "";
  }
})();
if (!["127.0.0.1", "localhost", "::1"].includes(host) && !args.has("--allow-remote")) {
  console.error(`Host "${host}" is not local. Pass --allow-remote as well if you really mean it.`);
  process.exit(2);
}

// E-mail addresses are compared without regard to case (lib/auth/email.ts).
const CASE_INSENSITIVE = { locale: "en", strength: 2 };

const PLAN = {
  orders: [
    { key: { paymentStatus: 1, data: -1 } },
    { key: { deliveryStatus: 1, data: -1 } },
    { key: { user: 1, data: -1 } },
    { key: { email: 1, data: 1 }, options: { name: "email_ci_data", collation: CASE_INSENSITIVE } },
  ],
  users: [
    { key: { email: 1 }, options: { name: "email_ci", collation: CASE_INSENSITIVE } },
    { key: { forgotPasswordToken: 1 }, options: { sparse: true } },
    { key: { verifyToken: 1 }, options: { sparse: true } },
    { key: { role: 1, _id: -1 } },
  ],
};

const sameKey = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const client = new MongoClient(url);
await client.connect();
const db = client.db();
console.log(`${APPLY ? "APPLYING to" : "Dry run on"} ${host}/${db.databaseName}`);

try {
  // 1. The order number.
  const orders = db.collection("orders");
  const duplicates = await orders.aggregate([{ $group: { _id: "$id", count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $limit: 20 }]).toArray();
  const orderIndexes = await orders.indexes();
  const numberIndex = orderIndexes.find((index) => sameKey(index.key, { id: 1 }));
  if (numberIndex?.unique) {
    console.log("orders.id: already unique");
  } else if (duplicates.length > 0) {
    console.log(`orders.id: NOT made unique, ${duplicates.length} order number(s) are used more than once: ${duplicates.map((entry) => entry._id).join(", ")}`);
    console.log("  Give those orders different numbers, then run this again.");
  } else {
    console.log(`orders.id: ${APPLY ? "replacing" : "would replace"} ${numberIndex ? `the non-unique index ${numberIndex.name}` : "the missing index"} with a unique one`);
    if (APPLY) {
      if (numberIndex) await orders.dropIndex(numberIndex.name);
      await orders.createIndex({ id: 1 }, { unique: true, name: "id_1" });
    }
  }

  // 2. Everything else: skipped when an index on the same fields is already there.
  for (const [collectionName, entries] of Object.entries(PLAN)) {
    const collection = db.collection(collectionName);
    const existing = await collection.indexes();
    for (const { key, options = {} } of entries) {
      const present = existing.find((index) => sameKey(index.key, key) && Boolean(index.collation) === Boolean(options.collation));
      if (present) {
        console.log(`${collectionName} ${JSON.stringify(key)}: already there (${present.name})`);
        continue;
      }
      console.log(`${collectionName} ${JSON.stringify(key)}: ${APPLY ? "creating" : "would create"}`);
      if (APPLY) await collection.createIndex(key, options);
    }
  }
  if (!APPLY) console.log("Nothing was written. Add --apply to create the indexes.");
} finally {
  await client.close();
}
