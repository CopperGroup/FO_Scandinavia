import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

/**
 * Server actions are public HTTP endpoints. Every catalog action that changes
 * products, categories or the filter calls this first.
 *
 * The role comes from the signed session token (the same check the /admin
 * middleware makes), so the guard costs no database query and can sit in front
 * of actions the XML importer calls once per product.
 */
export async function requireCatalogAdmin(): Promise<{ email: string; role: "Admin" | "Owner" }> {
  const session = await getServerSession(options);
  const user = session?.user as { email?: string | null; role?: string } | undefined;
  const role = user?.role;
  if (!user?.email || (role !== "Admin" && role !== "Owner")) {
    throw new Error("Недостатньо прав: дія доступна лише адміністраторам.");
  }
  return { email: user.email, role };
}

/** The signed-in shopper's e-mail, or null for a guest. */
export async function currentUserEmail(): Promise<string | null> {
  const session = await getServerSession(options);
  return session?.user?.email ?? null;
}
