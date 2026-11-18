import { getServerSession } from "next-auth"
import { options } from "@/app/api/auth/[...nextauth]/options"
import { connectToDB } from "@/lib/mongoose"
import User from "@/lib/models/user.model"

const ADMIN_ROLES = new Set(["Admin", "Owner"])

export class NotAuthorizedError extends Error {
  constructor() {
    super("Імпортувати товари може лише адміністратор. Увійдіть під обліковим записом адміністратора.")
    this.name = "NotAuthorizedError"
  }
}

/**
 * The signed-in admin, or null. The role is read from the database rather than
 * the session token, so a revoked admin loses access at once.
 */
export async function currentAdmin(): Promise<{ id: string; email: string; role: string } | null> {
  const session = await getServerSession(options)
  const email = session?.user?.email
  if (!email) return null

  await connectToDB()
  const user = await User.findOne({ email }).select("_id email role").lean<{ _id: unknown; email: string; role?: string }>()
  if (!user || !ADMIN_ROLES.has(String(user.role))) return null
  return { id: String(user._id), email: user.email, role: String(user.role) }
}

/** Throws unless an Admin or Owner is signed in. Use at the top of every admin server action. */
export async function requireAdmin(): Promise<{ id: string; email: string; role: string }> {
  const admin = await currentAdmin()
  if (!admin) throw new NotAuthorizedError()
  return admin
}
