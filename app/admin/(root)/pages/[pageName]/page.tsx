import { redirect } from "next/navigation"

// Old addresses of the page editors: everything is edited at /admin/pages now.
export default function PageRedirect() {
  redirect("/admin/pages")
}
