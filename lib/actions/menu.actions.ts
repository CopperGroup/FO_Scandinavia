"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { loadCategoryOptions } from "@/lib/admin/categories";
import { AccessDenied, requireAdmin } from "@/lib/auth/guards";
import type { MenuConfig } from "@/lib/catalog/departments";
import { CONTENT_TAG, removeSetting, storeSetting } from "@/lib/content/server";
import { MENU_KEY, cleanMenu, type MenuErrors } from "@/lib/menu";

/*
 * Saving the menu row of the shop from the admin panel ("Меню"). Public
 * endpoints like every server action: each one checks for an administrator
 * first and stores only what cleanMenu() lets through.
 */

export type MenuSaveResult = { ok: true; menu: MenuConfig } | { ok: false; error: string; errors?: MenuErrors };

function refresh() {
  // The menu is on every page of the shop.
  revalidateTag(CONTENT_TAG);
  revalidatePath("/", "layout");
}

function failure(error: unknown): { ok: false; error: string } {
  if (error instanceof AccessDenied) return { ok: false, error: "Змінювати меню може лише адміністратор. Увійдіть під обліковим записом адміністратора." };
  console.error("[menu]", error instanceof Error ? error.message : error);
  return { ok: false, error: "Не вдалося зберегти через помилку на сервері. Спробуйте ще раз." };
}

export async function saveMenu(input: unknown): Promise<MenuSaveResult> {
  try {
    const admin = await requireAdmin();
    // Only categories that exist can be listed: a deleted one is dropped here, not shown as a dead link.
    const known = new Set((await loadCategoryOptions()).map((category) => category.id));
    const { menu, errors } = cleanMenu(input, { strict: true, knownCategoryIds: known });
    const problems = Object.keys(errors).length;
    if (problems > 0) return { ok: false, errors, error: problems === 1 ? "Виправте позначене поле." : `Виправте позначені поля: їх ${problems}.` };

    await storeSetting(MENU_KEY, menu, admin.name || admin.email);
    refresh();
    return { ok: true, menu };
  } catch (error) {
    return failure(error);
  }
}

/** Back to the automatic menu: the saved one is removed. */
export async function resetMenu(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    await removeSetting(MENU_KEY);
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
