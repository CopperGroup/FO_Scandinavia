import { redirect } from "next/navigation"

/** Old edit address of a category: the "Загальне" tab of the categories view. */
export default function OldEditCategoryPage({ params }: { params: { id: string } }) {
  redirect(`/admin/categories?id=${encodeURIComponent(params.id)}`)
}
