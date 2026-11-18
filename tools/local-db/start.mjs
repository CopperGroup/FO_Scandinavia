// Starts a local single-node MongoDB replica set with a persistent data directory.
// A replica set (not a standalone) is used because the app relies on transactions.
import fs from "node:fs";
import { MongoMemoryReplSet } from "mongodb-memory-server-core";
import { BINARY_DIR, DATA_DIR, LOCAL_PORT, LOCAL_URL, MONGO_VERSION, REPLSET_NAME } from "./config.mjs";

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(BINARY_DIR, { recursive: true });

const replSet = await MongoMemoryReplSet.create({
  binary: { version: MONGO_VERSION, downloadDir: BINARY_DIR },
  replSet: { name: REPLSET_NAME, count: 1, storageEngine: "wiredTiger" },
  instanceOpts: [{ port: LOCAL_PORT, ip: "127.0.0.1", dbPath: DATA_DIR }],
});

await replSet.waitUntilRunning();

console.log(`[local-db] ready on ${LOCAL_URL}`);
console.log(`[local-db] data directory: ${DATA_DIR}`);

let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  console.log("[local-db] stopping…");
  // doCleanup:false keeps the data directory so the copy survives restarts.
  await replSet.stop({ doCleanup: false, force: false });
  process.exit(0);
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
process.on("SIGBREAK", stop);
