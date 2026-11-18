import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * The frame of every view in the right pane of the categories admin, so they
 * all share one left edge and one rhythm: header (back link on phones,
 * breadcrumb, title, meta line, actions, numbers), tabs, body, and an
 * optional action bar pinned to the bottom of the pane.
 *
 * Gutters: 16px on phones, 24px from `sm`. Vertical gaps: 24px between blocks.
 */

export const paneGutter = "px-4 sm:px-6"

export function PaneShell({
  crumbs,
  title,
  meta,
  actions,
  stats,
  tabs,
  home = false,
  children,
}: {
  /** The overview itself: no "Усі категорії" link above the title. */
  home?: boolean
  /** Ancestors shown above the title; the list itself is always reachable through "Усі категорії". */
  crumbs?: { href: string; label: string }[]
  title: React.ReactNode
  meta?: React.ReactNode
  actions?: React.ReactNode
  stats?: React.ReactNode
  tabs?: React.ReactNode
  /** <PaneBody> and, for a form, <SaveBar flush>. */
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-full flex-col">
      <header className={cn(paneGutter, "pt-4 sm:pt-4")}>
        {!home && <nav aria-label="Шлях" className="mb-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-500">
          <Link
            href="/admin/categories"
            className="inline-flex h-7 items-center gap-2 rounded-md hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black lg:h-auto"
          >
            <ArrowLeft className="h-4 w-4 lg:hidden" aria-hidden="true" />
            Усі категорії
          </Link>
          {crumbs?.map((crumb) => (
            <span key={crumb.href} className="inline-flex min-w-0 items-center gap-2">
              <span aria-hidden="true" className="text-neutral-300">
                /
              </span>
              <Link href={crumb.href} className="max-w-[16rem] truncate hover:text-black hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black" data-tip={crumb.label}>
                {crumb.label}
              </Link>
            </span>
          ))}
        </nav>}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <h1 className="min-w-0 flex-1 basis-64 break-words font-display text-xl font-semibold tracking-[-0.02em] text-neutral-900">{title}</h1>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {meta && <p className="mt-1 text-sm text-neutral-500">{meta}</p>}
        {stats && <div className="mt-4">{stats}</div>}
      </header>
      {tabs && <div className={cn(paneGutter, "mt-2")}>{tabs}</div>}
      {children}
    </div>
  )
}

/** The content of a view: cards with 24px between them. */
export function PaneBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn(paneGutter, "flex-1 space-y-4 py-6", className)}>{children}</div>
}

export type Stat = { label: string; value: React.ReactNode; hint?: React.ReactNode; href?: string; tone?: "problem" }

/** Up to four key numbers in one compact row (two by two on phones). */
export function StatStrip({ items }: { items: Stat[] }) {
  return (
    <div className={cn("grid gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200", items.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3")}>
      {items.map((item) => {
        const body = (
          <>
            <p className="truncate text-xs text-neutral-500">{item.label}</p>
            <p className="mt-0.5 flex min-w-0 items-baseline gap-2">
              <span className={cn("shrink-0 text-base font-semibold tabular-nums", item.tone === "problem" ? "text-red-700" : "text-neutral-900")}>{item.value}</span>
              {item.hint && <span className="min-w-0 truncate text-xs text-neutral-500">{item.hint}</span>}
            </p>
          </>
        )
        return item.href ? (
          <Link key={item.label} href={item.href} className="block min-w-0 bg-white px-4 py-2.5 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black">
            {body}
          </Link>
        ) : (
          <div key={item.label} className="min-w-0 bg-white px-4 py-2.5">
            {body}
          </div>
        )
      })}
    </div>
  )
}
