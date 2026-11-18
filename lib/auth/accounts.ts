import { createHash, randomBytes } from "node:crypto";
import User from "@/lib/models/user.model";
import { connectToDB } from "@/lib/mongoose";
import clearCache from "@/lib/actions/cache";
import { EMAIL_COLLATION, normalizeEmail } from "./email";

/**
 * Account creation for the sign-up route. Deliberately not in a "use server"
 * file: these write passwords and promo codes, so they must not be callable
 * from the browser.
 */

type SignupParams = {
  username: string;
  email: string;
  /** Already hashed. */
  password: string;
  phoneNumber: string;
};

export type PublicAccount = { _id: string; email: string; username: string };

function toPublic(user: any): PublicAccount | null {
  return user ? { _id: String(user._id), email: String(user.email), username: String(user.username ?? "") } : null;
}

export async function findAccountForSignup(email: string) {
  await connectToDB();
  return User.findOne({ email: normalizeEmail(email) })
    .collation(EMAIL_COLLATION)
    .select("_id selfCreated")
    .lean<{ _id: unknown; selfCreated?: boolean }>();
}

export async function createAccount({ username, email, password, phoneNumber }: SignupParams): Promise<PublicAccount | null> {
  await connectToDB();
  const user = await User.create({
    username,
    email: normalizeEmail(email),
    password,
    phoneNumber,
    selfCreated: false,
  });
  await clearCache("createUser", undefined);
  return toPublic(user);
}

/*
 * A guest record is what checkout creates for someone who ordered without an
 * account: it holds their name, phone, address and orders. Whoever registers
 * on that e-mail gets all of it, so the registration is only a request until
 * the owner of the mailbox opens the link we send there.
 */

const CLAIM_LIFETIME_MS = 24 * 60 * 60 * 1000;
const CLAIM_RESEND_AFTER_MS = 60 * 1000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type ClaimStart = { status: "started"; token: string } | { status: "sent-recently" } | { status: "no-guest" };

/**
 * Keeps the requested name and password next to the guest record, inactive,
 * and returns the token for the confirmation link. The record itself does not
 * change: the guest can still order, and nobody can sign in to it.
 */
export async function startGuestClaim({ username, email, password, phoneNumber }: SignupParams): Promise<ClaimStart> {
  await connectToDB();
  const guest = await User.findOne({ email: normalizeEmail(email), selfCreated: true })
    .collation(EMAIL_COLLATION)
    .select("_id claim.sentAt")
    .lean<{ _id: unknown; claim?: { sentAt?: Date } }>();
  if (!guest) return { status: "no-guest" };
  // One letter a minute at most, however often the form is sent.
  if (guest.claim?.sentAt && Date.now() - new Date(guest.claim.sentAt).getTime() < CLAIM_RESEND_AFTER_MS) return { status: "sent-recently" };

  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  await User.updateOne(
    { _id: guest._id, selfCreated: true },
    { $set: { claim: { tokenHash: hashToken(token), password, username, phoneNumber, expires: new Date(now + CLAIM_LIFETIME_MS), sentAt: new Date(now) } } },
  );
  return { status: "started", token };
}

/** Forgets a request whose letter could not be sent, so the form can be sent again at once. */
export async function cancelGuestClaim(email: string): Promise<void> {
  await connectToDB();
  await User.updateOne({ email: normalizeEmail(email), selfCreated: true }, { $unset: { claim: "" } }, { collation: EMAIL_COLLATION });
}

/**
 * The link from the letter was opened: the guest record becomes an account
 * with the name and password that were requested. One use; null for an
 * unknown, used or expired token.
 */
export async function finishGuestClaim(token: string): Promise<PublicAccount | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  await connectToDB();
  const filter = { "claim.tokenHash": hashToken(token), "claim.expires": { $gt: new Date() }, selfCreated: true };
  const pending = await User.findOne(filter).select("_id email claim").lean<{ _id: unknown; email: string; claim: { password: string; username?: string; phoneNumber?: string } }>();
  if (!pending?.claim?.password) return null;

  const set: Record<string, unknown> = { password: pending.claim.password, selfCreated: false, isVerfied: true };
  if (pending.claim.username) set.username = pending.claim.username;
  if (pending.claim.phoneNumber) set.phoneNumber = pending.claim.phoneNumber;

  // The same filter again: two openings of the link at once must not both win.
  const user = await User.findOneAndUpdate({ ...filter, _id: pending._id }, { $set: set, $unset: { claim: "" } }, { new: true })
    .select("_id email username")
    .lean();
  if (!user) return null;
  await clearCache("createUser", undefined);
  return toPublic(user);
}
