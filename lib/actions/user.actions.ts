"use server";

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/user.model"
import { connectToDB } from "@/lib/mongoose"
import clearCache from "./cache";
import { UserType } from "../types/types";
import { generateLongPassword } from "../utils";
import { hasPermission } from "../roles";
import { issueRewardCode } from "../promo/server";
import { EMAIL_COLLATION, looksLikeEmail, normalizeEmail } from "../auth/email";
import { AccessDenied, getSessionIdentity, getSessionUser, isStaffRole, requireAdmin, requireUser } from "../auth/guards";

/*
 * Every export here is a public endpoint. Each one checks who is calling:
 * staff for other people's records, the account holder for their own.
 * Nothing returns a password hash or a reset/verification token.
 */

/** The fields any caller of a profile ever reads. */
const PROFILE_FIELDS = "_id email name surname username phoneNumber role selfCreated";

type Profile = {
  _id: string;
  email: string;
  name?: string;
  surname?: string;
  username?: string;
  phoneNumber?: string;
  role: string;
  selfCreated?: boolean;
};

function toProfile(user: any): Profile | null {
  if (!user) return null;
  return {
    _id: String(user._id),
    email: String(user.email ?? ""),
    name: user.name ?? "",
    surname: user.surname ?? "",
    username: user.username ?? "",
    phoneNumber: user.phoneNumber ?? "",
    role: String(user.role ?? "User"),
    selfCreated: Boolean(user.selfCreated),
  };
}

function findByEmail(email: string) {
  return User.findOne({ email: normalizeEmail(email) }).collation(EMAIL_COLLATION);
}

type ManagedUserParams = {
  name: string;
  email: string;
  surname?: string;
  phoneNumber?: string;
  role: "Admin" | "User";
  /** Ignored: the caller is taken from the session. Kept so older callers still type-check. */
  currentUserEmail?: string | null;
};

type ManageResult = { ok: true; user: Profile } | { ok: false; error: string; field?: "email" | "role" | "name" };

/**
 * Creates a customer record from the admin panel. Only the owner may create
 * an administrator.
 */
export async function createuserByMyself(params: ManagedUserParams): Promise<ManageResult>;
export async function createuserByMyself(params: ManagedUserParams, type: 'json'): Promise<string>;

export async function createuserByMyself(params: ManagedUserParams, type?: 'json') {
    const result = await createManagedUser(params);
    return type === "json" ? JSON.stringify(result) : result;
}

async function createManagedUser(params: ManagedUserParams): Promise<ManageResult> {
    const current = await requireAdmin();
    const role = params.role === "Admin" ? "Admin" : "User";

    if (!hasPermission("/clients", "create", role.toLowerCase() as "admin" | "user", current.role)) {
        return { ok: false, field: "role", error: "Призначити роль адміністратора може лише власник магазину." };
    }

    const email = normalizeEmail(params.email);
    const name = String(params.name ?? "").trim();
    if (!name) return { ok: false, field: "name", error: "Вкажіть ім’я." };
    if (!looksLikeEmail(email)) return { ok: false, field: "email", error: "Перевірте адресу e-mail." };

    await connectToDB();
    if (await findByEmail(email).select("_id").lean()) {
        return { ok: false, field: "email", error: "Клієнт із цією адресою вже існує." };
    }

    const created = await User.create({
        name,
        email,
        password: await bcrypt.hash(generateLongPassword(), 10),
        surname: String(params.surname ?? "").trim(),
        phoneNumber: String(params.phoneNumber ?? "").trim(),
        selfCreated: true,
        role,
    });

    await clearCache("createUser", undefined);
    return { ok: true, user: toProfile(created)! };
}

/**
 * Edits a customer's contact data and role.
 * Only the owner may grant or remove the administrator role, and the owner's
 * own record cannot be changed from here.
 */
export async function editUser(params: ManagedUserParams & { userId: string }): Promise<ManageResult>;
export async function editUser(params: ManagedUserParams & { userId: string }, type: 'json'): Promise<string>;

export async function editUser(params: ManagedUserParams & { userId: string }, type?: 'json') {
    const result = await editManagedUser(params);
    return type === "json" ? JSON.stringify(result) : result;
}

async function editManagedUser(params: ManagedUserParams & { userId: string }): Promise<ManageResult> {
    const current = await requireAdmin();
    if (!mongoose.isValidObjectId(params.userId)) return { ok: false, error: "Клієнта не знайдено." };

    await connectToDB();
    const target = await User.findById(params.userId).select("_id role").lean<{ _id: unknown; role?: string }>();
    if (!target) return { ok: false, error: "Клієнта не знайдено." };
    if (target.role === "Owner") return { ok: false, field: "role", error: "Дані власника магазину тут не змінюються." };

    const role = params.role === "Admin" ? "Admin" : "User";
    const touchesAdmin = role === "Admin" || target.role === "Admin";
    // Permission is checked for the person making the change (it used to be checked against the edited record).
    if (touchesAdmin && !hasPermission("/clients", "edit", "admin", current.role)) {
        return { ok: false, field: "role", error: "Змінювати адміністраторів може лише власник магазину." };
    }

    const email = normalizeEmail(params.email);
    const name = String(params.name ?? "").trim();
    if (!name) return { ok: false, field: "name", error: "Вкажіть ім’я." };
    if (!looksLikeEmail(email)) return { ok: false, field: "email", error: "Перевірте адресу e-mail." };

    const clash = await findByEmail(email).select("_id").lean<{ _id: unknown }>();
    if (clash && String(clash._id) !== String(target._id)) {
        return { ok: false, field: "email", error: "Ця адреса вже належить іншому клієнту." };
    }

    const edited = await User.findByIdAndUpdate(
        target._id,
        {
            $set: {
                name,
                email,
                surname: String(params.surname ?? "").trim(),
                phoneNumber: String(params.phoneNumber ?? "").trim(),
                role,
            },
        },
        { new: true, runValidators: true },
    )
        .select(PROFILE_FIELDS)
        .lean();

    await clearCache("createUser", undefined);
    return { ok: true, user: toProfile(edited)! };
}

type FetchUserByEmailparams = {
   email: string
}

/**
 * The profile behind an e-mail address.
 *
 * Runs on every page view (layouts resolve the signed-in user with it), so it
 * is one indexed lookup. The full profile goes only to the account holder and
 * to staff; anyone else (the login form asks before signing in) learns only
 * whether the address belongs to a guest-checkout record.
 */
export async function fetchUserByEmail(params: FetchUserByEmailparams): Promise<UserType>;
export async function fetchUserByEmail(params: FetchUserByEmailparams, type: 'json'): Promise<string>;

export async function fetchUserByEmail(params: FetchUserByEmailparams, type?: 'json') {
   try {
        const email = normalizeEmail(params?.email);
        let result: Partial<Profile> | null = null;

        if (email) {
            await connectToDB();
            const identity = await getSessionIdentity();
            const ownRecord = identity?.email === email;
            const allowed = ownRecord || isStaffRole((await getSessionUser())?.role);

            if (allowed) {
                result = toProfile(await findByEmail(email).select(PROFILE_FIELDS).lean());
            } else {
                const found = await findByEmail(email).select("selfCreated").lean<{ selfCreated?: boolean }>();
                result = found ? { selfCreated: Boolean(found.selfCreated) } : null;
            }
        }

        return type === 'json' ? JSON.stringify(result) : result;
   } catch (error: any) {
     throw new Error(`${error.message}`)
   }
}

export async function fetchUserById({ userId }: { userId: string }): Promise<UserType>;
export async function fetchUserById({ userId }: { userId: string }, type: 'json'): Promise<string>;

export async function fetchUserById({ userId }: { userId: string }, type?: 'json') {
   try {
    const current = await requireUser();
    if (current.id !== String(userId) && !isStaffRole(current.role)) throw new AccessDenied();

    await connectToDB()
    const user = mongoose.isValidObjectId(userId) ? toProfile(await User.findById(userId).select(PROFILE_FIELDS).lean()) : null;

    return type === 'json' ? JSON.stringify(user) : user;
   } catch (error: any) {
     throw new Error(`Error fetching user by id: ${error.message}`)
   }
}

/** The role of the signed-in user. Other people's roles are not disclosed. */
export async function fetchUserRole({ email }: { email: string }) {
  try {
    const user = await getSessionUser();
    if (!user || user.email.toLowerCase() !== normalizeEmail(email)) return undefined;
    return user.role;
  } catch (error: any) {
    throw new Error(`${error.message}`)
  }
}

export async function resetPassword({
    token,
    newPassword,
  }: {
    token: string;
    newPassword: string;
  }) {
    try {
      if (typeof token !== "string" || !token) throw new Error("Invalid or expired token.");
      if (typeof newPassword !== "string" || newPassword.length < 8) throw new Error("Password is too short.");

      await connectToDB();

      const user = await User.findOne({
        forgotPasswordToken: token,
        forgotPasswordTokenExpiry: { $gt: new Date() },
      }).select("_id");

      if (!user) {
        throw new Error("Invalid or expired token.");
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await User.updateOne(
        { _id: user._id },
        { $set: { password: hashedPassword }, $unset: { forgotPasswordToken: "", forgotPasswordTokenExpiry: "" } },
      );
    } catch (error: any) {
        throw new Error(`Error reseting password: ${error.message}`)
    }
}

/**
 * Gives the signed-in customer the code for a review (its size and term are set
 * in the admin panel, "Промокоди"). Only for the caller's own account: the ids
 * in the arguments are checked against the session. Empty when the shop has
 * switched that reward off.
 */
export async function addPromo(params: { userId: string, email: string }): Promise<string> {
  try {
    const current = await getSessionUser()
    if (!current || current.id !== String(params.userId)) return ""

    return (await issueRewardCode("review", current.id))?.code ?? ""
  } catch (error: any) {
    throw new Error(`Error adding promo to user: ${error.message}`)
  }
}
