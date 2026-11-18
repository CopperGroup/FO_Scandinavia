import type { Metadata } from "next"
import { AdminPage } from "@/components/admin/ui"
import PixelsManager from "@/components/admin-components/pixel/PixelsManager"
import { listPixels } from "@/lib/pixels/server"

export const metadata: Metadata = { title: "Пікселі реклами" }
export const dynamic = "force-dynamic"

export default async function PixelPage({ searchParams }: { searchParams: { id?: string } }) {
  const pixels = await listPixels()

  return (
    <AdminPage
      title="Пікселі реклами"
      description="Піксель повідомляє рекламному кабінету, що покупці роблять у магазині. Так видно, яка реклама приносить замовлення."
    >
      <PixelsManager pixels={pixels} initialId={searchParams.id ?? null} />
    </AdminPage>
  )
}
