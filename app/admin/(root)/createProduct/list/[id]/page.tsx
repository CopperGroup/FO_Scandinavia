import type { Metadata } from "next"
import Link from "next/link"
import { AdminPage, EmptyState, adminButton } from "@/components/admin/ui"
import ProductForm from "@/components/forms/product-forms/ProductForm"
import { loadCategoryOptionsWithPath } from "@/lib/admin/categories"
import { loadBrandNames } from "@/lib/admin/brands"
import { getProductForEdit, loadParamSuggestions, loadProductVariants } from "@/lib/admin/products"

export const metadata: Metadata = { title: "Редагування товару" }
export const dynamic = "force-dynamic"

export default async function EditProductPage({ params, searchParams }: { params: { id: string }; searchParams: { created?: string } }) {
  const [categories, paramSuggestions, brands, variants] = await Promise.all([loadCategoryOptionsWithPath(), loadParamSuggestions(), loadBrandNames(), loadProductVariants(params.id)])
  const product = await getProductForEdit(params.id, categories)

  if (!product) {
    return (
      <AdminPage title="Товар не знайдено" back={{ href: "/admin/products", label: "Товари" }} width="narrow">
        <EmptyState
          title="Такого товару немає"
          text="Можливо, його видалили або посилання неповне. Знайдіть товар у списку за назвою чи артикулом."
          action={
            <Link href="/admin/products" className={adminButton.secondary}>
              До списку товарів
            </Link>
          }
        />
      </AdminPage>
    )
  }

  // The form renders the page frame itself: its header shows the live status and the bottom bar the save.
  return <ProductForm product={product} categories={categories} paramSuggestions={paramSuggestions} brands={brands} variants={variants} justCreated={searchParams.created === "1"} />
}
