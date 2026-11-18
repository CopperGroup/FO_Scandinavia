import { Store } from "@/constants/store"
import { DEPARTMENT_TITLES, type DepartmentKey } from "@/lib/catalog/departments"

/**
 * What search engines read about the storefront, kept in one place: page
 * addresses as the shop wants them indexed, snippet texts, and the helpers
 * the structured data of a page is built with.
 */

export const absoluteUrl = (path: string) => `${Store.domain}${path.startsWith("/") ? path : `/${path}`}`

/** Text of an HTML fragment: no tags, no entities left over, single spaces. */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
}

/** Cuts a snippet at the end of a word and marks the cut, so a search result never ends mid-word. */
export function clip(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(" ")
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:—–-]+$/, "")}…`
}

/** What a built-in department is, in the words people search with, while its heading is still the short built-in one. */
const DEPARTMENT_SEO: Record<DepartmentKey, string> = {
  women: "Товари для жінок зі Скандинавії",
  men: "Товари для чоловіків зі Скандинавії",
  kids: "Дитячі товари зі Скандинавії",
  shoes: "Взуття зі Скандинавії",
  home: "Товари для дому зі Скандинавії",
  food: "Продукти зі Скандинавії",
}

/**
 * The name of a department in search results. A built-in department whose
 * heading nobody changed gets the longer search wording ("Жінкам" says little
 * in a search result); a heading the owner wrote in the admin is used as written.
 */
export function departmentSearchName(department: { key: DepartmentKey; title: string }): string {
  const builtIn = (DEPARTMENT_TITLES as Record<string, string>)[department.key]
  return builtIn === department.title ? (DEPARTMENT_SEO[department.key] ?? department.title) : department.title
}

/** Title of a listing page: the name of what is listed, then what the shopper wants to do with it. */
export const listingTitle = (name: string, page = 1) => `${name} — купити в Україні${page > 1 ? `, сторінка ${page}` : ""}`

/**
 * The one address a catalog page is indexed under. The same category can be
 * opened with or without its department and with the parameters in any order;
 * all of those name this address as the original.
 */
export function catalogCanonical(scope: { departmentKey?: string; categoryIds: string[] }): string {
  const params = new URLSearchParams()
  if (scope.departmentKey) params.set("department", scope.departmentKey)
  if (scope.categoryIds.length > 0) params.set("categories", scope.categoryIds.join(","))
  const query = params.toString().replace(/%2C/g, ",")
  return query ? `/catalog?${query}` : "/catalog"
}

export type BreadcrumbItem = { label: string; href?: string }

/** BreadcrumbList for the trail a page shows; the last item is the page itself. */
export function breadcrumbJsonLd(trail: BreadcrumbItem[], pageUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ label: "Головна", href: "/" }, ...trail].map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      item: crumb.href ? absoluteUrl(crumb.href) : pageUrl,
    })),
  }
}
