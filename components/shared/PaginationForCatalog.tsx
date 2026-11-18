import { CatalogLink as Link } from "@/components/storefront/catalog/CatalogContext"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  page: number
  pageCount: number
  /** Current catalog query; every page link keeps it and only changes `page`. */
  searchParams: Record<string, string | string[] | undefined>
  basePath?: string
}

/** Pages to show: first, last, and a window around the current one; `null` marks a gap. */
function pageWindow(page: number, pageCount: number): (number | null)[] {
  const wanted = new Set([1, pageCount, page - 1, page, page + 1])
  const pages = Array.from(wanted)
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((a, b) => a - b)

  const result: (number | null)[] = []
  pages.forEach((value, index) => {
    if (index > 0 && value - pages[index - 1] > 1) result.push(null)
    result.push(value)
  })
  return result
}

const itemClass =
  "flex h-11 min-w-11 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"

/**
 * Catalog pagination made of plain links, so it works without JavaScript,
 * can be crawled, and supports opening a page in a new tab.
 */
const PaginationForCatalog = ({ page, pageCount, searchParams, basePath = "/catalog" }: Props) => {
  if (pageCount <= 1) return null

  const hrefFor = (target: number) => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(searchParams)) {
      const single = Array.isArray(value) ? value[0] : value
      if (single !== undefined && single !== "" && key !== "page") params.set(key, single)
    }
    params.set("page", String(target))
    return `${basePath}?${params.toString()}`
  }

  return (
    <nav aria-label="Сторінки каталогу" className="flex items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" aria-label="Попередня сторінка" className={cn(itemClass, "text-brand hover:bg-brand-tint")}>
          <ChevronLeft className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline">Назад</span>
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(itemClass, "text-brand-line")}>
          <ChevronLeft className="h-4 w-4" />
          <span className="ml-1 hidden sm:inline">Назад</span>
        </span>
      )}

      {pageWindow(page, pageCount).map((value, index) =>
        value === null ? (
          <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-brand-muted">
            …
          </span>
        ) : value === page ? (
          <span key={value} aria-current="page" className={cn(itemClass, "bg-brand-ink text-white")}>
            {value}
          </span>
        ) : (
          <Link key={value} href={hrefFor(value)} aria-label={`Сторінка ${value}`} className={cn(itemClass, "text-brand-ink hover:bg-brand-tint")}>
            {value}
          </Link>
        ),
      )}

      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} rel="next" aria-label="Наступна сторінка" className={cn(itemClass, "text-brand hover:bg-brand-tint")}>
          <span className="mr-1 hidden sm:inline">Далі</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span aria-hidden="true" className={cn(itemClass, "text-brand-line")}>
          <span className="mr-1 hidden sm:inline">Далі</span>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  )
}

export default PaginationForCatalog
