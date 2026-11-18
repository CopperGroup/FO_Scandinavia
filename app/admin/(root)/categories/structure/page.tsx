import { redirect } from "next/navigation"

/** The structure is edited in the categories view (tree on the left, "Підкатегорії" tab on the right). */
export default function OldStructurePage() {
  redirect("/admin/categories")
}
