import type { Metadata } from "next"
import InfoPageLayout from "@/components/layout/InfoPageLayout"
import { getContent } from "@/lib/content/server"

export const metadata: Metadata = {
  title: "Публічна оферта",
  description: "Договір купівлі-продажу товарів дистанційним способом.",
  alternates: { canonical: "/info/public-offer" },
}

/** The text is edited in the admin: Сторінки → Публічна оферта. Its default is lib/content/legal.ts. */
export default async function PublicOfferPage() {
  const { body } = await getContent<{ body: string }>("offer")
  return <InfoPageLayout title="Публічна оферта" markdownContent={body} edit="offer:body" />
}
