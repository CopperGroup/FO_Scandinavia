import { Redis as UpstashRedis } from "@upstash/redis";
import type IORedis from "ioredis";
import { getRedis } from "../../redis";

/**
 * Minimal string key-value store behind the catalog cache.
 *
 *   redis    self-hosted Redis over TCP (REDIS_URL); the default in production
 *   upstash  Upstash over HTTPS; used when only the Upstash credentials are set
 *   memory   per process; used in development and when nothing is configured
 *
 * Force a driver with CATALOG_CACHE_DRIVER=redis|upstash|memory.
 */
export type KeyValueDriver = "redis" | "upstash" | "memory";

export interface KeyValueStore {
  readonly driver: KeyValueDriver;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(keys: string[]): Promise<void>;
}

class RedisStore implements KeyValueStore {
  readonly driver = "redis" as const;

  constructor(private readonly client: IORedis) {}

  /**
   * While the connection is down, fail at once instead of queueing the command
   * until it times out: the caller falls back to memory or the database, and a
   * Redis outage must not add a timeout to every request.
   */
  private assertConnected(): void {
    const status = this.client.status;
    if (status === "reconnecting" || status === "close" || status === "end") {
      throw new Error("Redis is not connected");
    }
  }

  async get(key: string): Promise<string | null> {
    this.assertConnected();
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.assertConnected();
    if (ttlSeconds) await this.client.set(key, value, "EX", ttlSeconds);
    else await this.client.set(key, value);
  }

  async del(keys: string[]): Promise<void> {
    this.assertConnected();
    if (keys.length > 0) await this.client.del(...keys);
  }
}

class UpstashStore implements KeyValueStore {
  readonly driver = "upstash" as const;
  private readonly client: UpstashRedis;

  constructor(url: string, token: string) {
    // Values are opaque strings (JSON fragments); the client must not try to parse them.
    this.client = new UpstashRedis({ url, token, automaticDeserialization: false });
  }

  async get(key: string): Promise<string | null> {
    const value = await this.client.get<string>(key);
    return value == null ? null : String(value);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) await this.client.set(key, value, { ex: ttlSeconds });
    else await this.client.set(key, value);
  }

  async del(keys: string[]): Promise<void> {
    if (keys.length > 0) await this.client.del(...keys);
  }
}

class MemoryStore implements KeyValueStore {
  readonly driver = "memory" as const;
  private readonly entries = new Map<string, { value: string; expiresAt: number | null }>();

  async get(key: string): Promise<string | null> {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.entries.set(key, { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null });
  }

  async del(keys: string[]): Promise<void> {
    for (const key of keys) this.entries.delete(key);
  }
}

const globalForStore = globalThis as unknown as { __catalogKeyValueStore?: KeyValueStore };

function createStore(): KeyValueStore {
  const requested = process.env.CATALOG_CACHE_DRIVER?.trim().toLowerCase();
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (requested === "memory") return new MemoryStore();

  if (requested !== "upstash") {
    const redis = getRedis();
    if (redis) return new RedisStore(redis);
    if (requested === "redis") console.warn("[catalog] CATALOG_CACHE_DRIVER=redis but REDIS_URL is not set");
  }

  if (upstashUrl && upstashToken) return new UpstashStore(upstashUrl, upstashToken);
  if (requested === "upstash") console.warn("[catalog] CATALOG_CACHE_DRIVER=upstash but the Upstash credentials are missing");

  return new MemoryStore();
}

export function getKeyValueStore(): KeyValueStore {
  return (globalForStore.__catalogKeyValueStore ??= createStore());
}
