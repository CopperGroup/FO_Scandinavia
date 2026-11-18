"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { AccessDenied, requireAdmin } from "@/lib/auth/guards";
import { cleanContent, contentPage, type ContentKey, type ContentValues } from "@/lib/content/schema";
import { CONTENT_TAG, contentDefaults, getVariablesForEditor, removeContent, removeDraft, storeContent, storeDraft, storeVariables, variableUsage } from "@/lib/content/server";
import { cleanVariables, knownNames, token, unknownNames, type VariableValues } from "@/lib/content/variables";

/*
 * Saving the texts of the storefront from the admin panel ("Сторінки").
 * Public endpoints like every server action: each one checks for an
 * administrator first, and takes nothing on trust: the values are brought to
 * the shape of lib/content/schema.ts before they are stored.
 */

export type ContentSaveResult = { ok: true; values: ContentValues } | { ok: false; error: string; errors?: Record<string, string> };

function refresh() {
  // Every page of the shop reads the texts through one cached read; the footer and the cart are on all of them.
  revalidateTag(CONTENT_TAG);
  revalidatePath("/", "layout");
}

function failure(error: unknown): ContentSaveResult {
  if (error instanceof AccessDenied) return { ok: false, error: "Змінювати тексти сайту може лише адміністратор. Увійдіть під обліковим записом адміністратора." };
  console.error("[content]", error instanceof Error ? error.message : error);
  return { ok: false, error: "Не вдалося зберегти через помилку на сервері. Спробуйте ще раз." };
}

export async function saveSiteContent(key: string, input: unknown): Promise<ContentSaveResult> {
  try {
    const admin = await requireAdmin();
    const page = contentPage(key);
    if (!page) return { ok: false, error: "Такої сторінки немає. Оновіть сторінку і спробуйте ще раз." };

    const { values, errors } = cleanContent(page, input, { strict: true, fallback: contentDefaults(page) });
    // A name in braces must belong to a variable: a customer must never read "{телефонн}".
    const known = knownNames((await getVariablesForEditor()).values);
    for (const [where, names] of Object.entries(unknownNames(values, known))) {
      errors[where] ??= `Немає змінної ${names.map(token).join(", ")}. Перевірте назву або створіть її в «Налаштуваннях».`;
    }
    const problems = Object.keys(errors).length;
    if (problems > 0) {
      return { ok: false, errors, error: problems === 1 ? "Виправте позначене поле." : `Виправте позначені поля: їх ${problems}.` };
    }

    await storeContent(page.key as ContentKey, values, admin.name || admin.email);
    await removeDraft(page.key);
    refresh();
    return { ok: true, values };
  } catch (error) {
    return failure(error);
  }
}

/** Puts back the texts the site came with. */
export async function resetSiteContent(key: string): Promise<ContentSaveResult> {
  try {
    await requireAdmin();
    const page = contentPage(key);
    if (!page) return { ok: false, error: "Такої сторінки немає. Оновіть сторінку і спробуйте ще раз." };
    await removeContent(page.key as ContentKey);
    refresh();
    return { ok: true, values: contentDefaults(page) };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Keeps what the editor holds, unsaved, for its preview frame. Customers never
 * see it: only a request marked as a preview and made by an administrator does.
 */
export async function saveSiteContentDraft(key: string, input: unknown): Promise<{ ok: boolean }> {
  try {
    await requireAdmin();
    const page = contentPage(key);
    if (!page) return { ok: false };
    // Stored in the page's shape, but as typed: limits are checked on saving, not while typing.
    await storeDraft(page.key, cleanContent(page, input, { strict: true, fallback: contentDefaults(page) }).values);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function discardSiteContentDraft(key: string): Promise<{ ok: boolean }> {
  try {
    await requireAdmin();
    const page = contentPage(key);
    if (!page) return { ok: false };
    await removeDraft(page.key);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/* ------------------------------------------------------------------ */
/* Variables: the contacts of the shop and the admin's own values      */
/* ------------------------------------------------------------------ */

export type VariablesSaveResult = { ok: true; values: VariableValues } | { ok: false; error: string; errors?: Record<string, string> };

export async function saveSiteVariables(input: unknown): Promise<VariablesSaveResult> {
  try {
    const admin = await requireAdmin();
    const { values, errors } = cleanVariables(input, { strict: true });

    // A variable that texts still name cannot go: those texts would show its bare name.
    const before = (await getVariablesForEditor()).values.custom.map((variable) => variable.name);
    const kept = new Set(values.custom.map((variable) => variable.name));
    const usage = await variableUsage(before.filter((name) => !kept.has(name)));
    const blocked = Object.entries(usage);
    if (blocked.length > 0) {
      const [name, pages] = blocked[0];
      return {
        ok: false,
        errors,
        error: `Змінна ${token(name)} стоїть у текстах: ${pages.map((title) => `«${title}»`).join(", ")}. Спершу приберіть її звідти, тоді видаляйте.`,
      };
    }

    const problems = Object.keys(errors).length;
    if (problems > 0) return { ok: false, errors, error: problems === 1 ? "Виправте позначене поле." : `Виправте позначені поля: їх ${problems}.` };

    await storeVariables(values, admin.name || admin.email);
    refresh();
    return { ok: true, values };
  } catch (error) {
    const failed = failure(error);
    return failed.ok ? { ok: false, error: "Не вдалося зберегти. Спробуйте ще раз." } : { ok: false, error: failed.error };
  }
}
