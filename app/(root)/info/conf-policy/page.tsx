import type { Metadata } from "next"
import InfoPageLayout from "@/components/layout/InfoPageLayout"
import { getContent } from "@/lib/content/server"

export const metadata: Metadata = {
  title: "Політика конфіденційності",
  description: "Як магазин збирає, зберігає та використовує дані покупців.",
  alternates: { canonical: "/info/conf-policy" },
}

/** The text is edited in the admin: Сторінки → Політика конфіденційності. Its default is lib/content/legal.ts. */
export default async function ConfPolicyPage() {
  const { body } = await getContent<{ body: string }>("privacy")
  return <InfoPageLayout title="Політика конфіденційності" markdownContent={body} edit="privacy:body" />
}
