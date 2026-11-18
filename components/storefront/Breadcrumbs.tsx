import Link from "next/link"
import { ChevronRight } from "lucide-react"

export type Crumb = { label: string; href?: string }

/** Path from the home page to the current one. The last crumb is the page itself and is not a link. */
export default function Breadcrumbs({ crumbs, className }: { crumbs: Crumb[]; className?: string }) {
  const trail: Crumb[] = [{ label: "Головна", href: "/" }, ...crumbs]

  return (
    <nav aria-label="Навігаційний ланцюжок" className={className}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-brand-muted">
        {trail.map((crumb, index) => {
          const isLast = index === trail.length - 1
          return (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-2">
              {index > 0 && <ChevronRight className="h-4 w-4 shrink-0 text-brand-line" aria-hidden="true" />}
              {crumb.href && !isLast ? (
                <Link href={crumb.href} className="-my-3 inline-flex min-h-11 items-center hover:text-brand focus-visible:outline-none focus-visible:underline">
                  {crumb.label}
                </Link>
              ) : (
                // A long product name ends with an ellipsis: the full name is the page heading right below.
                <span aria-current={isLast ? "page" : undefined} title={isLast ? crumb.label : undefined} className={isLast ? "line-clamp-1 max-w-[26rem] break-all text-brand-ink" : undefined}>
                  {crumb.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
