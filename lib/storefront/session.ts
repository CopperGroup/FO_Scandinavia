import { cache } from "react";
import User from "@/lib/models/user.model";
import { connectToDB } from "@/lib/mongoose";
import { Store } from "@/constants/store";
import { getSession } from "@/lib/getServerSession";
import { getVariables } from "@/lib/content/server";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  /** Ids of the products the shopper has put in their wishlist. */
  likedIds: string[];
};

type UserRow = { _id: unknown; email?: string; name?: string; username?: string; role?: string; likes?: unknown[] };

const USER_FIELDS = "email name username role likes";

/**
 * The signed-in shopper, resolved once per request. Null for guests.
 *
 * One indexed query returns everything the layout and the pages need
 * (name, role, wishlist), so no page looks the same user up a second time.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  try {
    const email = await getSession();
    if (!email) return null;

    await connectToDB();
    // The session carries the address exactly as stored, so this hits the unique index.
    let user = await User.findOne({ email }).select(USER_FIELDS).lean<UserRow>();
    // Older accounts were saved with capitals; compare without case for those.
    if (!user) {
      user = await User.findOne({ email }).collation({ locale: "en", strength: 2 }).select(USER_FIELDS).lean<UserRow>();
    }
    if (!user) return null;

    return {
      id: String(user._id),
      email: String(user.email ?? email),
      name: String(user.name || user.username || "").trim(),
      isAdmin: user.role === "Admin" || user.role === "Owner",
      likedIds: (user.likes ?? []).map(String),
    };
  } catch {
    // Layout chrome must render even when the session cannot be resolved.
    return null;
  }
});

/** What the checkout form pre-fills for a signed-in shopper. */
export const getCheckoutProfile = cache(async (): Promise<{ id: string; email: string; name: string; surname: string; phoneNumber: string } | null> => {
  const current = await getCurrentUser();
  if (!current) return null;
  const row = await User.findById(current.id).select("name surname phoneNumber").lean<{ name?: string; surname?: string; phoneNumber?: string }>();
  return {
    id: current.id,
    email: current.email,
    name: String(row?.name ?? "").trim(),
    surname: String(row?.surname ?? "").trim(),
    phoneNumber: String(row?.phoneNumber ?? "").trim(),
  };
});

export type StoreContacts = { phone: string; email: string; hours: string; telegram: string; viber: string; address: string };

/**
 * How customers reach the shop: the contacts kept in the admin panel under
 * "Налаштування" (lib/content/variables.ts). The store
 * constants stand in for a phone or an e-mail that is not filled in.
 */
export const getStoreContacts = cache(async (): Promise<StoreContacts> => {
  let contacts: Partial<StoreContacts> = {};
  try {
    contacts = (await getVariables()).contacts;
  } catch {
    contacts = {};
  }
  return {
    phone: contacts.phone || Store.phoneNumber,
    email: contacts.email || Store.email,
    hours: contacts.hours ?? "",
    telegram: contacts.telegram ?? "",
    viber: contacts.viber ?? "",
    address: contacts.address ?? "",
  };
});
