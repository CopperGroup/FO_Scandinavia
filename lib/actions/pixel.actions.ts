"use server"

import mongoose from "mongoose"
import { revalidatePath, revalidateTag } from "next/cache"
import Pixel from "../models/pixel.model"
import { connectToDB } from "../mongoose"
import { AccessDenied, requireAdmin } from "@/lib/auth/guards"
import { PIXELS_TAG, decodePixelId, encodePixelId } from "@/lib/pixels/server"
import { ALL_EVENTS_ON, checkPixelId, normalizeEvents, type PixelType } from "@/lib/pixels/shared"

/**
 * Changes to advertising pixels. Every export here is a public endpoint, so
 * each one checks that an administrator is signed in before touching anything.
 * The storefront does not call these: it gets the active pixels from the
 * server-rendered layout (lib/pixels/server.ts).
 */

type Result<T = {}> = ({ ok: true } & T) | { ok: false; error: string }

function failure(error: unknown): { ok: false; error: string } {
  if (error instanceof AccessDenied) return { ok: false, error: "Керувати пікселями може лише адміністратор. Увійдіть під обліковим записом адміністратора." }
  console.error("[pixels]", error instanceof Error ? error.message : error)
  return { ok: false, error: "Не вдалося зберегти зміни через помилку на сервері. Спробуйте ще раз." }
}

function changed() {
  revalidateTag(PIXELS_TAG)
  revalidatePath("/admin/pixel")
}

const asType = (value: unknown): PixelType => (value === "TikTok" ? "TikTok" : "Meta")

export async function createPixel(input: { type: PixelType; name: string; id: string }): Promise<Result<{ _id: string }>> {
  try {
    await requireAdmin()
    const type = asType(input?.type)
    const name = String(input?.name ?? "").trim().slice(0, 80)
    if (!name) return { ok: false, error: "Дайте пікселю назву, щоб відрізняти його від інших. Наприклад: «Основний рекламний кабінет»." }
    const checked = checkPixelId(type, input?.id)
    if (!checked.ok) return checked

    await connectToDB()
    const sameType = await Pixel.find({ type }).select("id").lean<{ id?: string }[]>()
    if (sameType.some((row) => decodePixelId(row.id) === checked.id)) {
      return { ok: false, error: "Піксель із таким ID уже додано. Знайдіть його у списку." }
    }

    const created = await Pixel.create({
      type,
      name,
      id: encodePixelId(checked.id),
      status: "Deactivated",
      createdAt: new Date(),
      events: { ...ALL_EVENTS_ON },
    })
    changed()
    return { ok: true, _id: String(created._id) }
  } catch (error) {
    return failure(error)
  }
}

/** Switches a pixel on or off. Only one pixel of a kind works at a time: switching one on switches the other off. */
export async function setPixelActive(input: { _id: string; active: boolean }): Promise<Result<{ replaced: string | null }>> {
  try {
    await requireAdmin()
    if (!mongoose.isValidObjectId(input?._id)) return { ok: false, error: "Цей піксель уже видалено. Оновіть сторінку." }
    await connectToDB()

    const pixel = await Pixel.findById(input._id).select("_id type status").lean<{ _id: unknown; type?: string; status?: string }>()
    if (!pixel) return { ok: false, error: "Цей піксель уже видалено. Оновіть сторінку." }
    const now = new Date()

    if (!input.active) {
      await Pixel.updateOne({ _id: pixel._id }, { $set: { status: "Deactivated", deactivatedAt: now } })
      changed()
      return { ok: true, replaced: null }
    }

    const type = asType(pixel.type)
    // Records made before the type existed count as Meta.
    const sameType = type === "TikTok" ? { type: "TikTok" } : { type: { $ne: "TikTok" } }
    const previous = await Pixel.findOne({ ...sameType, status: "Active", _id: { $ne: pixel._id } })
      .select("name")
      .lean<{ name?: string }>()
    await Pixel.updateMany({ ...sameType, status: "Active", _id: { $ne: pixel._id } }, { $set: { status: "Deactivated", deactivatedAt: now } })
    await Pixel.updateOne({ _id: pixel._id }, { $set: { status: "Active", activatedAt: now } })
    changed()
    return { ok: true, replaced: previous ? String(previous.name ?? "") || "інший піксель" : null }
  } catch (error) {
    return failure(error)
  }
}

export async function updatePixelEvents(input: { _id: string; events: Record<string, boolean> }): Promise<Result> {
  try {
    await requireAdmin()
    if (!mongoose.isValidObjectId(input?._id)) return { ok: false, error: "Цей піксель уже видалено. Оновіть сторінку." }
    await connectToDB()
    const result = await Pixel.updateOne({ _id: input._id }, { $set: { events: normalizeEvents(input.events) } })
    if (result.matchedCount === 0) return { ok: false, error: "Цей піксель уже видалено. Оновіть сторінку." }
    changed()
    return { ok: true }
  } catch (error) {
    return failure(error)
  }
}

export async function renamePixel(input: { _id: string; name: string }): Promise<Result> {
  try {
    await requireAdmin()
    const name = String(input?.name ?? "").trim().slice(0, 80)
    if (!name) return { ok: false, error: "Назва не може бути порожньою." }
    if (!mongoose.isValidObjectId(input?._id)) return { ok: false, error: "Цей піксель уже видалено. Оновіть сторінку." }
    await connectToDB()
    await Pixel.updateOne({ _id: input._id }, { $set: { name } })
    changed()
    return { ok: true }
  } catch (error) {
    return failure(error)
  }
}

export async function deletePixel(input: { _id: string }): Promise<Result> {
  try {
    await requireAdmin()
    if (!mongoose.isValidObjectId(input?._id)) return { ok: true }
    await connectToDB()
    await Pixel.deleteOne({ _id: input._id })
    changed()
    return { ok: true }
  } catch (error) {
    return failure(error)
  }
}
