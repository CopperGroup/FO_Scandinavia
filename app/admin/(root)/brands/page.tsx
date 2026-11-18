import type { Metadata } from "next"
import BrandsManager from "@/components/admin-components/brands/BrandsManager"
import { AdminPage } from "@/components/admin/ui"
import { listBrands } from "@/lib/admin/brands"

export const metadata: Metadata = { title: "Бренди" }
export const dynamic = "force-dynamic"

/**
 * "Бренди": the list a product's brand is chosen from, with how many products
 * each brand has. Adding, renaming (and joining two spellings) and removing an
 * unused brand happen here; a product gets its brand in the product form.
 */
export default async function BrandsPage() {
  const brands = await listBrands()
  const twins = brands.filter((brand) => brand.twins.length > 0).length

  return (
    <AdminPage
      title="Бренди"
      description={`Брендів: ${brands.length}${twins > 0 ? `. Написань, які варто об’єднати: ${twins}` : ""}. Бренд товару вибирають із цього списку.`}
    >
      <BrandsManager brands={brands} />
    </AdminPage>
  )
}
