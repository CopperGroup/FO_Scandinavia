import Link from "next/link"
import { ArrowLeft, ChevronLeft, ChevronRight, Info, Search } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Building blocks shared by every page of the admin panel.
 *
 * The panel is black and white. Colour appears only where a decision is
 * needed (a problem, a destructive action). Every page is an <AdminPage>:
 * the same gutters, the same header, the same place for the main action.
 */

/* ------------------------------------------------------------------ */
/* Class strings for native elements                                   */
/* ------------------------------------------------------------------ */

const buttonLook =
  "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

const BUTTON_TONES = {
  /** The one main action of a page or a form. */
  primary: "bg-black text-white hover:bg-neutral-800",
  secondary: "border border-neutral-300 bg-white text-neutral-900 hover:border-black",
  ghost: "text-neutral-700 hover:bg-neutral-100 hover:text-black",
  danger: "border border-red-200 bg-white text-red-700 hover:border-red-600 hover:bg-red-50",
  dangerSolid: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
}

const iconButtonLook =
  "inline-flex shrink-0 items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:cursor-not-allowed disabled:opacity-40"

const BUTTON = "h-control gap-2 px-3 text-sm"
const BUTTON_SM = "h-control-sm gap-1 px-2 text-xs"

/**
 * Buttons: 36px high (one 20px line, 8px above and below), 12px at the sides.
 * A button with only an icon is a 36px square: give it `aria-label` and
 * `data-tip` with the same words, so the pointer and a screen reader both get a name.
 */
export const adminButton = {
  primary: cn(buttonLook, BUTTON, BUTTON_TONES.primary),
  secondary: cn(buttonLook, BUTTON, BUTTON_TONES.secondary),
  ghost: cn(buttonLook, BUTTON, BUTTON_TONES.ghost),
  danger: cn(buttonLook, BUTTON, BUTTON_TONES.danger),
  dangerSolid: cn(buttonLook, BUTTON, BUTTON_TONES.dangerSolid),
  icon: cn(iconButtonLook, "h-control w-control"),
}

/** The same buttons at 28px, for a table row or a tight toolbar. Not for the main action of a page. */
export const adminButtonSm = {
  primary: cn(buttonLook, BUTTON_SM, BUTTON_TONES.primary),
  secondary: cn(buttonLook, BUTTON_SM, BUTTON_TONES.secondary),
  ghost: cn(buttonLook, BUTTON_SM, BUTTON_TONES.ghost),
  danger: cn(buttonLook, BUTTON_SM, BUTTON_TONES.danger),
  dangerSolid: cn(buttonLook, BUTTON_SM, BUTTON_TONES.dangerSolid),
  icon: cn(iconButtonLook, "h-control-sm w-control-sm"),
}

const inputLook =
  "w-full rounded-md border border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 disabled:bg-neutral-50 disabled:text-neutral-500"

export const adminInput = cn(inputLook, "h-control px-3")

/** A 28px field, for a table cell or a tight toolbar. */
export const adminInputSm = cn(inputLook, "h-control-sm px-2")

export const adminTextarea = cn(inputLook, "min-h-24 px-3 py-2")

export const adminLabel = "block text-sm font-medium text-neutral-900"

export const adminTable = {
  // "relative": a screen-reader-only label inside (absolutely positioned) must scroll with the table, or it widens the page on a phone.
  wrap: "relative overflow-x-auto",
  table: "w-full border-collapse text-sm",
  headRow: "border-b border-neutral-200 text-left text-xs font-medium text-neutral-500",
  // Header 36px (a 16px line, 10px above and below), rows 40px (a 20px line, 10px above and below).
  th: "whitespace-nowrap py-2.5 pr-4 font-medium",
  row: "border-b border-neutral-100 hover:bg-neutral-50",
  td: "py-2.5 pr-4 align-middle",
}

/* ------------------------------------------------------------------ */
/* Page frame                                                          */
/* ------------------------------------------------------------------ */

type AdminPageProps = {
  title: string
  /** One line under the title: what is on the page, or its key numbers. */
  description?: React.ReactNode
  /** Link back to the parent list, for detail and edit pages. */
  back?: { href: string; label: string }
  /** Buttons on the right of the header; the main action last. */
  actions?: React.ReactNode
  /** "narrow" for forms and reading (at most 880px), "full" for tables. */
  width?: "full" | "narrow"
  children: React.ReactNode
}

export function AdminPage({ title, description, back, actions, width = "full", children }: AdminPageProps) {
  return (
    <div className={cn("px-4 py-4 sm:px-6 sm:py-6", width === "narrow" && "mx-auto max-w-[55rem]")}>
      {back && (
        <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-black focus-visible:outline-none focus-visible:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        {/* A long title (a product name) gives way to the actions and stops at two lines; pointing at it shows the rest. */}
        <div className="min-w-0 flex-1 basis-72">
          <h1 className="line-clamp-2 break-words font-display text-xl font-semibold tracking-[-0.02em] text-neutral-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Content blocks                                                      */
/* ------------------------------------------------------------------ */

type PanelProps = {
  title?: string
  description?: React.ReactNode
  action?: React.ReactNode
  /** Tables run edge to edge: pass false and pad the cells instead. */
  padded?: boolean
  /** Anchor for <SectionNav>: the section scrolls to just below the sticky bars (the root's scroll-padding covers the top bar, scroll-mt the tabs). */
  id?: string
  className?: string
  children: React.ReactNode
}

/** A bordered block with an optional heading. Use for a group of fields or one table. */
export function Panel({ title, description, action, padded = true, id, className, children }: PanelProps) {
  return (
    <section id={id} className={cn("scroll-mt-10 rounded-lg border border-neutral-200 bg-white", className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-neutral-900">{title}</h2>}
            {description && <p className="text-sm text-neutral-500">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cn(padded && "p-4")}>{children}</div>
    </section>
  )
}

export function StatTile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-neutral-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  )
}

export function EmptyState({ title, text, action }: { title: string; text?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 px-6 py-12 text-center">
      <p className="font-display text-base font-semibold tracking-[-0.02em] text-neutral-900">{title}</p>
      {text && <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">{text}</p>}
      {action && <div className="mt-4 flex justify-center gap-2">{action}</div>}
    </div>
  )
}

export type PillTone = "neutral" | "strong" | "muted" | "problem" | "ok"

const PILL: Record<PillTone, string> = {
  neutral: "border-neutral-300 bg-white text-neutral-900",
  strong: "border-neutral-900 bg-neutral-900 text-white",
  muted: "border-neutral-200 bg-neutral-100 text-neutral-600",
  problem: "border-red-200 bg-red-50 text-red-800",
  ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
}

/** A 20px status tag. `tip` explains the status on hover: what it means and what happens next. */
export function Pill({ tone = "neutral", tip, children }: { tone?: PillTone; tip?: string; children: React.ReactNode }) {
  return (
    <span data-tip={tip} className={cn("inline-flex h-5 items-center whitespace-nowrap rounded-full border px-2 text-xs font-medium", PILL[tone])}>
      {children}
    </span>
  )
}

/**
 * A small "i" next to a label or a column title. The explanation opens on hover,
 * on keyboard focus and on a tap. Use it for what a thing is or how a number is
 * counted; words the admin needs in order to fill a field stay on the page.
 */
export function Hint({ text, label = "Пояснення" }: { text: string; label?: string }) {
  return (
    <button
      type="button"
      data-tip={text}
      data-tip-click=""
      aria-label={`${label}: ${text}`}
      className="-my-1 inline-flex h-6 w-6 shrink-0 cursor-help items-center justify-center rounded-full align-middle text-neutral-400 transition-colors hover:text-black focus-visible:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
    >
      <Info className="h-4 w-4" aria-hidden="true" />
    </button>
  )
}

/** A label with its control, hint and error, stacked. */
export function Field({
  label,
  htmlFor,
  hint,
  tip,
  error,
  optional,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  /** Words needed to fill the field; always visible under it. */
  hint?: React.ReactNode
  /** Background that is good to know but not needed to fill the field: opens from an "i" next to the label. */
  tip?: string
  error?: React.ReactNode
  optional?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <div className="flex items-center gap-1">
        <label htmlFor={htmlFor} className={adminLabel}>
          {label}
          {optional && <span className="ml-2 font-normal text-neutral-500">необов’язково</span>}
        </label>
        {tip && <Hint text={tip} label={label} />}
      </div>
      <div className="mt-1">{children}</div>
      {hint && !error && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* List controls (all URL-driven, so they work in server components)   */
/* ------------------------------------------------------------------ */

export type TabItem = {
  key: string
  label: string
  href: string
  count?: number
  active: boolean
  /** "problem" draws the tab in red: something here waits for the admin. */
  tone?: "problem"
  /** What the tab holds, shown on hover and on keyboard focus. */
  tip?: string
}

export function Tabs({ label, items }: { label: string; items: TabItem[] }) {
  return (
    <nav aria-label={label} className="overflow-x-auto border-b border-neutral-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex gap-1">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              data-tip={item.tip}
              className={cn(
                "-mb-px flex h-10 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:bg-neutral-100",
                item.tone === "problem"
                  ? item.active
                    ? "border-red-600 text-red-700"
                    : "border-transparent text-red-700 hover:text-red-800"
                  : item.active
                    ? "border-black text-black"
                    : "border-transparent text-neutral-500 hover:text-black",
              )}
            >
              {item.label}
              {typeof item.count === "number" && (
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs tabular-nums",
                    item.tone === "problem" ? (item.active ? "bg-red-600 text-white" : "bg-red-50 text-red-700") : item.active ? "bg-black text-white" : "bg-neutral-100 text-neutral-600",
                  )}
                >
                  {item.count}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** A GET form: submitting puts the query in the URL, so the server does the search. */
export function SearchForm({
  action,
  name = "q",
  defaultValue,
  placeholder,
  label,
  hidden,
  className,
}: {
  action: string
  name?: string
  defaultValue?: string
  placeholder: string
  label: string
  /** Other query values to keep (current tab, sort and so on). */
  hidden?: Record<string, string | undefined>
  className?: string
}) {
  const id = `search-${name}`
  return (
    <form action={action} role="search" className={cn("relative w-full sm:w-80", className)}>
      {Object.entries(hidden ?? {}).map(([key, value]) => (value ? <input key={key} type="hidden" name={key} value={value} /> : null))}
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
      <input id={id} name={name} type="search" defaultValue={defaultValue} placeholder={placeholder} className={cn(adminInput, "pl-9")} />
    </form>
  )
}

/** Pages to show: first, last and a window around the current one; null marks a gap. */
function pageWindow(page: number, pageCount: number, around: number): (number | null)[] {
  const wanted = new Set<number>([1, pageCount])
  for (let value = page - around; value <= page + around; value++) wanted.add(value)
  const pages = Array.from(wanted)
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((a, b) => a - b)
  const result: (number | null)[] = []
  pages.forEach((value, index) => {
    // A gap of exactly one page is shown as that page: "1 2 3", never "1 … 3".
    if (index > 0 && value - pages[index - 1] === 2) result.push(value - 1)
    else if (index > 0 && value - pages[index - 1] > 2) result.push(null)
    result.push(value)
  })
  return result
}

const number = new Intl.NumberFormat("uk-UA")

const pageItem =
  "inline-flex h-control-sm min-w-control-sm items-center justify-center rounded-md px-2 text-sm font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1"

export type PaginationProps = {
  page: number
  pageCount: number
  /** Lists driven by the URL (server pages): the address of a page. */
  hrefFor?: (page: number) => string
  /** Lists kept in the browser (a client component with its own state): called instead of following a link. */
  onPage?: (page: number) => void
  /** Number of rows in the whole list; with `pageSize` it gives "51–100 з 3 553". */
  total?: number
  pageSize?: number
  /**
   * Lets the admin type a page number. `action` is the list URL, `hidden` the other
   * query values to keep. With `onPage`, pass `true`.
   */
  jump?: { action?: string; hidden?: Record<string, string | undefined>; name?: string } | true
  /** Rows-per-page choices: `hrefFor` for URL-driven lists, `onChange` for lists kept in the browser. */
  sizes?: { options: number[]; hrefFor?: (size: number) => string; onChange?: (size: number) => void }
}

/**
 * List pagination. Shows where you are in the list, lets you step, pick a page
 * from a window around the current one, type a page number, and choose how
 * many rows a page holds.
 *
 * Two modes with one look: links (`hrefFor`; works in server components and
 * with the back button) or callbacks (`onPage`; for a list a client component
 * already holds in memory).
 */
export function Pagination({ page, pageCount, hrefFor, onPage, total, pageSize, jump, sizes }: PaginationProps) {
  if (pageCount <= 1 && !sizes) {
    return typeof total === "number" && total > 0 ? <p className="text-sm text-neutral-500">Усього: {number.format(total)}</p> : null
  }

  const from = pageSize ? (page - 1) * pageSize + 1 : null
  const to = pageSize && typeof total === "number" ? Math.min(total, page * pageSize) : null
  const summary =
    from && to && typeof total === "number"
      ? `${number.format(from)}–${number.format(to)} з ${number.format(total)}`
      : typeof total === "number"
        ? `Усього: ${number.format(total)}`
        : null

  /** One clickable item: a link in URL mode, a button in callback mode. */
  const go = (target: number, content: React.ReactNode, className: string, extra: { label?: string; rel?: "prev" | "next" } = {}) =>
    onPage ? (
      <button type="button" onClick={() => onPage(target)} aria-label={extra.label} data-tip={extra.rel ? extra.label : undefined} className={className}>
        {content}
      </button>
    ) : (
      <Link href={hrefFor ? hrefFor(target) : "#"} rel={extra.rel} aria-label={extra.label} data-tip={extra.rel ? extra.label : undefined} className={className}>
        {content}
      </Link>
    )

  const step = (target: number, label: string, rel: "prev" | "next", icon: React.ReactNode, enabled: boolean) =>
    enabled ? (
      go(target, icon, cn(pageItem, "text-neutral-700 hover:bg-neutral-100 hover:text-black"), { label, rel })
    ) : (
      <span aria-hidden="true" className={cn(pageItem, "text-neutral-300")}>
        {icon}
      </span>
    )

  const jumpForm = jump === true ? {} : jump
  const jumpName = jumpForm?.name ?? "page"

  return (
    <nav aria-label="Сторінки списку" className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-sm">
      <p className="tabular-nums text-neutral-500">{summary}</p>

      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          {step(page - 1, "Попередня сторінка", "prev", <ChevronLeft className="h-4 w-4" aria-hidden="true" />, page > 1)}

          {/* Phones: just the position. Wider screens: page numbers. */}
          <span className="px-2 tabular-nums text-neutral-700 sm:hidden">
            {page} з {pageCount}
          </span>
          <ul className="hidden items-center gap-1 sm:flex">
            {pageWindow(page, pageCount, 1).map((value, index) =>
              value === null ? (
                <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-neutral-400">
                  …
                </li>
              ) : value === page ? (
                <li key={value}>
                  <span aria-current="page" className={cn(pageItem, "bg-black text-white")}>
                    {value}
                  </span>
                </li>
              ) : (
                <li key={value}>{go(value, value, cn(pageItem, "text-neutral-700 hover:bg-neutral-100 hover:text-black"), { label: `Сторінка ${value}` })}</li>
              ),
            )}
          </ul>

          {step(page + 1, "Наступна сторінка", "next", <ChevronRight className="h-4 w-4" aria-hidden="true" />, page < pageCount)}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {jumpForm && pageCount > 7 && (
          <form
            action={onPage ? undefined : jumpForm.action}
            onSubmit={
              onPage
                ? (event) => {
                    event.preventDefault()
                    const field = event.currentTarget.elements.namedItem(jumpName) as HTMLInputElement | null
                    const wanted = Number.parseInt(field?.value ?? "", 10)
                    if (Number.isFinite(wanted)) onPage(Math.min(pageCount, Math.max(1, wanted)))
                    if (field) field.value = ""
                  }
                : undefined
            }
            className="flex items-center gap-2"
          >
            {!onPage && Object.entries(jumpForm.hidden ?? {}).map(([key, value]) => (value ? <input key={key} type="hidden" name={key} value={value} /> : null))}
            <label htmlFor="pagination-jump" className="text-neutral-500">
              Сторінка
            </label>
            <input
              id="pagination-jump"
              name={jumpName}
              type="number"
              min={1}
              max={pageCount}
              inputMode="numeric"
              placeholder={String(page)}
              className={cn(adminInputSm, "w-16 text-center tabular-nums")}
            />
            <button type="submit" className={adminButtonSm.secondary}>
              Перейти
            </button>
          </form>
        )}

        {sizes && (
          <div className="flex items-center gap-1">
            <span className="mr-1 text-neutral-500">На сторінці</span>
            {sizes.options.map((option) => {
              const change = sizes.onChange
              if (option === pageSize) {
                return (
                  <span key={option} aria-current="true" className={cn(pageItem, "bg-neutral-100 text-black")}>
                    {option}
                  </span>
                )
              }
              return change ? (
                <button key={option} type="button" onClick={() => change(option)} className={cn(pageItem, "text-neutral-600 hover:bg-neutral-100 hover:text-black")}>
                  {option}
                </button>
              ) : (
                <Link key={option} href={sizes.hrefFor ? sizes.hrefFor(option) : "#"} className={cn(pageItem, "text-neutral-600 hover:bg-neutral-100 hover:text-black")}>
                  {option}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </nav>
  )
}

/** Earlier name of <Pagination>; same component. */
export const Pager = Pagination

/* ------------------------------------------------------------------ */
/* Layouts that keep long pages short                                  */
/* ------------------------------------------------------------------ */

/**
 * Form page: the sections on the left, and on the right a narrow column that
 * stays in view. The side column is for information only (status, a live
 * preview, dates, numbers): buttons and inputs go to the form itself, and
 * saving goes to <SaveBar>.
 */
export function FormLayout({
  children,
  aside,
  asideTop = 72,
}: {
  children: React.ReactNode
  aside: React.ReactNode
  /**
   * Where the side column sticks, in px from the top of the window: the top
   * bar (56) plus 16. Pass 112 when a <SectionNav> (40) sits above the form.
   */
  asideTop?: number
}) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-4">{children}</div>
      {/* A side column taller than the window scrolls by itself, and stops above a <SaveBar> (5rem). */}
      <aside
        style={{ "--aside-top": `${asideTop / 16}rem` } as React.CSSProperties}
        className="space-y-4 lg:sticky lg:top-[var(--aside-top)] lg:max-h-[calc(100dvh-var(--aside-top)-5rem)] lg:overflow-y-auto lg:overscroll-contain"
      >
        {aside}
      </aside>
    </div>
  )
}

/**
 * "On this page" tabs for a long form or record. They stick under the top bar
 * and jump to a section (a <Panel id=…>), so every part is one click away.
 */
export function SectionNav({ items }: { items: { id: string; label: string; count?: number }[] }) {
  return (
    <nav
      aria-label="Розділи сторінки"
      className="sticky top-14 z-10 -mx-4 overflow-x-auto border-b border-neutral-200 bg-white px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
    >
      <ul className="flex gap-1">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="flex h-10 items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 text-sm font-medium text-neutral-500 transition-colors hover:border-neutral-300 hover:text-black focus-visible:bg-neutral-100 focus-visible:outline-none"
            >
              {item.label}
              {typeof item.count === "number" && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-100 px-1.5 text-xs tabular-nums text-neutral-600">{item.count}</span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * The action bar of a form or a wizard step, pinned to the bottom of the window:
 * secondary actions on the left (`start`: back, cancel), a short status in the
 * middle (`note`: unsaved changes, what will happen, an error), the main button
 * on the right (`children`).
 *
 * This is where the buttons of a page go, on every screen size. Actions are
 * never tucked into a side card: the side column is for information.
 * Inside <AdminPage> it spans the page gutters; inside a <SplitView> pane pass
 * `flush` and it spans the pane.
 */
export function SaveBar({
  children,
  note,
  start,
  flush = false,
  className,
}: {
  children: React.ReactNode
  note?: React.ReactNode
  start?: React.ReactNode
  flush?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-neutral-200 bg-white/95 py-3 backdrop-blur",
        // Flush: the gutters of a pane (px-4 sm:px-6). Otherwise it spans the <AdminPage> gutters.
        // The bottom margin is forced: a `space-y-*` parent would otherwise reset it and leave a gap under the bar.
        flush ? "px-4 sm:px-6" : "-mx-4 !-mb-4 px-4 sm:-mx-6 sm:!-mb-6 sm:px-6",
        className,
      )}
    >
      {start && <div className="flex flex-wrap items-center gap-2">{start}</div>}
      {/* On a phone the status gets a row of its own above the buttons: squeezed between them it would wrap into a column of single words. */}
      <div className="order-first min-w-0 basis-full text-sm text-neutral-600 empty:hidden sm:order-none sm:flex-1 sm:basis-0">{note}</div>
      <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

/**
 * Two panes filling the window under the top bar: a list (or a tree) on the
 * left and the chosen item on the right, each with its own scroll. Use it
 * instead of one very long page: pick on the left, work on the right.
 * Render it as the only child of the route (not inside <AdminPage>).
 */
export function SplitView({
  list,
  detail,
  listLabel,
  showDetailOnMobile = false,
}: {
  list: React.ReactNode
  detail: React.ReactNode
  listLabel: string
  /** On a phone only one pane fits: true shows the detail, false the list. */
  showDetailOnMobile?: boolean
}) {
  return (
    <div className="lg:grid lg:h-[calc(100dvh-3.5rem)] lg:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[22.5rem_minmax(0,1fr)]">
      <aside
        aria-label={listLabel}
        className={cn("min-h-0 border-neutral-200 lg:flex lg:flex-col lg:overflow-hidden lg:border-r", showDetailOnMobile ? "hidden" : "flex flex-col")}
      >
        {list}
      </aside>
      <section className={cn("min-h-0 min-w-0 lg:block lg:overflow-y-auto lg:overscroll-contain", showDetailOnMobile ? "block" : "hidden")}>{detail}</section>
    </div>
  )
}

/**
 * The card for <FormLayout aside>: its content scrolls when the window is
 * short, and the `footer` (the main button) stays pinned at its bottom, so the
 * action is in view at any window height.
 */
export function AsideCard({
  title,
  children,
  footer,
  top = 72,
}: {
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
  /** Distance from the top of the window to the card in px, like <FormLayout asideTop>. */
  top?: number
}) {
  return (
    <div
      style={{ "--aside-top": `${top / 16}rem` } as React.CSSProperties}
      className="flex flex-col rounded-lg border border-neutral-200 bg-white lg:max-h-[calc(100dvh-var(--aside-top)-5rem)]"
    >
      {title && <h2 className="shrink-0 border-b border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-900">{title}</h2>}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">{children}</div>
      {footer && <div className="shrink-0 space-y-2 border-t border-neutral-200 p-4">{footer}</div>}
    </div>
  )
}
