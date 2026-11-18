/**
 * Server-side access to the Nova Poshta directory API for the checkout pickers.
 *
 * The directories (cities, warehouses of a city) change rarely, so they are
 * kept in process memory: one upstream call per list per TTL, concurrent
 * requests share it, and a stale copy is served when a refresh fails.
 * Only the fields the pickers read leave the server.
 */

import { getNovaPoshtaKey } from "@/lib/admin/np-key"

const API_URL = "https://api.novaposhta.ua/v2.0/json/"
const UPSTREAM_TIMEOUT_MS = 15_000

export class NovaPoshtaUnavailable extends Error {}

type Entry<T> = { value: T; expires: number }

type Store = {
  entries: Map<string, Entry<unknown>>
  pending: Map<string, Promise<unknown>>
}

const globalForNova = globalThis as unknown as { __novaPoshtaCache?: Store }
const store: Store = (globalForNova.__novaPoshtaCache ??= { entries: new Map(), pending: new Map() })

// Warehouse lists are cached per city; keep the number of cities bounded.
const MAX_ENTRIES = 500

export async function novaPoshtaConfigured(): Promise<boolean> {
  return Boolean(await getNovaPoshtaKey())
}

async function callApi(modelName: string, calledMethod: string, methodProperties: Record<string, unknown>): Promise<unknown[]> {
  const apiKey = await getNovaPoshtaKey()
  if (!apiKey) throw new NovaPoshtaUnavailable("Nova Poshta API key is not configured")

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, modelName, calledMethod, methodProperties }),
    cache: "no-store",
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`Nova Poshta responded ${response.status}`)

  const body = (await response.json()) as { success?: boolean; data?: unknown[] }
  if (!body?.success || !Array.isArray(body.data)) throw new Error("Nova Poshta returned an unsuccessful response")
  return body.data
}

/** Returns the cached value, refreshing it when expired; serves the stale copy if the refresh fails. */
async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const entry = store.entries.get(key) as Entry<T> | undefined
  if (entry && entry.expires > Date.now()) return entry.value

  let pending = store.pending.get(key) as Promise<T> | undefined
  if (!pending) {
    pending = load()
      .then((value) => {
        if (store.entries.size >= MAX_ENTRIES && !store.entries.has(key)) {
          const oldest = store.entries.keys().next().value
          if (oldest !== undefined) store.entries.delete(oldest)
        }
        store.entries.set(key, { value, expires: Date.now() + ttlMs })
        return value
      })
      .finally(() => store.pending.delete(key))
    store.pending.set(key, pending)
  }

  try {
    return await pending
  } catch (error) {
    if (entry) return entry.value
    throw error
  }
}

const text = (value: unknown) => (typeof value === "string" ? value : value == null ? "" : String(value))

export type City = { Description: string; Ref: string }

export function getCities(): Promise<City[]> {
  return cached("cities", 24 * 60 * 60 * 1000, async () => {
    const rows = await callApi("Address", "getCities", {})
    return rows.map((row: any) => ({ Description: text(row?.Description), Ref: text(row?.Ref) })).filter((city) => city.Ref && city.Description)
  })
}

export type Warehouse = {
  Description: string
  Ref: string
  Number: string
  TypeOfWarehouse: string
  WarehouseIndex: string
  CategoryOfWarehouse: string
}

export function getWarehouses(cityRef: string): Promise<Warehouse[]> {
  return cached(`warehouses:${cityRef}`, 60 * 60 * 1000, async () => {
    const rows = await callApi("Address", "getWarehouses", { CityRef: cityRef })
    return rows.map((row: any) => ({
      Description: text(row?.Description),
      Ref: text(row?.Ref),
      Number: text(row?.Number),
      TypeOfWarehouse: text(row?.TypeOfWarehouse),
      WarehouseIndex: text(row?.WarehouseIndex),
      CategoryOfWarehouse: text(row?.CategoryOfWarehouse),
    }))
  })
}

export type Street = { Description: string; Ref: string; StreetsType: string }

export function getStreets(cityRef: string, search: string): Promise<Street[]> {
  return cached(`streets:${cityRef}:${search.toLowerCase()}`, 60 * 60 * 1000, async () => {
    const rows = await callApi("Address", "getStreet", { CityRef: cityRef, FindByString: search })
    return rows.map((row: any) => ({ Description: text(row?.Description), Ref: text(row?.Ref), StreetsType: text(row?.StreetsType) }))
  })
}

/** Nova Poshta references are GUIDs. */
export function isRef(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}
