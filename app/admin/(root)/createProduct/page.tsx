import type { Metadata } from "next"
import ProductForm from "@/components/forms/product-forms/ProductForm"
import { loadCategoryOptionsWithPath } from "@/lib/admin/categories"
import { loadBrandNames } from "@/lib/admin/brands"
import { loadParamSuggestions } from "@/lib/admin/products"
import { generateUniqueId } from "@/lib/utils"

export const metadata: Metadata = { title: "Новий товар" }
export const dynamic = "force-dynamic"

export default async function CreateProductPage() {
  const [categories, paramSuggestions, brands] = await Promise.all([loadCategoryOptionsWithPath(), loadParamSuggestions(), loadBrandNames()])

  // Same form as editing; the page frame (title, bottom bar «Створити товар») comes from the form.
  return <ProductForm product={null} categories={categories} newId={generateUniqueId()} paramSuggestions={paramSuggestions} brands={brands} />
}
