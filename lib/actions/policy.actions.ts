"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { AccessDenied, requireAdmin } from "@/lib/auth/guards";
import { CONTENT_TAG, storeSetting } from "@/lib/content/server";
import { POLICIES_KEY, cleanPolicies, type PolicyErrors, type StorePolicies } from "@/lib/policies";

/*
 * Saving the return and delivery terms from the admin panel ("Налаштування" →
 * "Доставка і повернення"). A public endpoint like every server action: it
 * checks for an administrator first and stores only what cleanPolicies() lets
 * through.
 */

export type PolicySaveResult = { ok: true; policies: StorePolicies } | { ok: false; error: string; errors?: PolicyErrors };

export async function savePolicies(input: unknown): Promise<PolicySaveResult> {
  try {
    const admin = await requireAdmin();
    const { policies, errors } = cleanPolicies(input && typeof input === "object" ? input : {});
    const problems = Object.keys(errors).length;
    if (problems > 0) return { ok: false, errors, error: problems === 1 ? "Виправте позначене поле." : `Виправте позначені поля: їх ${problems}.` };

    await storeSetting(POLICIES_KEY, policies, admin.name || admin.email);
    // The terms are in the markup of the home page and of every product page.
    revalidateTag(CONTENT_TAG);
    revalidatePath("/", "layout");
    return { ok: true, policies };
  } catch (error) {
    if (error instanceof AccessDenied) return { ok: false, error: "Змінювати умови може лише адміністратор. Увійдіть під обліковим записом адміністратора." };
    console.error("[policies]", error instanceof Error ? error.message : error);
    return { ok: false, error: "Не вдалося зберегти через помилку на сервері. Спробуйте ще раз." };
  }
}
