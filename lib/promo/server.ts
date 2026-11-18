import mongoose from "mongoose";
import { getSetting } from "@/lib/content/server";
import PromoCode from "@/lib/models/promocode.model";
import User from "@/lib/models/user.model";
import { connectToDB } from "@/lib/mongoose";
import {
  DEFAULT_PROMO_REWARDS,
  PROMO_REWARDS_KEY,
  addDays,
  checkPromo,
  cleanPromoRewards,
  customerPromo,
  kyivDay,
  legacyPromo,
  normalizePromoCode,
  randomPromoCode,
  refusalText,
  sortCustomerPromos,
  type CustomerPromo,
  type PromoRecord,
  type PromoRewards,
  type PromoSource,
} from "./rules";

/**
 * Promo codes in the database. Server-only, and not a server action file:
 * nothing here checks who is calling. The callers do (lib/actions/*).
 */

type Oid = mongoose.Types.ObjectId;
type UseRow = { _id: Oid; user: Oid; order: string | null; at?: Date };
export type PromoRow = {
  _id: Oid;
  code: string;
  percent: number;
  owner: Oid | null;
  startDay: string | null;
  endDay: string | null;
  maxUses: number | null;
  perCustomer: number;
  minOrder: number;
  active: boolean;
  note?: string;
  source?: PromoSource;
  uses?: UseRow[];
  usedCount?: number;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export function toPromoRecord(row: PromoRow): PromoRecord {
  return {
    id: String(row._id),
    code: row.code,
    percent: Number(row.percent),
    ownerId: row.owner ? String(row.owner) : null,
    startDay: row.startDay ?? null,
    endDay: row.endDay ?? null,
    maxUses: row.maxUses ?? null,
    perCustomer: Number(row.perCustomer ?? 1),
    minOrder: Number(row.minOrder ?? 0),
    active: row.active !== false,
    note: row.note ?? "",
    source: row.source ?? "admin",
    usedCount: Number(row.usedCount ?? 0),
  };
}

const usedBy = (row: PromoRow, userId: string | null) => (userId ? (row.uses ?? []).filter((use) => String(use.user) === userId).length : 0);

/**
 * Codes issued before the list existed live as text in the customer's record.
 * This puts the ones that are not in the list yet into it, unchanged in what
 * they give, so they keep working and show up everywhere without anything
 * having to be run by hand (tools/migrate-promo-codes.mjs does the same for
 * every customer at once). Safe to call any number of times.
 */
export async function adoptLegacyCodes(userId: string): Promise<void> {
  try {
    if (!mongoose.isValidObjectId(userId)) return;
    const user = await User.findById(userId).select("discounts").lean<{ discounts?: unknown[] }>();
    const texts = (user?.discounts ?? []).filter((text): text is string => typeof text === "string" && text.length > 0);
    if (texts.length === 0) return;

    // The last character of an old code is its uses left, and it changes when the code is used: compare without it.
    const known = await PromoCode.find({ owner: userId, source: "legacy" }).select("code").lean<{ code: string }[]>();
    const knownStems = new Set(known.map((row) => row.code.slice(0, -1)));
    for (const text of texts) {
      const record = legacyPromo(text, userId);
      if (!record || knownStems.has(record.code.slice(0, -1))) continue;
      knownStems.add(record.code.slice(0, -1));
      const { ownerId, usedCount, ...fields } = record;
      await PromoCode.updateOne(
        { code: record.code },
        { $setOnInsert: { ...fields, owner: ownerId, usedCount, uses: usedCount > 0 ? [{ user: new mongoose.Types.ObjectId(userId), order: null, at: null }] : [], createdBy: "" } },
        { upsert: true },
      );
    }
  } catch (error) {
    console.error("[promo] old-format codes:", error instanceof Error ? error.message : error);
  }
}

/** The code as stored. An old-format code that is not in the list yet is put there first. */
async function findCode(code: string, userId: string | null): Promise<PromoRow | null> {
  const row = await PromoCode.findOne({ code }).lean<PromoRow>();
  if (row || !userId || !code.startsWith("DV-")) return row;
  await adoptLegacyCodes(userId);
  return PromoCode.findOne({ code }).lean<PromoRow>();
}

/** A problem the customer can read and act on. */
export class PromoProblem extends Error {}

/** `signIn`: the code is somebody's personal one and nobody is signed in. */
export type PromoPreview = { ok: true; code: string; percent: number } | { ok: false; error: string; signIn?: boolean };

/**
 * What pressing "apply" at checkout answers. Nothing is taken: the use is
 * taken when the order is placed (`redeemPromo`), by the same rules.
 */
export async function previewPromo(input: { code: unknown; userId: string | null; subtotal: number }): Promise<PromoPreview> {
  const code = normalizePromoCode(input.code);
  if (!code || code.length > 40) return { ok: false, error: refusalText("unknown", null) };

  await connectToDB();
  const row = await findCode(code, input.userId);
  const record = row ? toPromoRecord(row) : null;
  const verdict = checkPromo(record, { userId: input.userId, subtotal: input.subtotal, today: kyivDay(), usedByCustomer: row ? usedBy(row, input.userId) : 0 });
  if (verdict.ok) return { ok: true, code, percent: verdict.percent };
  return { ok: false, error: refusalText(verdict.refusal, record), ...(verdict.refusal === "sign-in" ? { signIn: true } : {}) };
}

export type Redeemed = { promoId: string; useId: string; code: string; percent: number };

/**
 * Takes one use of the code for this customer's order. The last step is a
 * single conditional update, so when two orders race for the last use, or the
 * shop switches the code off at that moment, exactly the right ones get it.
 * Throws PromoProblem with the reason when the code cannot be used.
 */
export async function redeemPromo(input: { code: unknown; userId: string; subtotal: number }): Promise<Redeemed> {
  const code = normalizePromoCode(input.code);
  await connectToDB();
  const row = code && code.length <= 40 ? await findCode(code, input.userId) : null;
  const record = row ? toPromoRecord(row) : null;
  const today = kyivDay();
  const verdict = checkPromo(record, { userId: input.userId, subtotal: input.subtotal, today, usedByCustomer: row ? usedBy(row, input.userId) : 0 });
  if (!verdict.ok || !row) throw new PromoProblem(refusalText(verdict.ok ? "unknown" : verdict.refusal, record));

  const user = new mongoose.Types.ObjectId(input.userId);
  const useId = new mongoose.Types.ObjectId();
  const taken = await PromoCode.updateOne(
    {
      _id: row._id,
      active: true,
      percent: verdict.percent,
      $and: [
        { $or: [{ startDay: null }, { startDay: { $lte: today } }] },
        { $or: [{ endDay: null }, { endDay: { $gte: today } }] },
        { $or: [{ maxUses: null }, { $expr: { $lt: ["$usedCount", "$maxUses"] } }] },
        { $expr: { $lt: [{ $size: { $filter: { input: "$uses", as: "use", cond: { $eq: ["$$use.user", user] } } } }, "$perCustomer"] } },
      ],
    },
    { $push: { uses: { _id: useId, user, order: null, at: new Date() } }, $inc: { usedCount: 1 } },
  );
  // It was fine a moment ago and is not now: someone took the last use, or the shop changed the code.
  if (taken.modifiedCount !== 1) throw new PromoProblem("Цей промокод щойно перестав діяти. Приберіть його і спробуйте ще раз.");

  return { promoId: String(row._id), useId: String(useId), code: row.code, percent: verdict.percent };
}

/** The order exists: the use now points at it. Also keeps an old-format code in the customer's record in step. */
export async function attachPromoUse(redeemed: Redeemed, orderNumber: string, userId: string): Promise<void> {
  await PromoCode.updateOne({ _id: redeemed.promoId, "uses._id": redeemed.useId }, { $set: { "uses.$.order": orderNumber } });
  await spendLegacyCopy(redeemed.code, userId);
}

/** The order was not created after all: the use goes back. */
export async function releasePromoUse(redeemed: Redeemed): Promise<void> {
  await PromoCode.updateOne({ _id: redeemed.promoId, "uses._id": redeemed.useId }, { $pull: { uses: { _id: redeemed.useId } }, $inc: { usedCount: -1 } });
}

/** The order was cancelled: the code it used can be used again. Does nothing for an order without a code. */
export async function releasePromoForOrder(orderNumber: string): Promise<void> {
  if (!orderNumber) return;
  await connectToDB();
  await PromoCode.updateOne({ "uses.order": String(orderNumber) }, { $pull: { uses: { order: String(orderNumber) } }, $inc: { usedCount: -1 } });
}

/**
 * A cancelled order was put back in work: it still carries its discount, so it
 * counts as a use of its code again. Not checked against the limits: the
 * customer got this discount when they ordered, and the count must say so.
 */
export async function restorePromoForOrder(orderNumber: string, code: string | undefined, userId: string | undefined): Promise<void> {
  if (!orderNumber || !code) return;
  await connectToDB();
  await PromoCode.updateOne(
    { code, "uses.order": { $ne: String(orderNumber) } },
    { $push: { uses: { user: mongoose.isValidObjectId(userId) ? new mongoose.Types.ObjectId(userId) : null, order: String(orderNumber), at: new Date() } }, $inc: { usedCount: 1 } },
  );
}

/**
 * Codes issued before the list existed also live as text in the customer's
 * record, with the uses left as the last digit. That copy is kept in step when
 * such a code is used, so the version of the site from before this change
 * would still refuse a spent code. It can go once nobody needs to roll back.
 */
async function spendLegacyCopy(code: string, userId: string): Promise<void> {
  try {
    const match = /^(DV-.*?)(\d)$/.exec(code);
    if (!match) return;
    const user = await User.findById(userId).select("discounts").lean<{ discounts?: string[] }>();
    const stored = (user?.discounts ?? []).find((text) => typeof text === "string" && text.toUpperCase().slice(0, -1) === match[1]);
    if (!stored) return;
    const left = Number(stored.slice(-1));
    if (!Number.isInteger(left) || left <= 0) return;
    await User.updateOne({ _id: userId, discounts: stored }, { $set: { "discounts.$": `${stored.slice(0, -1)}${left - 1}` } });
  } catch (error) {
    console.error("[promo] old-format copy:", error instanceof Error ? error.message : error);
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Issuing                                   */
/* -------------------------------------------------------------------------- */

const isDuplicateKey = (error: unknown) => (error as { code?: number })?.code === 11000;

/** Creates a personal code for one customer and returns it. */
export async function issuePersonalCode(input: { userId: string; percent: number; days: number; source: PromoSource; note?: string; createdBy?: string }): Promise<{ code: string; percent: number; endDay: string }> {
  await connectToDB();
  const endDay = addDays(kyivDay(), Math.max(1, input.days) - 1);
  for (let attempt = 0; ; attempt++) {
    const code = randomPromoCode();
    try {
      await PromoCode.create({ code, percent: input.percent, owner: input.userId, endDay, perCustomer: 1, source: input.source, note: input.note ?? "", createdBy: input.createdBy ?? "" });
      return { code, percent: input.percent, endDay };
    } catch (error) {
      // The same random code twice: draw again.
      if (!isDuplicateKey(error) || attempt >= 4) throw error;
    }
  }
}

/** The rewards the shop gives by itself, as set in the admin panel (defaults while nothing was saved). */
export async function getPromoRewards(): Promise<PromoRewards> {
  try {
    return cleanPromoRewards((await getSetting(PROMO_REWARDS_KEY))?.values).rewards;
  } catch {
    return DEFAULT_PROMO_REWARDS;
  }
}

/** The code for registering, or for a review; null when the shop switched that reward off. */
export async function issueRewardCode(kind: "welcome" | "review", userId: string): Promise<{ code: string; percent: number; endDay: string } | null> {
  const reward = (await getPromoRewards())[kind];
  if (!reward.enabled) return null;
  return issuePersonalCode({ userId, percent: reward.percent, days: reward.days, source: kind });
}

/* -------------------------------------------------------------------------- */
/*                              For the customer                              */
/* -------------------------------------------------------------------------- */

/** A customer's personal codes, the ones that work first. */
export async function listCustomerPromos(userId: string): Promise<CustomerPromo[]> {
  if (!mongoose.isValidObjectId(userId)) return [];
  await connectToDB();
  await adoptLegacyCodes(userId);
  const rows = await PromoCode.find({ owner: userId }).sort({ createdAt: -1 }).limit(200).lean<PromoRow[]>();
  const today = kyivDay();
  return sortCustomerPromos(rows.map((row) => customerPromo(toPromoRecord(row), today, usedBy(row, userId))));
}
