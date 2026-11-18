import { cache } from "react";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import User from "@/lib/models/user.model";
import { connectToDB } from "@/lib/mongoose";
import { EMAIL_COLLATION, normalizeEmail } from "./email";

/**
 * Access checks for server code.
 *
 * Every export of a "use server" file is a public HTTP endpoint: being called
 * from a page under /admin proves nothing. Actions that read or change other
 * people's data call one of these first.
 *
 * The role is read from the database, not from the session token: a token
 * lives for weeks, and an administrator whose role was removed must lose
 * access straight away.
 */

export type SessionUser = { id: string; email: string; role: string; name: string };

export class AccessDenied extends Error {
  constructor(message = "Немає доступу до цієї дії.") {
    super(message);
    this.name = "AccessDenied";
  }
}

export function isStaffRole(role: unknown): boolean {
  return role === "Admin" || role === "Owner";
}

/**
 * Who the session token says is signed in, without a database read. Good for
 * "is this the caller's own record?" checks; never for role checks.
 */
export const getSessionIdentity = cache(async (): Promise<{ id: string; email: string } | null> => {
  try {
    const session: any = await getServerSession(options);
    const id = String(session?.user?.id ?? "");
    const email = normalizeEmail(session?.user?.email);
    return id || email ? { id, email } : null;
  } catch {
    return null;
  }
});

/** The signed-in account, resolved once per request. Null for guests and for deleted accounts. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const identity = await getSessionIdentity();
  if (!identity) return null;
  const { id, email } = identity;

  await connectToDB();
  const query = mongoose.isValidObjectId(id)
    ? User.findById(id)
    : User.findOne({ email }).collation(EMAIL_COLLATION);
  const user = await query.select("_id email role name username").lean<{ _id: unknown; email: string; role?: string; name?: string; username?: string }>();
  if (!user) return null;

  return {
    id: String(user._id),
    email: String(user.email),
    role: String(user.role ?? "User"),
    name: String(user.name || user.username || ""),
  };
});

/** A signed-in customer or staff member. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AccessDenied("Увійдіть, щоб продовжити.");
  return user;
}

/** An administrator or the owner. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || !isStaffRole(user.role)) throw new AccessDenied();
  return user;
}

/** The owner only (granting the administrator role and similar). */
export async function requireOwner(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.role !== "Owner") throw new AccessDenied();
  return user;
}
