"use server";

import mongoose from "mongoose";
import Filter from "../models/filter.model";
import Category from "../models/category.model";
import Product from "../models/product.model";
import { connectToDB } from "../mongoose";
import { FilterType } from "../types/types";
import { invalidateCatalog } from "@/lib/catalog/server/service";
import { requireCatalogAdmin } from "@/lib/admin/catalog-auth";
import { DELETED_PRODUCT_ID, filterParamType, isObjectIdLike, pluralUk } from "@/lib/admin/catalog-shared";

const { ObjectId } = mongoose.Types;

export type FilterActionResult = { ok: true; message: string } | { ok: false; error: string };

async function afterFilterWrite() {
  // Filter settings have no cache event: invalidate the storefront snapshot once.
  await invalidateCatalog();
}

export async function fetchFilter(): Promise<FilterType>;
export async function fetchFilter(type: "json"): Promise<string>;

export async function fetchFilter(type?: "json") {
  try {
    await requireCatalogAdmin();
    await connectToDB();
    const filter = await Filter.findOne().lean();
    return type === "json" ? JSON.stringify(filter) : (JSON.parse(JSON.stringify(filter)) as FilterType);
  } catch (error: any) {
    throw new Error(`${error.message}`);
  }
}

/** How long the storefront waits after a filter click before it updates the list. */
export async function saveFilterDelay(delay: number): Promise<FilterActionResult> {
  try {
    await requireCatalogAdmin();
    await connectToDB();
    const value = Math.round(Number(delay));
    if (!Number.isFinite(value) || value < 0 || value > 2000) return { ok: false, error: "Оберіть затримку зі списку." };

    await Filter.updateOne({}, { $set: { delay: value } }, { upsert: true });
    await afterFilterWrite();
    return { ok: true, message: "Затримку збережено." };
  } catch (error: any) {
    return { ok: false, error: error?.message ?? "Не вдалося зберегти." };
  }
}

/**
 * Replaces the filter params of one category. Product counts are taken from
 * the database, not from the browser.
 */
export async function saveFilterCategory(
  categoryId: string,
  params: { name: string; kind: "select" | "unit"; unit?: string }[],
): Promise<FilterActionResult> {
  try {
    await requireCatalogAdmin();
    await connectToDB();
    if (!isObjectIdLike(categoryId)) return { ok: false, error: "Категорію не знайдено." };
    const id = new ObjectId(categoryId);
    if (!(await Category.exists({ _id: id }))) return { ok: false, error: "Категорію не знайдено." };

    const cleaned: { name: string; type: string }[] = [];
    for (const param of params) {
      const name = String(param?.name ?? "").trim();
      if (!name || cleaned.some((entry) => entry.name === name)) continue;
      const type = filterParamType(param.kind, param.unit);
      if (!type) return { ok: false, error: `Для «${name}» вкажіть одиницю виміру (без дефісу).` };
      cleaned.push({ name, type });
    }

    const counts = cleaned.length
      ? await Product.aggregate<{ _id: string; products: number }>([
          { $match: { _id: { $ne: new ObjectId(DELETED_PRODUCT_ID) }, category: id, "params.name": { $in: cleaned.map((param) => param.name) } } },
          { $project: { names: { $setUnion: ["$params.name", []] } } },
          { $unwind: "$names" },
          { $match: { names: { $in: cleaned.map((param) => param.name) } } },
          { $group: { _id: "$names", products: { $sum: 1 } } },
        ])
      : [];
    const byName = new Map(counts.map((row) => [row._id, row.products]));
    const entry = { categoryId: id, params: cleaned.map((param) => ({ ...param, totalProducts: byName.get(param.name) ?? 0 })) };

    // Remove the old entry for this category, then add the new one (when it has params).
    await Filter.updateOne({}, { $pull: { categories: { categoryId: id } } }, { upsert: true });
    if (entry.params.length) await Filter.updateOne({}, { $push: { categories: entry } });

    await afterFilterWrite();
    return { ok: true, message: entry.params.length ? `Збережено. У фільтрі ${entry.params.length} ${pluralUk(entry.params.length, "характеристика", "характеристики", "характеристик")}.` : "Збережено. Фільтр для цієї категорії вимкнено." };
  } catch (error: any) {
    return { ok: false, error: error?.message ?? "Не вдалося зберегти." };
  }
}
