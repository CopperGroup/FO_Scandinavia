import Redis from "ioredis";

/**
 * Connection to the self-hosted Redis (REDIS_URL, e.g. redis://redis:6379 in
 * docker-compose). One client per process, reused across hot reloads.
 *
 * The cache is an optimisation, never a dependency: every command gives up
 * after a short timeout so a stopped or slow Redis degrades the site to
 * "rebuild from the database" instead of hanging requests.
 */

const globalForRedis = globalThis as unknown as { __redisClient?: Redis | null; __redisLastErrorAt?: number };

const CONNECT_TIMEOUT_MS = 2000;
const COMMAND_TIMEOUT_MS = 4000;
const ERROR_LOG_INTERVAL_MS = 30_000;

export function getRedis(): Redis | null {
  if (globalForRedis.__redisClient !== undefined) return globalForRedis.__redisClient;

  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    globalForRedis.__redisClient = null;
    return null;
  }

  const client = new Redis(url, {
    connectTimeout: CONNECT_TIMEOUT_MS,
    commandTimeout: COMMAND_TIMEOUT_MS,
    maxRetriesPerRequest: 1,
    // Keep trying to reconnect in the background, backing off to 5 s.
    retryStrategy: (attempt) => Math.min(attempt * 250, 5000),
  });

  // Without a listener ioredis reports connection errors as unhandled; log them, but not on every retry.
  client.on("error", (error) => {
    const now = Date.now();
    if (now - (globalForRedis.__redisLastErrorAt ?? 0) < ERROR_LOG_INTERVAL_MS) return;
    globalForRedis.__redisLastErrorAt = now;
    console.error("[redis]", error.message);
  });

  globalForRedis.__redisClient = client;
  return client;
}
