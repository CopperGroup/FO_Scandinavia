import type { Metadata } from "next"
import { redirect } from "next/navigation"
import ContentEditor from "@/components/admin-components/content/ContentEditor"
import type { EditorPage } from "@/components/admin-components/content/EditorShell"
import { Store } from "@/constants/store"
import { formatAdminDateTime } from "@/lib/admin/status"
import { CONTENT_PAGES, amountLabel, contentPage, type ContentKey } from "@/lib/content/schema"
import { editedContentKeys, getContentForEditor, getFreeDelivery, getVariablesForEditor } from "@/lib/content/server"
import { autoLinksByTarget, targetOptions } from "@/lib/content/targets"
import { VARIABLES_KEY, variableList } from "@/lib/content/variables"
import { getHomeData, getNavigation } from "@/lib/storefront/navigation"

export const metadata: Metadata = { title: "Сторінки" }
export const dynamic = "force-dynamic"

const ORDER = ["home", "product", "delivery", "returns", "footer"]

/**
 * "Сторінки": the texts of the storefront, edited next to the page itself.
 * The fields of the chosen page (?page=…) on the left, the real page on the
 * right, redrawn as the admin types. What can be edited is listed in
 * lib/content/schema.ts. The values shared by all pages (the contacts of the
 * shop, the admin's own variables) are kept in "Налаштування"; here they are
 * only offered for putting into a text.
 */
export default async function PagesAdminPage({ searchParams }: { searchParams: { page?: string; field?: string } }) {
  const requested = String(searchParams.page ?? "")
  // Old addresses of the contacts form and of the variables: both live in "Налаштування" now.
  if (requested === VARIABLES_KEY || requested === "contacts") redirect("/admin/settings")
  const selected = contentPage(requested) ? requested : "home"

  const [edited, variables, freeDelivery] = await Promise.all([editedContentKeys(), getVariablesForEditor(), getFreeDelivery()])
  const pages: EditorPage[] = [
    ...ORDER.map((key) => ({ key, title: contentPage(key)!.title, group: "Сторінки магазину", edited: edited.has(key) })),
    ...CONTENT_PAGES.filter((page) => page.group === "documents").map((page) => ({ key: page.key, title: page.title, group: "Документи", edited: edited.has(page.key) })),
  ]
  const list = variableList(variables.values, { store: Store.name, year: new Date().getFullYear(), amount: freeDelivery > 0 ? amountLabel(freeDelivery) : "" })

  const page = contentPage(selected)!
  const [content, navigation, home] = await Promise.all([
    getContentForEditor(selected as ContentKey),
    selected === "home" ? getNavigation() : null,
    // The product page is shown on a real product: the one customers buy most.
    selected === "product" ? getHomeData() : null,
  ])
  const sample = home?.popular[0] ?? home?.newest[0]
  const previewPath = selected === "product" ? (sample ? `/catalog/${sample.id}` : "/catalog") : page.href

  return (
    <ContentEditor
      // A fresh editor for every page: no text of one page may leak into another.
      key={selected}
      pageKey={selected as ContentKey}
      pages={pages}
      previewPath={previewPath}
      initial={content.values}
      edited={content.edited}
      changed={[content.updatedBy, formatAdminDateTime(content.updatedAt)].filter(Boolean).join(", ")}
      freeDelivery={freeDelivery}
      targets={navigation ? targetOptions(navigation) : []}
      linkTargets={navigation ? targetOptions(navigation, { columns: true }) : []}
      autoLinks={navigation ? autoLinksByTarget(navigation) : {}}
      variables={list}
      startField={searchParams.field ? String(searchParams.field).slice(0, 80) : selected === "footer" ? "about" : undefined}
    />
  )
}
