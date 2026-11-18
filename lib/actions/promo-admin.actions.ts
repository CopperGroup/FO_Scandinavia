"use server";

import mongoose from "mongoose";
import { revalidatePath, revalidateTag } from "next/cache";
import { AccessDenied, requireAdmin } from "@/lib/auth/guards";
import { CONTENT_TAG, storeSetting } from "@/lib/content/server";
import { MailNotConfigured } from "@/lib/email/confirm-account";
import { sendPromoCodeEmail } from "@/lib/email/promo-code";
import PromoCode from "@/lib/models/promocode.model";
import User from "@/lib/models/user.model";
import { connectToDB } from "@/lib/mongoose";
import { PROMO_REWARDS_KEY, cleanPromoInput, cleanPromoRewards, type PromoErrors, type PromoRewardErrors, type PromoRewards } from "@/lib/promo/rules";
import type { PromoRow } from "@/lib/promo/server";

/*
 * What the admin panel does with promo codes ("Промокоди"). Every export is a
 * public endpoint, so each one starts by checking for an administrator and
 * stores only what the cleaning functions of lib/promo/rules.ts let through.
 */

const LIST = "/admin/promocodes";
const NOT_ADMIN = "Керувати промокодами може лише адміністратор. Увійдіть під обліковим записом адміністратора.";
const SERVER_ERROR = "Не вдалося зберегти через помилку на сервері. Спробуйте ще раз.";

function failure(error: unknown, scope: string): { ok: false; error: string } {
  if (error instanceof AccessDenied) return { ok: false, error: NOT_ADMIN };
  console.error(`[promo] ${scope}:`, error instanceof Error ? error.message : error);
  return { ok: false, error: SERVER_ERROR };
}

const isDuplicateKey = (error: unknown) => (error as { code?: number })?.code === 11000;

export type PromoSaveResult = { ok: true; id: string } | { ok: false; error: string; errors?: PromoErrors };

/** Creates a code (no `id`) or changes one. */
export async function savePromoCode(input: unknown, id?: string): Promise<PromoSaveResult> {
  try {
    const admin = await requireAdmin();
    const { value, errors } = cleanPromoInput(input && typeof input === "object" ? (input as Record<string, unknown>) : {});
    const refuse = (more: PromoErrors = {}): PromoSaveResult => {
      const all = { ...errors, ...more };
      const count = Object.keys(all).length;
      return { ok: false, errors: all, error: count === 1 ? "Виправте позначене поле." : `Виправте позначені поля: їх ${count}.` };
    };
    if (Object.keys(errors).length > 0) return refuse();

    await connectToDB();
    if (value.ownerId && !(await User.exists({ _id: value.ownerId }))) return refuse({ ownerId: "Такого покупця вже немає. Оберіть іншого." });

    const fields = {
      code: value.code,
      percent: value.percent,
      owner: value.ownerId,
      startDay: value.startDay,
      endDay: value.endDay,
      maxUses: value.ownerId ? null : value.maxUses, // a personal code has one customer: their limit is the limit
      perCustomer: value.perCustomer,
      minOrder: value.minOrder,
      active: value.active,
      note: value.note,
    };

    if (!id) {
      try {
        const created = await PromoCode.create({ ...fields, source: "admin", createdBy: admin.name || admin.email });
        revalidatePath(LIST);
        return { ok: true, id: String(created._id) };
      } catch (error) {
        if (isDuplicateKey(error)) return refuse({ code: "Такий код уже є. Введіть інший або натисніть «Згенерувати»." });
        throw error;
      }
    }

    if (!mongoose.isValidObjectId(id)) return { ok: false, error: "Цей промокод не знайдено. Можливо, його видалили." };
    const existing = await PromoCode.findById(id).select("code owner usedCount").lean<PromoRow>();
    if (!existing) return { ok: false, error: "Цей промокод не знайдено. Можливо, його видалили." };
    if ((existing.usedCount ?? 0) > 0) {
      // Orders already carry this code: who it is for and how it is written stay as they were.
      const more: PromoErrors = {};
      if (existing.code !== value.code) more.code = "Цим кодом уже скористалися, тому його текст змінити не можна. Створіть новий код.";
      if (String(existing.owner ?? "") !== String(value.ownerId ?? "")) more.ownerId = "Цим кодом уже скористалися, тому змінити, для кого він, не можна.";
      if (Object.keys(more).length > 0) return refuse(more);
    }
    try {
      await PromoCode.updateOne({ _id: id }, { $set: fields });
    } catch (error) {
      if (isDuplicateKey(error)) return refuse({ code: "Такий код уже є. Введіть інший." });
      throw error;
    }
    revalidatePath(LIST);
    revalidatePath(`${LIST}/${id}`);
    return { ok: true, id };
  } catch (error) {
    return failure(error, "save");
  }
}

export type PromoActionResult = { ok: true } | { ok: false; error: string };

/** Switches a code off (nobody can use it) or back on. */
export async function setPromoCodeActive(id: string, active: boolean): Promise<PromoActionResult> {
  try {
    await requireAdmin();
    if (!mongoose.isValidObjectId(id)) return { ok: false, error: "Цей промокод не знайдено." };
    await connectToDB();
    const result = await PromoCode.updateOne({ _id: id }, { $set: { active: active === true } });
    if (result.matchedCount === 0) return { ok: false, error: "Цей промокод не знайдено. Можливо, його видалили." };
    revalidatePath(LIST);
    revalidatePath(`${LIST}/${id}`);
    return { ok: true };
  } catch (error) {
    return failure(error, "switch");
  }
}

/** Deletes a code nobody has used. A used one stays as the record of those orders: switch it off instead. */
export async function deletePromoCode(id: string): Promise<PromoActionResult> {
  try {
    await requireAdmin();
    if (!mongoose.isValidObjectId(id)) return { ok: false, error: "Цей промокод не знайдено." };
    await connectToDB();
    const result = await PromoCode.deleteOne({ _id: id, usedCount: { $lte: 0 } });
    if (result.deletedCount === 0) {
      const exists = await PromoCode.exists({ _id: id });
      return { ok: false, error: exists ? "Цим кодом уже скористалися, тому видалити його не можна. Вимкніть його, і він перестане діяти." : "Цей промокод уже видалено." };
    }
    revalidatePath(LIST);
    return { ok: true };
  } catch (error) {
    return failure(error, "delete");
  }
}

/** Sends a personal code to its owner by e-mail. */
export async function emailPromoCode(id: string): Promise<PromoActionResult> {
  try {
    await requireAdmin();
    if (!mongoose.isValidObjectId(id)) return { ok: false, error: "Цей промокод не знайдено." };
    await connectToDB();
    const promo = await PromoCode.findById(id).select("-uses").lean<PromoRow>();
    if (!promo) return { ok: false, error: "Цей промокод не знайдено. Можливо, його видалили." };
    if (!promo.owner) return { ok: false, error: "Спільний код не має одного отримувача. Поширте його самі: у соцмережах чи розсилці." };
    const owner = await User.findById(promo.owner).select("email").lean<{ email?: string }>();
    if (!owner?.email) return { ok: false, error: "У цього покупця немає адреси e-mail." };
    try {
      await sendPromoCodeEmail(owner.email, { code: promo.code, percent: promo.percent, startDay: promo.startDay ?? null, endDay: promo.endDay ?? null, minOrder: promo.minOrder ?? 0, uses: promo.perCustomer ?? 1 });
    } catch (error) {
      console.error("[promo] letter:", error instanceof Error ? error.message : error);
      return { ok: false, error: error instanceof MailNotConfigured ? "Пошта магазину не налаштована, тому лист не надіслано." : "Лист не вдалося надіслати. Спробуйте ще раз за хвилину." };
    }
    return { ok: true };
  } catch (error) {
    return failure(error, "letter");
  }
}

export type PromoRewardsResult = { ok: true; rewards: PromoRewards } | { ok: false; error: string; errors?: PromoRewardErrors };

/** The codes the shop gives by itself: for registering and for a review. */
export async function savePromoRewards(input: unknown): Promise<PromoRewardsResult> {
  try {
    const admin = await requireAdmin();
    const { rewards, errors } = cleanPromoRewards(input);
    const count = Object.keys(errors).length;
    if (count > 0) return { ok: false, errors, error: count === 1 ? "Виправте позначене поле." : `Виправте позначені поля: їх ${count}.` };

    await storeSetting(PROMO_REWARDS_KEY, rewards, admin.name || admin.email);
    // The size of the welcome code is in the texts of the registration and checkout pages.
    revalidateTag(CONTENT_TAG);
    revalidatePath("/", "layout");
    return { ok: true, rewards };
  } catch (error) {
    return failure(error, "rewards");
  }
}
