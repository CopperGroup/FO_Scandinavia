import { DateTime } from "luxon";
import { Store as StoreInfo } from "@/constants/store";
import Order from "@/lib/models/order.model";
import { connectToDB } from "@/lib/mongoose";
import { latinToKyrylic } from "@/lib/utils";
import { NO_KEY, deliveryProblems, getDeliverySettings, type DeliverySettings, type SenderBranch } from "./delivery";
import { getNovaPoshtaKey } from "./np-key";

/**
 * Waybills through the Nova Poshta API. Server-only; the guarded actions in
 * lib/actions/order.actions.ts call it. Messages are written for the shop
 * owner, since they are shown as they are.
 */

const API_URL = "https://api.novaposhta.ua/v2.0/json/";
const TIMEOUT_MS = 20_000;

export class DeliveryNotReady extends Error {}

/** One request to Nova Poshta; the parsed answer as it came. Throws only when there is no answer. */
async function post(apiKey: string, modelName: string, calledMethod: string, methodProperties: Record<string, unknown>): Promise<any> {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, modelName, calledMethod, methodProperties }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return await response.json();
  } catch {
    throw new Error("Нова пошта не відповіла. Спробуйте ще раз за хвилину.");
  }
}

async function call(modelName: string, calledMethod: string, methodProperties: Record<string, unknown>): Promise<any[]> {
  const apiKey = await getNovaPoshtaKey();
  if (!apiKey) throw new DeliveryNotReady(NO_KEY);

  const body = await post(apiKey, modelName, calledMethod, methodProperties);
  if (!body?.success || !Array.isArray(body.data) || body.data.length === 0) {
    const reason = Array.isArray(body?.errors) && body.errors.length ? body.errors.join(", ") : "без пояснення";
    throw new Error(`Нова пошта відмовила (${reason}).`);
  }
  return body.data;
}

const first = async (modelName: string, calledMethod: string, props: Record<string, unknown>) => (await call(modelName, calledMethod, props))[0];

function transliterate(text: unknown): string {
  return String(text ?? "").replace(/[A-Za-z]+/g, (match) => latinToKyrylic(match));
}

export type InvoiceSummary = { IntDocNumber: string; Ref?: string; CostOnSite?: number | string; EstimatedDeliveryDate?: string };

/** Resolves the branch to send from and checks the settings; throws DeliveryNotReady with what is missing. */
export function senderBranch(settings: DeliverySettings, branchId?: string | null): SenderBranch {
  const problems = deliveryProblems(settings);
  if (problems.length) throw new DeliveryNotReady(problems.join(" "));
  const branch = settings.branches.find((row) => row.id === (branchId || settings.defaultBranchId));
  if (!branch) throw new DeliveryNotReady("Оберіть відділення, з якого відправляєте.");
  return branch;
}

/**
 * Creates the waybill for one order from the order as stored, and saves its
 * number on the order. Four calls in a row: recipient, contact person,
 * delivery cost, waybill.
 */
export async function createWaybill(orderId: string, branch: SenderBranch, settings: DeliverySettings): Promise<InvoiceSummary> {
  await connectToDB();
  const order = await Order.findById(orderId)
    .select("id name surname phoneNumber email deliveryMethod cityRef warehouseRef warehouseIndex value paymentType invoiceString")
    .lean<any>();
  if (!order) throw new Error("Замовлення не знайдено.");
  if (order.invoiceString) throw new Error(`У замовлення №${order.id} вже є накладна ${order.invoiceString}.`);
  if (!order.cityRef || !order.warehouseRef) throw new Error(`У замовленні №${order.id} немає відділення Нової пошти: створіть накладну в кабінеті Нової пошти і введіть номер вручну.`);

  const serviceType = order.deliveryMethod === "Нова пошта (Поштомат)" ? "DoorsWarehouse" : "WarehouseWarehouse";

  const counterparty = await first("CounterpartyGeneral", "save", {
    FirstName: transliterate(order.name),
    MiddleName: "",
    LastName: transliterate(order.surname),
    Phone: String(order.phoneNumber ?? "").replace("+38", ""),
    Email: order.email,
    CounterpartyType: "PrivatePerson",
    CounterpartyProperty: "Recipient",
  });
  const contact = await first("ContactPersonGeneral", "save", {
    CounterpartyRef: counterparty.Ref,
    FirstName: order.name,
    LastName: order.surname,
    MiddleName: "",
    Phone: order.phoneNumber,
  });
  const price = await first("InternetDocumentGeneral", "getDocumentPrice", {
    Weight: "1",
    CitySender: branch.cityRef,
    CityRecipient: order.cityRef,
    ServiceType: serviceType,
    Cost: Number(order.value ?? 0).toFixed(0),
    CargoType: "Cargo",
    SeatsAmount: "1",
  });

  const properties: Record<string, unknown> = {
    PayerType: "Recipient",
    PaymentMethod: "Cash",
    RecipientWarehouseIndex: order.warehouseIndex,
    DateTime: DateTime.now().setZone("Europe/Kiev").toFormat("dd.MM.yyyy"),
    CargoType: "Cargo",
    Weight: "1",
    ServiceType: serviceType,
    SeatsAmount: "1",
    Description: `Замовлення з ${StoreInfo.name}`,
    Cost: price.Cost,
    CitySender: branch.cityRef,
    Sender: settings.sender.counterpartyRef,
    SenderAddress: branch.warehouseRef,
    ContactSender: settings.sender.contactRef,
    SendersPhone: settings.sender.phone,
    CityRecipient: order.cityRef,
    Recipient: counterparty.Ref,
    RecipientAddress: order.warehouseRef,
    ContactRecipient: contact.Ref,
    RecipientsPhone: order.phoneNumber,
    NewAddress: "1",
    OptionsSeat: [{ volumetricVolume: "1", volumetricWidth: "20", volumetricLength: "20", volumetricHeight: "20", weight: "1" }],
  };
  // Cash on delivery unless the customer pays by bank transfer.
  if (order.paymentType !== "За реквізитами") properties.AfterpaymentOnGoodsCost = Number(order.value ?? 0).toFixed(2);

  const invoice = await first("InternetDocumentGeneral", "save", properties);
  const summary: InvoiceSummary = {
    IntDocNumber: String(invoice.IntDocNumber ?? ""),
    Ref: invoice.Ref,
    CostOnSite: invoice.CostOnSite,
    EstimatedDeliveryDate: invoice.EstimatedDeliveryDate,
  };
  await Order.updateOne(
    { _id: order._id },
    { $set: { invoice: JSON.stringify(invoice), invoiceString: summary.IntDocNumber, invoiceCreatedAt: new Date() }, $unset: { invoiceStatus: "", invoiceStatusCode: "", invoiceCheckedAt: "" } },
  );
  return summary;
}

export async function loadSettings() {
  return getDeliverySettings();
}

/** Tracking of up to 100 waybills in one call; saves the status on each order. Returns how many were updated. */
export async function refreshStatuses(numbers: string[]): Promise<number> {
  const unique = Array.from(new Set(numbers.filter((number) => /^\d{6,20}$/.test(number)))).slice(0, 100);
  if (unique.length === 0) return 0;
  const rows = await call("TrackingDocument", "getStatusDocuments", { Documents: unique.map((DocumentNumber) => ({ DocumentNumber })) });
  const now = new Date();
  const updates = rows
    .filter((row) => row?.Number)
    .map((row) => ({
      updateMany: {
        filter: { invoiceString: String(row.Number) },
        update: { $set: { invoiceStatus: String(row.Status ?? ""), invoiceStatusCode: String(row.StatusCode ?? ""), invoiceCheckedAt: now } },
      },
    }));
  if (updates.length) await Order.bulkWrite(updates);
  return updates.length;
}

export async function trackOne(number: string): Promise<Record<string, unknown>> {
  return first("TrackingDocument", "getStatusDocuments", { Documents: [{ DocumentNumber: number }] });
}

/* ------------------------------------------------------------------ */
/* Checking the key                                                    */
/* ------------------------------------------------------------------ */

export type SenderSuggestion = { name: string; counterpartyRef: string; contactRef: string; phone: string };
export type KeyCheck = { ok: true; sender: SenderSuggestion | null } | { ok: false; error: string };

const GUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Picks the sender data out of two Nova Poshta answers: the list of sender
 * counterparties of the account and the contact persons of the first one.
 * Null when the answers do not hold a usable sender.
 */
export function readSenderSuggestion(counterparties: unknown, contacts: unknown): SenderSuggestion | null {
  const counterparty = Array.isArray(counterparties) ? counterparties.find((row) => GUID_SHAPE.test(String(row?.Ref ?? ""))) : null;
  if (!counterparty) return null;
  const contact = Array.isArray(contacts) ? contacts.find((row) => GUID_SHAPE.test(String(row?.Ref ?? ""))) : null;
  const name = [counterparty.Description, counterparty.FirstName, counterparty.LastName].map((part) => String(part ?? "").trim()).filter(Boolean)[0] ?? "";
  return {
    name: name || String(contact?.Description ?? "").trim(),
    counterpartyRef: String(counterparty.Ref),
    contactRef: contact ? String(contact.Ref) : "",
    phone: String(contact?.Phones ?? "").replace(/\D/g, ""),
  };
}

/** What Nova Poshta said, as one line; empty when it gave no reason. */
function refusal(body: any): string {
  const parts = [body?.errors, body?.warnings].flatMap((list) => (Array.isArray(list) ? list : [])).map((part) => String(part).trim());
  return parts.filter(Boolean).join(", ");
}

/**
 * Asks Nova Poshta who the sender of this account is. It reads only, creates
 * nothing, and tells two things at once: whether the key is accepted, and the
 * sender codes the owner would otherwise copy by hand.
 */
export async function checkKey(): Promise<KeyCheck> {
  const apiKey = await getNovaPoshtaKey();
  if (!apiKey) return { ok: false, error: "Ключа ще немає: вставте його і збережіть." };

  let body: any;
  try {
    body = await post(apiKey, "CounterpartyGeneral", "getCounterparties", { CounterpartyProperty: "Sender", Page: "1" });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Нова пошта не відповіла." };
  }
  if (!body?.success) {
    const reason = refusal(body);
    if (/api\s*key|ключ/i.test(reason)) {
      return { ok: false, error: "Нова пошта не прийняла цей ключ. Перевірте в кабінеті, що він чинний, і вставте його ще раз повністю." };
    }
    return { ok: false, error: `Нова пошта відповіла відмовою${reason ? ` (${reason})` : ""}. Спробуйте ще раз трохи згодом.` };
  }

  // The key works. The sender codes are a bonus: no reason to fail the check over them.
  let contacts: unknown = [];
  const senderRef = Array.isArray(body.data) ? String(body.data.find((row: any) => GUID_SHAPE.test(String(row?.Ref ?? "")))?.Ref ?? "") : "";
  if (senderRef) {
    try {
      const answer = await post(apiKey, "CounterpartyGeneral", "getCounterpartyContactPersons", { Ref: senderRef, Page: "1" });
      if (answer?.success) contacts = answer.data;
    } catch {
      contacts = [];
    }
  }
  return { ok: true, sender: readSenderSuggestion(body.data, contacts) };
}
