import { redirect } from "next/navigation"

/** Old address of a category: it now opens in the categories view. */
export default function OldCategoryPage({ params }: { params: { id: string } }) {
  redirect(`/admin/categories?id=${encodeURIComponent(params.id)}`)
}
