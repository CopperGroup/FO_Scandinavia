#!/usr/bin/env node
/**
 * Runs the production build of the site against the LOCAL services.
 *
 *   npm run build:local          # next build  -> .next-prod
 *   npm run start:local          # next start  on http://localhost:3100
 *
 * `next build` and `next start` read .env.local, which holds the production
 * settings. This launcher first puts everything from .env.development.local
 * into the process (blank values included), and Next never overrides a value
 * that is already set. So the local database and Redis are used and no e-mail,
 * Nova Poshta or analytics key is present. It refuses to start otherwise.
 *
 * The build goes to .next-prod, so it can run while `npm run dev` is using .next.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { REPO_ROOT, isLoopbackUrl } from "./config.mjs";

process.chdir(REPO_ROOT);

const envFile = path.join(REPO_ROOT, ".env.development.local");
if (!fs.existsSync(envFile)) {
  console.error("No .env.development.local: there is nothing that points the app at the local services.");
  process.exit(1);
}
for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const port = process.env.LOCAL_NEXT_PORT || "3100";
process.env.NEXT_DIST_DIR = ".next-prod";
process.env.NODE_ENV = "production";
process.env.NEXTAUTH_URL = `http://localhost:${port}`;

if (!isLoopbackUrl(process.env.MONGODB_URL ?? "")) {
  console.error("Refusing to run: MONGODB_URL in .env.development.local is not a local address.");
  process.exit(1);
}
const MUST_BE_BLANK = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "BREVO_LOGIN", "BREVO_PASSWORD", "EMAIL_USER", "EMAIL_PASS", "NOVA_POSHTA_API_KEY", "NEXT_PUBLIC_POSTHOG_KEY"];
for (const key of MUST_BE_BLANK) {
  if (process.env[key]) {
    console.error(`Refusing to run: ${key} is set. Leave it blank in .env.development.local so a local run cannot reach that service.`);
    process.exit(1);
  }
}

const command = process.argv[2];
if (command !== "build" && command !== "start") {
  console.error("usage: node tools/local-db/next-local.mjs build | start");
  process.exit(1);
}
console.log(`next ${command}: local database, local cache, outside services off`);

process.argv = [process.argv[0], "next", command, ...(command === "start" ? ["-p", port] : []), ...process.argv.slice(3)];
createRequire(path.join(REPO_ROOT, "package.json"))("next/dist/bin/next");
