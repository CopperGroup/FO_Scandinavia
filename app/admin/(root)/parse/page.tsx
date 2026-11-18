import { redirect } from "next/navigation"

// The JSON converter that lived here is gone; the XML import is the one place to bring products in.
export default function ParsePage() {
  redirect("/admin/fetchUrl")
}
