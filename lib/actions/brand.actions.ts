"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import clearCache from "@/lib/actions/cache";
import { savedBrandNames } from "@/lib/admin/brands";
import { AccessDenied, requireAdmin } from "@/lib/auth/guards";
import { BRANDS_KEY, NO_BRAND, brandKey, brandNameProblem, brandTwinKey, cleanBrandName } from "@/lib/brands";
import { escapeRegExp } from "@/lib/catalog/text";
import { CONTENT_TAG, storeSetting } from "@/lib/content/server";
import Product from "@/lib/models/product.model";
import { connectToDB } from "@/lib/mongoose";

/*
 * The brand list of the admin panel ("Бренди"). Public endpoints like every
 * server action: each one checks for an administrator first.
 *
 * A brand is the "vendor" of a product. Renaming a brand rewrites that field
 * on every product that carries it; giving it the name of another brand joins
 * the two.
 */

export type BrandResult = { ok: true; message: string } | { ok: false; error: string };

function failure(error: unknown): { ok: false; error: string } {
  if (error instanceof AccessDenied) return { ok: false, error: "Змінювати бренди може лише адміністратор. Увійдіть під обліковим записом адміністратора." };
  console.error("[brands]", error instanceof Error ? error.message : error);
  return { ok: false, error: "Не вдалося зберегти через помилку на сервері. Спробуйте ще раз." };
}

/** Products that carry this brand, whatever spaces surround the name in the record (the list shows names trimmed). */
const withBrand = (name: string) => ({ vendor: { $regex: `^\\s*${escapeRegExp(name)}\\s*$` } });

async function storeNames(names: string[], by: string) {
  await storeSetting(BRANDS_KEY, { names }, by);
  revalidateTag(CONTENT_TAG);
  revalidatePath("/admin/brands");
}

/** Adds a brand to the list, so it can be chosen for a product. */
export async function addBrand(input: unknown): Promise<BrandResult> {
  try {
    const admin = await requireAdmin();
    const name = cleanBrandName(input);
    const problem = brandNameProblem(name);
    if (problem) return { ok: false, error: problem };

    await connectToDB();
    const saved = await savedBrandNames();
    const inUse = (await Product.distinct("vendor")) as string[];
    // Another spelling of a brand that is already there ("ELLOS" next to "Ellos") is not a new brand.
    const twin = [...saved, ...inUse].map((existing) => String(existing ?? "").trim()).find((existing) => existing && existing !== NO_BRAND && brandTwinKey(existing) === brandTwinKey(name));
    if (twin) return { ok: false, error: `Бренд «${twin}» уже є у списку.` };

    await storeNames([...saved, name], admin.name || admin.email);
    return { ok: true, message: `Бренд «${name}» додано. Тепер його можна вибрати в товарі.` };
  } catch (error) {
    return failure(error);
  }
}

/** Renames a brand on all its products. If the new name is another brand, the two become one. */
export async function renameBrand(from: unknown, to: unknown): Promise<BrandResult> {
  try {
    const admin = await requireAdmin();
    const oldName = typeof from === "string" ? from.trim() : "";
    const name = cleanBrandName(to);
    if (!oldName || oldName === NO_BRAND) return { ok: false, error: "Такого бренду немає. Оновіть сторінку." };
    const problem = brandNameProblem(name);
    if (problem) return { ok: false, error: problem };
    if (name === oldName) return { ok: false, error: "Назва та сама: нічого не змінилося." };

    await connectToDB();
    const result = await Product.updateMany(withBrand(oldName), { $set: { vendor: name } });
    const moved = result.modifiedCount ?? 0;

    // The hand-made list follows: the old name goes, the new one stays once.
    const saved = await savedBrandNames();
    const next = saved.filter((entry) => brandKey(entry) !== brandKey(oldName) && brandKey(entry) !== brandKey(name));
    const stillNeeded = moved === 0 && !(await Product.exists({ vendor: name }));
    if (saved.length !== next.length || stillNeeded) await storeNames(stillNeeded ? [...next, name] : next, admin.name || admin.email);

    if (moved > 0) await clearCache("updateProducts");
    revalidatePath("/admin/brands");
    return { ok: true, message: moved > 0 ? `Готово: «${oldName}» тепер «${name}». Змінено товарів: ${moved}.` : `Готово: «${oldName}» тепер «${name}».` };
  } catch (error) {
    return failure(error);
  }
}

/** Removes a brand that no product carries from the list. */
export async function removeBrand(input: unknown): Promise<BrandResult> {
  try {
    const admin = await requireAdmin();
    const name = typeof input === "string" ? input.trim() : "";
    if (!name) return { ok: false, error: "Такого бренду немає. Оновіть сторінку." };

    await connectToDB();
    const used = await Product.countDocuments(withBrand(name));
    if (used > 0) return { ok: false, error: `Бренд «${name}» стоїть у товарах (${used}). Спершу змініть бренд у цих товарах або перейменуйте його.` };

    const saved = await savedBrandNames();
    await storeNames(saved.filter((entry) => brandKey(entry) !== brandKey(name)), admin.name || admin.email);
    return { ok: true, message: `Бренд «${name}» прибрано зі списку.` };
  } catch (error) {
    return failure(error);
  }
}
