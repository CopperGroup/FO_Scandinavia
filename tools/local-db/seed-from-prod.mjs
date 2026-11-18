// Copies the production database into the local one.
//
// Safety contract for the SOURCE (production) connection:
//   - only listCollections / listIndexes / find are ever issued against it
//   - reads prefer a secondary, so the primary is not loaded
//   - the script aborts if source and target resolve to the same place
// All writes go to the TARGET, which must be a loopback address.
import dns from "node:dns";
import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";
import { LOCAL_URL, REPO_ROOT, isLoopbackUrl } from "./config.mjs";

const BATCH_SIZE = 500;

function readSourceUrl() {
  if (process.env.SEED_SOURCE_MONGODB_URL) return process.env.SEED_SOURCE_MONGODB_URL;
  const envFile = path.join(REPO_ROOT, ".env.local");
  const contents = fs.readFileSync(envFile, "utf8");
  const match = /^MONGODB_URL=(.*)$/m.exec(contents);
  if (!match) throw new Error("MONGODB_URL not found in .env.local");
  return match[1].trim().replace(/^["']|["']$/g, "");
}

const sourceUrl = readSourceUrl();
const targetUrl = process.env.SEED_TARGET_MONGODB_URL || LOCAL_URL;

if (!isLoopbackUrl(targetUrl)) {
  throw new Error("Refusing to seed: the target is not a loopback MongoDB address.");
}
if (isLoopbackUrl(sourceUrl) && sourceUrl.split("?")[0] === targetUrl.split("?")[0]) {
  throw new Error("Refusing to seed: source and target are the same database.");
}

const source = new MongoClient(sourceUrl, {
  readPreference: "secondaryPreferred",
  retryWrites: false,
  appName: "local-seed-readonly",
  serverSelectionTimeoutMS: 20000,
});
const target = new MongoClient(targetUrl, { serverSelectionTimeoutMS: 20000 });

async function connectSource() {
  try {
    await source.connect();
  } catch (error) {
    // Some local resolvers refuse SRV lookups (mongodb+srv). Retry through public DNS.
    if (error?.syscall !== "querySrv" && error?.syscall !== "queryTxt") throw error;
    console.warn("[seed] system DNS refused the SRV lookup, retrying with public resolvers");
    dns.setServers(["1.1.1.1", "8.8.8.8"]);
    await source.connect();
  }
}

try {
  await Promise.all([connectSource(), target.connect()]);

  const sourceDb = source.db();
  const targetDb = target.db();

  const collections = (await sourceDb.listCollections({}, { nameOnly: false }).toArray()).filter(
    (info) => info.type === "collection" && !info.name.startsWith("system."),
  );

  console.log(`[seed] ${collections.length} collections -> ${targetDb.databaseName} (local)`);

  for (const { name } of collections) {
    const from = sourceDb.collection(name);
    const to = targetDb.collection(name);

    await to.drop().catch(() => undefined);

    let copied = 0;
    let batch = [];
    for await (const doc of from.find({}, { batchSize: BATCH_SIZE })) {
      batch.push(doc);
      if (batch.length >= BATCH_SIZE) {
        await to.insertMany(batch, { ordered: false });
        copied += batch.length;
        batch = [];
      }
    }
    if (batch.length > 0) {
      await to.insertMany(batch, { ordered: false });
      copied += batch.length;
    }

    const indexes = (await from.listIndexes().toArray()).filter((index) => index.name !== "_id_");
    for (const { key, v, ns, background, ...options } of indexes) {
      await to.createIndex(key, options).catch((error) => {
        console.warn(`[seed]   index ${options.name} on ${name} skipped: ${error.message}`);
      });
    }

    console.log(`[seed] ${name}: ${copied} documents, ${indexes.length} indexes`);
  }

  console.log("[seed] done");
} finally {
  await Promise.allSettled([source.close(), target.close()]);
}
