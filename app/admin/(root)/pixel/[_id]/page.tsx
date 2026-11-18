import { redirect } from "next/navigation"

// A pixel no longer has a page of its own: its settings open on the list page.
export default function PixelRedirect({ params }: { params: { _id: string } }) {
  redirect(`/admin/pixel?id=${encodeURIComponent(params._id)}`)
}
