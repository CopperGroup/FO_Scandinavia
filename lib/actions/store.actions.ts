"use server"

import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { requireAdmin } from "../auth/guards";
import { GUID, getDeliverySettings, readLocal, writeLocal, type SenderBranch } from "../admin/delivery";
import { checkKey, type KeyCheck } from "../admin/novaposhta";
import { readPastedKey, removeNovaPoshtaKey, storeNovaPoshtaKey } from "../admin/np-key";
import { canSealSecrets } from "../secrets";

/*
 * Nova Poshta sender settings (branches the shop ships from, sender data).
 * Every action is staff-only: these were public endpoints before.
 */

type Result = { ok: true } | { ok: false; error: string };

const clean = (value: unknown, max = 200) => (typeof value === "string" ? value.trim().slice(0, max) : "");

function done(): Result {
  revalidatePath("/admin/delivery");
  return { ok: true };
}

/** Adds a branch the shop sends parcels from. The first one becomes the default. */
export async function addSenderBranch(input: { cityName: string; cityRef: string; warehouseName: string; warehouseRef: string }): Promise<Result> {
  await requireAdmin();
  const branch: Omit<SenderBranch, "id"> = {
    cityName: clean(input?.cityName),
    cityRef: clean(input?.cityRef, 36),
    warehouseName: clean(input?.warehouseName, 300),
    warehouseRef: clean(input?.warehouseRef, 36),
  };
  if (!GUID.test(branch.cityRef) || !GUID.test(branch.warehouseRef) || !branch.cityName || !branch.warehouseName) {
    return { ok: false, error: "Оберіть місто і відділення зі списку." };
  }

  const { store, local } = await readLocal();
  const novapost = local.delivery.novapost;
  if ((novapost.warehouses as any[]).some((row) => row?.warehouseRef === branch.warehouseRef)) {
    return { ok: false, error: "Це відділення вже є у списку." };
  }
  const id = uuidv4();
  novapost.warehouses.push({ id, ...branch });
  if (!novapost.defaultWarehouseId) novapost.defaultWarehouseId = id;
  await writeLocal(store, local);
  return done();
}

export async function removeSenderBranch(id: string): Promise<Result> {
  await requireAdmin();
  const { store, local } = await readLocal();
  const novapost = local.delivery.novapost;
  const before = (novapost.warehouses as any[]).length;
  novapost.warehouses = (novapost.warehouses as any[]).filter((row) => row?.id !== id);
  if (novapost.warehouses.length === before) return { ok: false, error: "Відділення вже видалено. Оновіть сторінку." };
  if (novapost.defaultWarehouseId === id) novapost.defaultWarehouseId = novapost.warehouses[0]?.id ?? null;
  await writeLocal(store, local);
  return done();
}

export async function setDefaultSenderBranch(id: string): Promise<Result> {
  await requireAdmin();
  const { store, local } = await readLocal();
  const novapost = local.delivery.novapost;
  if (!(novapost.warehouses as any[]).some((row) => row?.id === id)) return { ok: false, error: "Такого відділення немає. Оновіть сторінку." };
  novapost.defaultWarehouseId = id;
  await writeLocal(store, local);
  return done();
}

/**
 * Saves the sender data used in waybills. An empty field falls back to the
 * value from the server settings (environment), if there is one.
 */
export async function saveSenderDetails(input: { counterpartyRef: string; contactRef: string; phone: string; name: string }): Promise<Result & { field?: string }> {
  await requireAdmin();
  const counterpartyRef = clean(input?.counterpartyRef, 36);
  const contactRef = clean(input?.contactRef, 36);
  const phone = clean(input?.phone, 20).replace(/[^\d+]/g, "");
  const name = clean(input?.name, 120);

  if (counterpartyRef && !GUID.test(counterpartyRef)) return { ok: false, field: "counterpartyRef", error: "Код відправника має вигляд 8-4-4-4-12 символів, як у кабінеті Нової пошти." };
  if (contactRef && !GUID.test(contactRef)) return { ok: false, field: "contactRef", error: "Код контактної особи має вигляд 8-4-4-4-12 символів." };
  if (phone && phone.replace(/\D/g, "").length < 10) return { ok: false, field: "phone", error: "Вкажіть телефон повністю, наприклад 380501234567." };

  const { store, local } = await readLocal();
  local.delivery.novapost.sender = { counterpartyRef, contactRef, phone, name };
  await writeLocal(store, local);
  return done();
}

/* ------------------------------------------------------------------ */
/* The Nova Poshta API key                                             */
/* ------------------------------------------------------------------ */

/**
 * Saves the key pasted on the delivery page. It is sealed before it reaches
 * the database and is never sent back: the page only learns that it is saved.
 */
export async function saveNovaPoshtaKey(input: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!canSealSecrets()) return { ok: false, error: "Сервер не може зберігати ключі безпечно. Попросіть розробника задати SETTINGS_SECRET у налаштуваннях сервера." };
  const pasted = readPastedKey(input);
  if (!pasted.ok) return pasted;
  try {
    await storeNovaPoshtaKey(pasted.key, admin.name || admin.email);
  } catch {
    return { ok: false, error: "Не вдалося зберегти ключ. Спробуйте ще раз." };
  }
  return done();
}

/** Deletes the saved key. The shop then uses the key from the server settings, if there is one. */
export async function deleteNovaPoshtaKey(): Promise<Result> {
  await requireAdmin();
  try {
    await removeNovaPoshtaKey();
  } catch {
    return { ok: false, error: "Не вдалося видалити ключ. Спробуйте ще раз." };
  }
  return done();
}

/** Asks Nova Poshta whether the current key is accepted; a read-only call. */
export async function checkNovaPoshtaKey(): Promise<KeyCheck> {
  await requireAdmin();
  return checkKey();
}

/** Saved branches as JSON (the older shape some screens read). */
export async function getWarehouses(): Promise<string> {
  await requireAdmin();
  const settings = await getDeliverySettings();
  return JSON.stringify(settings.branches);
}
