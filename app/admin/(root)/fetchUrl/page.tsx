import type { Metadata } from "next"
import { AdminPage } from "@/components/admin/ui"
import ImportWizard from "@/components/admin-components/parseXML/ImportWizard"
import { currentAdmin } from "@/lib/import/admin"
import { activeJobFor, sampleLeftovers } from "@/lib/import/server"

export const metadata: Metadata = { title: "Імпорт товарів" }
export const dynamic = "force-dynamic"

export default async function FetchUrlPage() {
  const admin = await currentAdmin()
  const unfinished = admin ? activeJobFor(admin.id) : null
  const sample = admin ? await sampleLeftovers() : { products: 0, categories: 0 }

  return (
    <AdminPage title="Імпорт товарів" description="Додайте або оновіть товари з файлу, який дає постачальник. Перед записом ви побачите, що саме зміниться.">
      <ImportWizard unfinished={unfinished} sample={sample} />
    </AdminPage>
  )
}
