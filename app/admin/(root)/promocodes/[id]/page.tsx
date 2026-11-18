import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PromoForm } from "@/components/admin-components/promo/PromoForm"
import { PromoStats, PromoUses } from "@/components/admin-components/promo/PromoUses"
import { getPromoDetail, listPromoOwners } from "@/lib/promo/admin"
import { kyivDay } from "@/lib/promo/rules"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const detail = await getPromoDetail(params.id)
  return { title: detail ? `Промокод ${detail.record.code}` : "Промокод" }
}

const Page = async ({ params, searchParams }: { params: { id: string }; searchParams: { created?: string } }) => {
  const [detail, customers] = await Promise.all([getPromoDetail(params.id), listPromoOwners()])
  if (!detail) notFound()

  return (
    <PromoForm
      // Another code (a link from code to code) starts the form afresh; a refresh of the same one keeps what is typed.
      key={detail.record.id}
      record={detail.record}
      owner={detail.owner}
      today={kyivDay()}
      customers={customers}
      detail={{ status: detail.status, left: detail.left, createdAt: detail.createdAt, createdBy: detail.createdBy }}
      justCreated={searchParams.created === "1"}
      stats={<PromoStats totals={detail.totals} />}
      uses={<PromoUses uses={detail.uses} usedCount={detail.record.usedCount} shown={detail.uses.length} />}
    />
  )
}

export default Page
