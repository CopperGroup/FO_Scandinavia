import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(here, "..", "..");
export const DATA_DIR = path.join(REPO_ROOT, ".local", "mongo");
export const BINARY_DIR = path.join(REPO_ROOT, ".local", "mongo-binaries");

export const LOCAL_PORT = Number(process.env.LOCAL_MONGO_PORT || 27018);
export const LOCAL_DB_NAME = process.env.LOCAL_MONGO_DB || "nordiva_local";
export const REPLSET_NAME = "rs-local";
export const MONGO_VERSION = process.env.LOCAL_MONGO_VERSION || "7.0.14";

export const LOCAL_URL = `mongodb://127.0.0.1:${LOCAL_PORT}/${LOCAL_DB_NAME}?replicaSet=${REPLSET_NAME}&directConnection=true`;

/** A target is "local" only when every host in the URL is a loopback address. */
export function isLoopbackUrl(url) {
  const match = /^mongodb(\+srv)?:\/\/([^/?]+)/i.exec(url);
  if (!match || match[1]) return false;
  const hosts = match[2].split("@").pop().split(",");
  return hosts.every((host) => /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i.test(host));
}
