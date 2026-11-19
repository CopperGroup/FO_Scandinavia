import mongoose from "mongoose";
import Order from "@/lib/models/order.model";
import PromoCode from "@/lib/models/promocode.model";
import User from "@/lib/models/user.model";
import { connectToDB } from "@/lib/mongoose";
import { escapeRegExp } from "@/lib/catalog/text";
import { kyivDay, promoDeleteBlock, promoStatus, usesLeft, type PromoRecord, type PromoStatus } from "./rules";
import { toPromoRecord, type PromoRow } from "./server";

/**
 * Promo codes as the admin panel reads them ("Промокоди"). Server-only; the
 * pages and actions that call these check for an administrator.
 */

export const PROMO_TABS = [
  { key: "all", label: "Усі", tip: "Усі промокоди магазину" },
  { key: "active", label: "Діють", tip: "Коди, якими можна скористатися сьогодні" },
  { key: "scheduled", label: "Заплановані", tip: "Коди, що почнуть діяти пізніше" },
  { key: "used", label: "Використані", tip: "Коди, якими вже скористалися стільки разів, скільки дозволено" },
  { key: "ended", label: "Прострочені", tip: "Коди, у яких минув останній день, а використання ще лишалися" },
  { key: "off", label: "Вимкнені", tip: "Коди, які магазин вимкнув вручну" },
] as const;
export type PromoTab = (typeof PROMO_TABS)[number]["key"];
export const PROMO_TAB_KEYS = PROMO_TABS.map((tab) => tab.key) as readonly PromoTab[];

export const PROMO_KINDS = [
  { key: "any", label: "Спільні та особисті" },
  { key: "shared", label: "Лише спільні" },
  { key: "personal", label: "Лише особисті" },
] as const;
export type PromoKind = (typeof PROMO_KINDS)[number]["key"];
export const PROMO_KIND_KEYS = PROMO_KINDS.map((kind) => kind.key) as readonly PromoKind[];

export const PROMO_PAGE_SIZE = 25;

export type PromoOwner = { id: string; name: string; email: string };
export type PromoOwnerOption = PromoOwner & { phone: string };

export type PromoListRow = PromoRecord & {
  status: PromoStatus;
  /** Orders the code can still be used on; null: no limit. */
  left: number | null;
  /** Why the code may not be deleted (used or expired); null: it may. */
  deleteBlock: string | null;
  owner: PromoOwner | null;
  createdAt: string | null;
};

/** No uses left: the total is reached, or a personal code's one customer has used theirs. */
const USED_UP = {
  $or: [
    { $and: [{ $ne: ["$maxUses", null] }, { $gte: ["$usedCount", "$maxUses"] }] },
    { $and: [{ $ne: ["$owner", null] }, { $gte: ["$usedCount", "$perCustomer"] }] },
  ],
};

function tabFilter(tab: PromoTab, today: string): Record<string, unknown> {
  const started = { $or: [{ startDay: null }, { startDay: { $lte: today } }] };
  const notEnded = { $or: [{ endDay: null }, { endDay: { $gte: today } }] };
  switch (tab) {
    case "active":
      return { active: true, $and: [started, notEnded, { $expr: { $not: USED_UP } }] };
    case "scheduled":
      return { active: true, startDay: { $gt: today }, $and: [notEnded, { $expr: { $not: USED_UP } }] };
    // The same order as promoStatus(): a used-up code counts as used even after its last day.
    case "used":
      return { active: true, $expr: USED_UP };
    case "ended":
      return { active: true, endDay: { $lt: today }, $expr: { $not: USED_UP } };
    case "off":
      return { active: false };
    default:
      return {};
  }
}

const personName = (user: { name?: string; surname?: string; username?: string } | null | undefined) =>
  [user?.name, user?.surname].filter(Boolean).join(" ").trim() || String(user?.username ?? "").trim();

async function ownersOf(rows: PromoRow[]): Promise<Map<string, PromoOwner>> {
  const ids = Array.from(new Set(rows.map((row) => (row.owner ? String(row.owner) : "")).filter(Boolean)));
  if (ids.length === 0) return new Map();
  const users = await User.find({ _id: { $in: ids } }).select("_id name surname username email").lean<{ _id: unknown; name?: string; surname?: string; username?: string; email?: string }[]>();
  return new Map(users.map((user) => [String(user._id), { id: String(user._id), name: personName(user), email: String(user.email ?? "") }]));
}

export type PromoList = { rows: PromoListRow[]; total: number; page: number; pageCount: number; counts: Record<PromoTab, number> };

export async function listPromoCodes(input: { tab: PromoTab; kind: PromoKind; query: string; page: number }): Promise<PromoList> {
  await connectToDB();
  const today = kyivDay();

  const conditions: Record<string, unknown>[] = [];
  if (input.kind === "shared") conditions.push({ owner: null });
  if (input.kind === "personal") conditions.push({ owner: { $ne: null } });

  const query = input.query.trim();
  if (query) {
    // By the code itself, or by the customer a personal code belongs to.
    const pattern = new RegExp(escapeRegExp(query), "i");
    const owners = await User.find({ $or: [{ email: pattern }, { name: pattern }, { surname: pattern }, { phoneNumber: pattern }] })
      .select("_id")
      .limit(200)
      .lean<{ _id: unknown }[]>();
    conditions.push({ $or: [{ code: new RegExp(escapeRegExp(query.replace(/\s+/g, "")), "i") }, { owner: { $in: owners.map((owner) => owner._id) } }] });
  }

  const filterFor = (tab: PromoTab) => {
    const all = [...conditions, tabFilter(tab, today)].filter((condition) => Object.keys(condition).length > 0);
    return all.length ? { $and: all } : {};
  };

  const counted = await Promise.all(PROMO_TAB_KEYS.map((tab) => PromoCode.countDocuments(filterFor(tab))));
  const counts = Object.fromEntries(PROMO_TAB_KEYS.map((tab, index) => [tab, counted[index]])) as Record<PromoTab, number>;

  const total = counts[input.tab];
  const pageCount = Math.max(1, Math.ceil(total / PROMO_PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(input.page) || 1), pageCount);

  const rows = await PromoCode.find(filterFor(input.tab))
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * PROMO_PAGE_SIZE)
    .limit(PROMO_PAGE_SIZE)
    .select("-uses")
    .lean<PromoRow[]>();
  const owners = await ownersOf(rows);

  return {
    rows: rows.map((row) => {
      const record = toPromoRecord(row);
      return {
        ...record,
        status: promoStatus(record, today),
        left: usesLeft(record),
        deleteBlock: promoDeleteBlock(record, today),
        owner: record.ownerId ? owners.get(record.ownerId) ?? { id: record.ownerId, name: "", email: "" } : null,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
      };
    }),
    total,
    page,
    pageCount,
    counts,
  };
}

export type PromoUse = {
  id: string;
  /** The order's number; null for a use that has no order (an old code spent before the list existed). */
  order: string | null;
  at: string | null;
  customer: PromoOwner | null;
  /** What the customer paid for that order, and how much the code took off; null when the order is gone. */
  paid: number | null;
  saved: number | null;
  canceled: boolean;
};

export type PromoDetail = {
  record: PromoRecord;
  status: PromoStatus;
  left: number | null;
  deleteBlock: string | null;
  owner: PromoOwner | null;
  createdAt: string | null;
  createdBy: string;
  /** The latest uses first, at most `USES_SHOWN`. */
  uses: PromoUse[];
  totals: { orders: number; paid: number; saved: number };
};

const USES_SHOWN = 200;

export async function getPromoDetail(id: string): Promise<PromoDetail | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectToDB();
  const row = await PromoCode.findById(id).lean<PromoRow>();
  if (!row) return null;

  const record = toPromoRecord(row);
  const uses = [...(row.uses ?? [])].sort((a, b) => new Date(b.at ?? 0).getTime() - new Date(a.at ?? 0).getTime()).slice(0, USES_SHOWN);
  const orderNumbers = uses.map((use) => use.order).filter((order): order is string => Boolean(order));

  const [owners, customers, orders] = await Promise.all([
    ownersOf([row]),
    User.find({ _id: { $in: uses.map((use) => use.user) } }).select("_id name surname username email").lean<{ _id: unknown; name?: string; surname?: string; username?: string; email?: string }[]>(),
    orderNumbers.length
      ? Order.find({ id: { $in: orderNumbers } }).select("id value discount deliveryStatus").lean<{ id: string; value?: number; discount?: number; deliveryStatus?: string }[]>()
      : Promise.resolve([]),
  ]);
  const customerById = new Map(customers.map((user) => [String(user._id), { id: String(user._id), name: personName(user), email: String(user.email ?? "") }]));
  const orderByNumber = new Map(orders.map((order) => [String(order.id), order]));

  const rows: PromoUse[] = uses.map((use) => {
    const order = use.order ? orderByNumber.get(use.order) : undefined;
    const paid = order ? Number(order.value ?? 0) : null;
    const percent = order ? Number(order.discount ?? 0) : 0;
    // The order keeps what was paid; the price before the discount is worked back from it.
    const saved = paid !== null && percent > 0 && percent < 100 ? Math.round(paid / (1 - percent / 100)) - paid : paid !== null ? 0 : null;
    return {
      id: String(use._id),
      order: use.order ?? null,
      at: use.at ? new Date(use.at).toISOString() : null,
      customer: customerById.get(String(use.user)) ?? null,
      paid,
      saved,
      canceled: order?.deliveryStatus === "Canceled",
    };
  });

  const counted = rows.filter((use) => use.paid !== null && !use.canceled);
  return {
    record,
    status: promoStatus(record, kyivDay()),
    left: usesLeft(record),
    deleteBlock: promoDeleteBlock(record, kyivDay()),
    owner: record.ownerId ? owners.get(record.ownerId) ?? { id: record.ownerId, name: "", email: "" } : null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    createdBy: row.createdBy ?? "",
    uses: rows,
    totals: { orders: counted.length, paid: counted.reduce((sum, use) => sum + (use.paid ?? 0), 0), saved: counted.reduce((sum, use) => sum + (use.saved ?? 0), 0) },
  };
}

/** One customer, for a form that opens with the owner already chosen. */
export async function getPromoOwner(id: string): Promise<PromoOwner | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectToDB();
  const user = await User.findById(id).select("_id name surname username email").lean<{ _id: unknown; name?: string; surname?: string; username?: string; email?: string }>();
  return user ? { id: String(user._id), name: personName(user), email: String(user.email ?? "") } : null;
}

/** How many customers the "whose code" list loads at most; past that the admin narrows it by typing. */
const OWNER_OPTIONS_MAX = 5000;

/** Every customer, for the searchable "whose code" select: name, e-mail and phone to search by. */
export async function listPromoOwners(): Promise<PromoOwnerOption[]> {
  await connectToDB();
  const users = await User.find({})
    .select("_id name surname username email phoneNumber")
    .sort({ name: 1, surname: 1, email: 1 })
    .limit(OWNER_OPTIONS_MAX)
    .lean<{ _id: unknown; name?: string; surname?: string; username?: string; email?: string; phoneNumber?: string }[]>();
  return users.map((user) => ({ id: String(user._id), name: personName(user), email: String(user.email ?? ""), phone: String(user.phoneNumber ?? "").trim() }));
}
