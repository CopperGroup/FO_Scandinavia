import { redirect } from "next/navigation"
import { findCategoryByName } from "@/lib/admin/categories"
import { isObjectIdLike } from "@/lib/admin/catalog-shared"

/**
 * Old addresses: /admin/filter/<category id> and the older "<category name>&<param>"
 * preview links. Both open the category in the filter view.
 */
export default async function OldFilterCategoryPage({ params }: { params: { param: string } }) {
  const segment = decodeURIComponent(params.param ?? "")
  const [first] = segment.split("&")
  const id = isObjectIdLike(first) ? first.toLowerCase() : (await findCategoryByName(first ?? ""))?.id
  redirect(id ? `/admin/filter?id=${id}` : "/admin/filter")
}
