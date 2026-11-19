import type React from "react"
import { redirect } from "next/navigation"
import { Toaster } from "react-hot-toast"
import AdminShell from "@/components/admin/AdminShell"
import { PostHogProvider } from "@/components/PostHogProvider"
import { fetchUserByEmail } from "@/lib/actions/user.actions"
import { getVariables } from "@/lib/content/server"
import { CONTACT_VARIABLES } from "@/lib/content/variables"
import { getSession } from "@/lib/getServerSession"
import Order, { REAL_ORDER } from "@/lib/models/order.model"
import { connectToDB } from "@/lib/mongoose"
import Provider from "../../Provider"

export const dynamic = "force-dynamic"

/** Orders the team still has to act on: not shipped, not canceled. */
async function countOpenOrders(): Promise<number> {
  try {
    await connectToDB()
    return await Order.countDocuments({ deliveryStatus: "Proceeding", ...REAL_ORDER })
  } catch {
    // A badge is not worth failing the whole panel for.
    return 0
  }
}

/** True while the phone or the e-mail of the shop is not filled in ("Налаштування"). */
async function settingsNeedAttention(): Promise<boolean> {
  try {
    const { contacts } = await getVariables()
    return CONTACT_VARIABLES.some((variable) => variable.required && !contacts[variable.key])
  } catch {
    return false
  }
}

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const email = await getSession()
  if (!email) redirect("/login")

  const [user, openOrders, settingsAttention] = await Promise.all([fetchUserByEmail({ email }) as Promise<any>, countOpenOrders(), settingsNeedAttention()])
  // The middleware already keeps other roles out; this covers a role removed mid-session.
  if (!user || (user.role !== "Admin" && user.role !== "Owner")) redirect("/")

  return (
    <PostHogProvider>
      <Provider>
        <AdminShell user={{ name: String(user.name || user.username || ""), email: String(user.email), role: String(user.role) }} openOrders={openOrders} settingsAttention={settingsAttention}>
          {children}
        </AdminShell>
        <Toaster />
      </Provider>
    </PostHogProvider>
  )
}
