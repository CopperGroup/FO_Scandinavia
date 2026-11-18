import type { Metadata } from "next"
import Checkout from "@/components/storefront/checkout/Checkout"
import { getCheckoutProfile } from "@/lib/storefront/session"

export const metadata: Metadata = {
  title: "Оформлення замовлення",
  robots: { index: false, follow: false },
}

const Page = async () => {
  // Only what the form pre-fills; the account record itself never reaches the browser.
  const profile = await getCheckoutProfile()

  return <Checkout profile={profile ? { id: profile.id, name: profile.name, surname: profile.surname, phoneNumber: profile.phoneNumber } : null} email={profile?.email ?? ""} />
}

export default Page
