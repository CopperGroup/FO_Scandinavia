import { unstable_cache } from "next/cache"
import CryptoJS from "crypto-js"
import Pixel from "@/lib/models/pixel.model"
import { connectToDB } from "@/lib/mongoose"
import { NO_ACTIVE_PIXELS, normalizeEvents, type ActivePixels, type AdminPixel, type PixelType } from "./shared"

/** Tag of everything derived from the pixels collection. */
export const PIXELS_TAG = "pixels"

/**
 * Pixel IDs are stored the way the old admin wrote them: AES with the key from
 * NEXT_PUBLIC_ENCRYPTION_KEY. A pixel ID is not a secret (it is in the page
 * source of every shop), so this is kept only to read the existing records.
 * Without a key the ID is stored as is.
 */
const encryptionKey = () => process.env.NEXT_PUBLIC_ENCRYPTION_KEY || ""

export function encodePixelId(plain: string): string {
  const key = encryptionKey()
  return key ? CryptoJS.AES.encrypt(plain, key).toString() : plain
}

export function decodePixelId(stored: unknown): string {
  const value = String(stored ?? "")
  if (!value) return ""
  const key = encryptionKey()
  if (key) {
    try {
      const plain = CryptoJS.AES.decrypt(value, key).toString(CryptoJS.enc.Utf8).replace(/\s+/g, "")
      if (plain) return plain
    } catch {
      // Not encrypted with this key: fall through to the plain form.
    }
  }
  return /^[A-Za-z0-9]{8,40}$/.test(value) ? value : ""
}

type PixelRow = {
  _id: unknown
  type?: string
  name?: string
  id?: string
  status?: string
  createdAt?: Date
  activatedAt?: Date
  deactivatedAt?: Date
  events?: Record<string, boolean>
}

const iso = (value?: Date) => (value ? new Date(value).toISOString() : null)

/** Every pixel, newest first, for the admin page. */
export async function listPixels(): Promise<AdminPixel[]> {
  await connectToDB()
  const rows = await Pixel.find({}).sort({ createdAt: -1 }).lean<PixelRow[]>()
  return rows.map((row) => ({
    _id: String(row._id),
    type: row.type === "TikTok" ? "TikTok" : "Meta",
    name: String(row.name ?? "").trim() || "Без назви",
    pixelId: decodePixelId(row.id),
    active: row.status === "Active",
    createdAt: iso(row.createdAt),
    activatedAt: iso(row.activatedAt),
    deactivatedAt: iso(row.deactivatedAt),
    events: normalizeEvents(row.events),
  }))
}

async function readActivePixels(): Promise<ActivePixels> {
  try {
    await connectToDB()
    const rows = await Pixel.find({ status: "Active" }).sort({ activatedAt: -1 }).lean<PixelRow[]>()
    const pick = (type: PixelType) => {
      // Records made before the type existed are Meta pixels.
      const row = rows.find((candidate) => (candidate.type === "TikTok" ? "TikTok" : "Meta") === type)
      const id = row ? decodePixelId(row.id) : ""
      return row && id ? { id, events: normalizeEvents(row.events) } : null
    }
    return { meta: pick("Meta"), tiktok: pick("TikTok") }
  } catch (error) {
    console.error("[pixels] could not read the active pixels:", error instanceof Error ? error.message : error)
    return NO_ACTIVE_PIXELS
  }
}

/**
 * The pixels the storefront loads. Read in the layout on the server and cached:
 * the shop makes no extra request for them, and a change in the admin panel
 * drops the cache (PIXELS_TAG).
 */
export const getActivePixels = unstable_cache(readActivePixels, ["active-pixels"], { tags: [PIXELS_TAG], revalidate: 600 })
