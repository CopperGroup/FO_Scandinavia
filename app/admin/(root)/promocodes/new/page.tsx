import type { Metadata } from "next"
import { PromoForm } from "@/components/admin-components/promo/PromoForm"
import { getPromoOwner } from "@/lib/promo/admin"
import { kyivDay } from "@/lib/promo/rules"

export const metadata: Metadata = { title: "Новий промокод" }
export const dynamic = "force-dynamic"

/** `?owner=<customer id>` (from a customer's card): the form opens as a personal code for them. */
const Page = async ({ searchParams }: { searchParams: { owner?: string } }) => {
  const ownerId = typeof searchParams.owner === "string" ? searchParams.owner : ""
  const owner = ownerId ? await getPromoOwner(ownerId) : null
  return <PromoForm record={null} owner={owner} ownerMissing={Boolean(ownerId) && !owner} today={kyivDay()} />
}

export default Page
