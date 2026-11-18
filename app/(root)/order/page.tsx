import type { Metadata } from "next"
import Checkout from "@/components/storefront/checkout/Checkout"
import { getMyPromoCodes } from "@/lib/storefront/promo"
import { getCheckoutProfile } from "@/lib/storefront/session"

export const metadata: Metadata = {
  title: "Оформлення замовлення",
  robots: { index: false, follow: false },
}

const Page = async () => {
  // Only what the form pre-fills; the account record itself never reaches the browser.
  const [profile, codes] = await Promise.all([getCheckoutProfile(), getMyPromoCodes()])
  // The customer's own codes that still work, so they are one tap away instead of being typed from a letter.
  const promoCodes = (codes ?? []).filter((promo) => promo.state === "active").map((promo) => ({ code: promo.code, percent: promo.percent as number | null }))

  return (
    <Checkout
      profile={profile ? { id: profile.id, name: profile.name, surname: profile.surname, phoneNumber: profile.phoneNumber } : null}
      email={profile?.email ?? ""}
      promoCodes={promoCodes}
    />
  )
}

export default Page
