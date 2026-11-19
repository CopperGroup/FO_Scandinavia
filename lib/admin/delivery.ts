import Order from "@/lib/models/order.model";
import Store from "@/lib/models/store.model";
import { connectToDB } from "@/lib/mongoose";
import { pageWindow } from "./list";
import { novaPoshtaKeyStatus, type KeyStatus } from "./np-key";

/**
 * Nova Poshta settings and lists for the "Доставка" admin page. Server-only.
 *
 * The settings live in the store document's `local` JSON (as they always
 * have): delivery.novapost = { warehouses, defaultWarehouseId, sender }.
 * The API key is not there: it is sealed in its own collection (np-key.ts)
 * and is never shown.
 */

export type SenderBranch = { id: string; cityName: string; cityRef: string; warehouseName: string; warehouseRef: string };
export type SenderDetails = { counterpartyRef: string; contactRef: string; phone: string; name: string };
export type DeliverySettings = {
  branches: SenderBranch[];
  defaultBranchId: string | null;
  /** What waybills are created with: saved values, else the environment. */
  sender: SenderDetails;
  /** Only what was saved on the delivery page (empty fields fall back to the environment). */
  savedSender: SenderDetails;
  senderSource: { counterpartyRef: Source; contactRef: Source; phone: Source };
  apiKeySet: boolean;
  /** Where the API key comes from and what may be shown of it. Never the key. */
  apiKey: KeyStatus;
};
type Source = "saved" | "env" | "missing";

export const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const NO_KEY = "Нова пошта не підключена: немає ключа API. Вставте його на вкладці «Відправник».";

/** The raw `local` JSON of the store document (created when missing). */
export async function readLocal(): Promise<{ store: any; local: any }> {
  await connectToDB();
  let store = await Store.findOne().select("_id local");
  if (!store) store = await Store.create({});
  let local: any = {};
  try {
    local = JSON.parse(store.local || "{}") ?? {};
  } catch {
    local = {};
  }
  local.delivery ??= {};
  local.delivery.novapost ??= {};
  local.delivery.novapost.warehouses ??= [];
  return { store, local };
}

export async function writeLocal(store: any, local: any): Promise<void> {
  await Store.updateOne({ _id: store._id }, { $set: { local: JSON.stringify(local) } });
}

function pick(saved: unknown, env: string | undefined): { value: string; source: Source } {
  const fromSaved = typeof saved === "string" ? saved.trim() : "";
  if (fromSaved) return { value: fromSaved, source: "saved" };
  const fromEnv = env?.trim() ?? "";
  return fromEnv ? { value: fromEnv, source: "env" } : { value: "", source: "missing" };
}

export async function getDeliverySettings(): Promise<DeliverySettings> {
  const [{ local }, apiKey] = await Promise.all([readLocal(), novaPoshtaKeyStatus()]);
  const novapost = local.delivery.novapost;
  const branches: SenderBranch[] = (novapost.warehouses as any[])
    .filter((row) => row && row.id && row.warehouseRef)
    .map((row) => ({
      id: String(row.id),
      cityName: String(row.cityName ?? ""),
      cityRef: String(row.cityRef ?? ""),
      warehouseName: String(row.warehouseName ?? ""),
      warehouseRef: String(row.warehouseRef ?? ""),
    }));
  const savedDefault = branches.some((branch) => branch.id === novapost.defaultWarehouseId) ? String(novapost.defaultWarehouseId) : null;

  const sender = novapost.sender ?? {};
  const counterpartyRef = pick(sender.counterpartyRef, process.env.NOVA_SENDER_REF);
  const contactRef = pick(sender.contactRef, process.env.NOVA_SENDER_CONTACT_REF);
  const phone = pick(sender.phone, process.env.NOVA_SENDER_PHONE);

  return {
    branches,
    // With one branch there is nothing to choose: it is the default.
    defaultBranchId: savedDefault ?? branches[0]?.id ?? null,
    sender: { counterpartyRef: counterpartyRef.value, contactRef: contactRef.value, phone: phone.value, name: String(sender.name ?? "") },
    savedSender: {
      counterpartyRef: String(sender.counterpartyRef ?? ""),
      contactRef: String(sender.contactRef ?? ""),
      phone: String(sender.phone ?? ""),
      name: String(sender.name ?? ""),
    },
    senderSource: { counterpartyRef: counterpartyRef.source, contactRef: contactRef.source, phone: phone.source },
    apiKeySet: apiKey.source !== "missing",
    apiKey,
  };
}

/** What is missing before a waybill can be created, in plain words. Empty when ready. */
export function deliveryProblems(settings: DeliverySettings): string[] {
  const problems: string[] = [];
  if (!settings.apiKeySet) problems.push(NO_KEY);
  if (!settings.sender.counterpartyRef || !settings.sender.contactRef || !settings.sender.phone) problems.push("Не заповнені дані відправника.");
  if (settings.branches.length === 0) problems.push("Не додано жодного відділення, з якого ви відправляєте.");
  return problems;
}

/* ------------------------------------------------------------------ */
/* Lists                                                               */
/* ------------------------------------------------------------------ */

/**
 * Waiting to be shipped: new orders without a waybill that are either paid or
 * cash on delivery, sent by Nova Poshta.
 */
export const AWAITING_FILTER = {
  deliveryStatus: "Proceeding",
  isTest: { $ne: true },
  deliveryMethod: { $regex: "^Нова пошта" },
  invoiceString: { $in: [null, ""] },
  $or: [{ paymentStatus: "Success" }, { paymentType: "Накладний платіж" }],
};

export const WAYBILL_FILTER = { invoiceString: { $nin: [null, ""] }, isTest: { $ne: true } };

export type AwaitingRow = {
  _id: string;
  id: string;
  date: string | null;
  recipient: string;
  phone: string;
  city: string;
  warehouse: string;
  value: number;
  paymentType: string;
  paymentStatus: string;
  ready: boolean;
};

export type WaybillRow = {
  _id: string;
  id: string;
  number: string;
  recipient: string;
  city: string;
  date: string | null;
  cost: number | null;
  estimated: string;
  status: string;
  checkedAt: string | null;
  deliveryStatus: string;
};

export async function countDelivery(): Promise<{ awaiting: number; waybills: number }> {
  await connectToDB();
  const [awaiting, waybills] = await Promise.all([Order.countDocuments(AWAITING_FILTER), Order.countDocuments(WAYBILL_FILTER)]);
  return { awaiting, waybills };
}

export async function listAwaiting({ page, pageSize }: { page: number; pageSize: number }) {
  await connectToDB();
  const total = await Order.countDocuments(AWAITING_FILTER);
  const window = pageWindow(total, page, pageSize);
  const orders = await Order.find(AWAITING_FILTER)
    .sort({ data: 1 }) // oldest first: they have waited longest
    .skip(window.skip)
    .limit(pageSize)
    .select("_id id data name surname phoneNumber city warehouse value paymentType paymentStatus cityRef warehouseRef")
    .lean<any[]>();
  const rows: AwaitingRow[] = orders.map((order) => ({
    _id: String(order._id),
    id: String(order.id),
    date: order.data ? new Date(order.data).toISOString() : null,
    recipient: [order.name, order.surname].filter(Boolean).join(" "),
    phone: order.phoneNumber ?? "",
    city: order.city ?? "",
    warehouse: order.warehouse ?? "",
    value: order.value ?? 0,
    paymentType: order.paymentType ?? "",
    paymentStatus: order.paymentStatus ?? "",
    ready: Boolean(order.cityRef && order.warehouseRef),
  }));
  return { rows, total, ...window };
}

export async function listWaybills({ page, pageSize, query }: { page: number; pageSize: number; query: string }) {
  await connectToDB();
  const search = query.replace(/\s/g, "");
  const filter = search ? { ...WAYBILL_FILTER, $or: [{ invoiceString: { $regex: search.replace(/\D/g, "") || "^$" } }, { id: search }] } : WAYBILL_FILTER;
  const total = await Order.countDocuments(filter);
  const window = pageWindow(total, page, pageSize);
  const orders = await Order.find(filter)
    .sort({ invoiceCreatedAt: -1, data: -1 })
    .skip(window.skip)
    .limit(pageSize)
    .select("_id id data name surname city invoice invoiceString invoiceStatus invoiceCheckedAt invoiceCreatedAt deliveryStatus")
    .lean<any[]>();

  const rows: WaybillRow[] = orders.map((order) => {
    let invoice: any = null;
    try {
      invoice = order.invoice ? JSON.parse(order.invoice) : null;
    } catch {
      invoice = null;
    }
    const cost = Number(invoice?.CostOnSite);
    return {
      _id: String(order._id),
      id: String(order.id),
      number: String(order.invoiceString),
      recipient: [order.name, order.surname].filter(Boolean).join(" "),
      city: order.city ?? "",
      date: order.invoiceCreatedAt ? new Date(order.invoiceCreatedAt).toISOString() : order.data ? new Date(order.data).toISOString() : null,
      cost: Number.isFinite(cost) ? cost : null,
      estimated: String(invoice?.EstimatedDeliveryDate ?? ""),
      status: String(order.invoiceStatus ?? ""),
      checkedAt: order.invoiceCheckedAt ? new Date(order.invoiceCheckedAt).toISOString() : null,
      deliveryStatus: order.deliveryStatus ?? "",
    };
  });
  return { rows, total, ...window };
}
