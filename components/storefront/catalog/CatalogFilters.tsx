"use client"

import { useEffect, useRef, useState } from "react"
import * as Select from "@radix-ui/react-select"
import { ArrowUpDown, Check, ChevronDown, SlidersHorizontal, X } from "lucide-react"
import Drawer from "@/components/storefront/Drawer"
import {
  activeFilterCount,
  parseSelectParams,
  parseUnitParams,
  serializeUnitParams,
  splitList,
  toggleInList,
  toggleSelectParam,
} from "@/lib/storefront/catalog-url"
import { countLabel, PRODUCT_FORMS } from "@/lib/storefront/format"
import { cn } from "@/lib/utils"
import { CatalogLink, PendingBar, useCatalog } from "./CatalogContext"

export type FilterData = {
  /** Changes when the shopper moves to another department, category or search: the point where facet order may be recomputed. */
  scopeKey: string
  sizes: { value: string; count: number }[]
  vendors: { name: string; count: number | null }[]
  priceMin: number
  priceMax: number
  selectParams: { name: string; values: { value: string; count: number }[] }[]
  unitParams: { name: string; min: number; max: number }[]
  saleAvailable: boolean
  categoryGroups: { label: string | null; items: { id: string; label: string; href: string; count: number; active: boolean }[] }[]
  /** Where "all categories" of the current scope leads; null when nothing narrower is selected. */
  categoryResetHref: string | null
}

export type AppliedChip = { label: string; href: string }

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "default", label: "Спочатку нові" },
  { value: "popular", label: "Популярні" },
  { value: "low_price", label: "Дешевші" },
  { value: "hight_price", label: "Дорожчі" },
  { value: "discount", label: "Більша знижка" },
]

const COLLAPSED_ROWS = 8
const COLLAPSED_SIZES = 18

/* ------------------------------------------------------------------ */
/* Stability helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Keeps list items in the order they were first seen while the scope stays
 * the same. Facet counts change with every filter; without this a checked row
 * would jump to another place right under the pointer.
 */
function useStableOrder<T>(scopeKey: string, items: T[], keyOf: (item: T) => string): T[] {
  const memory = useRef<{ scope: string; order: Map<string, number> }>({ scope: scopeKey, order: new Map() })
  if (memory.current.scope !== scopeKey) memory.current = { scope: scopeKey, order: new Map() }

  const { order } = memory.current
  for (const item of items) {
    const key = keyOf(item)
    if (!order.has(key)) order.set(key, order.size)
  }
  return [...items].sort((a, b) => (order.get(keyOf(a)) ?? 0) - (order.get(keyOf(b)) ?? 0))
}

/* ------------------------------------------------------------------ */
/* Pieces of the panel                                                 */
/* ------------------------------------------------------------------ */

function Section({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string
  count?: number
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <section className="border-b border-brand-line">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="flex min-h-12 w-full items-center justify-between gap-3 text-left text-base font-semibold text-brand-ink focus-visible:outline-none focus-visible:text-brand"
        >
          <span>
            {title}
            {count ? <span className="ml-2 rounded-full bg-brand px-2 leading-5 text-xs font-bold tabular-nums text-white">{count}</span> : null}
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-brand-muted transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
      </h3>
      {open && <div className="pb-4">{children}</div>}
    </section>
  )
}

function CheckRow({ label, count, checked, onChange }: { label: string; count?: number | null; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm text-base text-brand-ink hover:text-brand">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="check check-brand"
      />
      <span className="min-w-0 flex-1 break-words">{label}</span>
      {/* The slot is always there, so a count appearing or vanishing cannot re-wrap the label. */}
      <span className="w-9 shrink-0 text-right text-sm tabular-nums text-brand-muted">{typeof count === "number" ? count : ""}</span>
    </label>
  )
}

function ShowMore({ expanded, hidden, onToggle }: { expanded: boolean; hidden: number; onToggle: () => void }) {
  if (hidden <= 0) return null
  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onToggle}
      className="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:text-brand-deep focus-visible:outline-none focus-visible:underline"
    >
      {expanded ? "Згорнути" : `Показати ще ${hidden}`}
    </button>
  )
}

function RangeForm({
  min,
  max,
  floor,
  ceiling,
  onApply,
}: {
  min: string
  max: string
  floor: number
  ceiling: number
  onApply: (min: string, max: string) => void
}) {
  const [from, setFrom] = useState(min)
  const [to, setTo] = useState(max)

  useEffect(() => {
    setFrom(min)
    setTo(max)
  }, [min, max])

  const inputClass =
    "mt-1 h-11 w-full rounded-md border border-brand-line bg-white px-3 text-base tabular-nums text-brand-ink placeholder:text-brand-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onApply(from.trim(), to.trim())
      }}
      className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2"
    >
      <label className="text-xs text-brand-muted">
        Від
        <input inputMode="decimal" value={from} onChange={(event) => setFrom(event.target.value)} placeholder={String(floor)} className={inputClass} />
      </label>
      <label className="text-xs text-brand-muted">
        До
        <input inputMode="decimal" value={to} onChange={(event) => setTo(event.target.value)} placeholder={String(ceiling)} className={inputClass} />
      </label>
      <button
        type="submit"
        className="h-11 rounded-md border border-brand-ink/80 px-4 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-ink hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        OK
      </button>
    </form>
  )
}

/* ------------------------------------------------------------------ */
/* The filter list                                                     */
/* ------------------------------------------------------------------ */

/** The filter list itself; rendered in the desktop sidebar and in the mobile sheet. */
export function FilterPanel({ data }: { data: FilterData }) {
  const { params, navigate } = useCatalog()

  // Open/closed and "show more" belong to the shopper: results arriving never change them.
  const [openState, setOpenState] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const isOpen = (key: string, byDefault: boolean) => openState[key] ?? byDefault
  const toggleOpen = (key: string, byDefault: boolean) => setOpenState((state) => ({ ...state, [key]: !(state[key] ?? byDefault) }))
  const toggleExpanded = (key: string) => setExpanded((state) => ({ ...state, [key]: !state[key] }))

  const selectedSizes = splitList(params.size, "__")
  const selectedVendors = splitList(params.vendor, ",")
  const selectState = parseSelectParams(params.selectParams)
  const unitState = parseUnitParams(params.unitParams)

  const allVendors = useStableOrder(data.scopeKey, data.vendors, (vendor) => vendor.name)
  const sizes = expanded.sizes ? data.sizes : data.sizes.slice(0, COLLAPSED_SIZES)
  const vendors = expanded.vendors ? allVendors : allVendors.slice(0, COLLAPSED_ROWS)

  return (
    <div>
      {data.categoryGroups.length > 0 && (
        <Section title="Категорія" open={isOpen("category", true)} onToggle={() => toggleOpen("category", true)}>
          {data.categoryResetHref && (
            <CatalogLink
              href={data.categoryResetHref}
              className="mb-2 inline-block text-sm font-semibold text-brand hover:text-brand-deep focus-visible:outline-none focus-visible:underline"
            >
              Усі категорії
            </CatalogLink>
          )}
          <div className="space-y-3">
            {data.categoryGroups.map((group, index) => (
              <div key={group.label ?? index}>
                {group.label && <p className="pb-1 text-xs font-medium text-brand-muted">{group.label}</p>}
                <ul>
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <CatalogLink
                        href={item.href}
                        aria-current={item.active ? "true" : undefined}
                        className={cn(
                          "flex min-h-11 items-center justify-between gap-3 text-base hover:text-brand focus-visible:outline-none focus-visible:underline",
                          item.active ? "font-semibold text-brand" : "text-brand-ink",
                        )}
                      >
                        <span>{item.label}</span>
                        <span className="text-sm font-normal tabular-nums text-brand-muted">{item.count}</span>
                      </CatalogLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {data.sizes.length > 1 && (
        <Section title="Розмір" count={selectedSizes.length} open={isOpen("sizes", true)} onToggle={() => toggleOpen("sizes", true)}>
          <ul className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const selected = selectedSizes.includes(size.value)
              return (
                <li key={size.value}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => navigate({ size: toggleInList(params.size, size.value, "__") })}
                    className={cn(
                      "h-11 min-w-11 rounded-md border px-3 text-sm font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1",
                      selected ? "border-brand-ink bg-brand-ink text-white" : "border-brand-line bg-white text-brand-ink hover:border-brand-ink",
                    )}
                  >
                    {size.value}
                  </button>
                </li>
              )
            })}
          </ul>
          <ShowMore expanded={Boolean(expanded.sizes)} hidden={data.sizes.length - COLLAPSED_SIZES} onToggle={() => toggleExpanded("sizes")} />
        </Section>
      )}

      {data.priceMax > data.priceMin && (
        <Section title="Ціна, ₴" count={params.minPrice || params.maxPrice ? 1 : 0} open={isOpen("price", true)} onToggle={() => toggleOpen("price", true)}>
          <RangeForm
            min={params.minPrice ?? ""}
            max={params.maxPrice ?? ""}
            floor={data.priceMin}
            ceiling={data.priceMax}
            onApply={(min, max) => navigate({ minPrice: min || null, maxPrice: max || null })}
          />
          {data.saleAvailable && (
            <div className="mt-3">
              <CheckRow label="Тільки зі знижкою" checked={params.sale === "1"} onChange={() => navigate({ sale: params.sale === "1" ? null : "1" })} />
            </div>
          )}
        </Section>
      )}

      {data.vendors.length > 1 && (
        <Section title="Бренд" count={selectedVendors.length} open={isOpen("vendors", true)} onToggle={() => toggleOpen("vendors", true)}>
          {vendors.map((vendor) => (
            <CheckRow
              key={vendor.name}
              label={vendor.name}
              count={vendor.count}
              checked={selectedVendors.includes(vendor.name)}
              onChange={() => navigate({ vendor: toggleInList(params.vendor, vendor.name, ",") })}
            />
          ))}
          <ShowMore expanded={Boolean(expanded.vendors)} hidden={allVendors.length - COLLAPSED_ROWS} onToggle={() => toggleExpanded("vendors")} />
        </Section>
      )}

      {data.selectParams.map((param) => {
        const key = `select:${param.name}`
        const selected = selectState[param.name] ?? []
        const values = expanded[key] ? param.values : param.values.slice(0, COLLAPSED_ROWS)
        // Closed by default; a section with a choice in it opens. Once the shopper toggles it, their choice wins.
        const byDefault = selected.length > 0
        return (
          <Section key={key} title={param.name} count={selected.length} open={isOpen(key, byDefault)} onToggle={() => toggleOpen(key, byDefault)}>
            {values.map((entry) => (
              <CheckRow
                key={entry.value}
                label={entry.value}
                count={entry.count}
                checked={selected.includes(entry.value)}
                onChange={() => {
                  // Keep the section open after its last value is unchecked.
                  setOpenState((state) => ({ ...state, [key]: true }))
                  navigate({ selectParams: toggleSelectParam(params.selectParams, param.name, entry.value) })
                }}
              />
            ))}
            <ShowMore expanded={Boolean(expanded[key])} hidden={param.values.length - COLLAPSED_ROWS} onToggle={() => toggleExpanded(key)} />
          </Section>
        )
      })}

      {data.unitParams.map((param) => {
        const key = `unit:${param.name}`
        const range = unitState[param.name]
        const byDefault = Boolean(range)
        return (
          <Section key={key} title={param.name} count={range ? 1 : 0} open={isOpen(key, byDefault)} onToggle={() => toggleOpen(key, byDefault)}>
            <RangeForm
              min={range?.min ?? ""}
              max={range?.max ?? ""}
              floor={param.min}
              ceiling={param.max}
              onApply={(min, max) => {
                setOpenState((state) => ({ ...state, [key]: true }))
                const next = { ...unitState }
                if (min === "" && max === "") delete next[param.name]
                else next[param.name] = { min: min || String(param.min), max: max || String(param.max) }
                navigate({ unitParams: serializeUnitParams(next) })
              }}
            />
          </Section>
        )
      })}
    </div>
  )
}

/**
 * Desktop filter column. It sticks below the header and is never taller than
 * the window: a long filter list scrolls on its own, so every filter stays
 * within reach wherever the shopper is in the product grid.
 */
export function FilterSidebar({ data, resetHref }: { data: FilterData; resetHref: string }) {
  const { params } = useCatalog()
  const applied = activeFilterCount(params)

  return (
    <aside
      aria-label="Фільтри"
      className="sticky top-[calc(var(--sticky-top)+16px)] hidden max-h-[calc(100dvh-var(--sticky-top)-32px)] flex-col transition-[top,max-height] duration-200 lg:flex"
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-brand-line">
        <h2 className="text-base font-semibold text-brand-ink">
          Фільтри
          {applied > 0 && <span className="ml-2 rounded-full bg-brand px-2 leading-5 text-xs font-bold tabular-nums text-white">{applied}</span>}
        </h2>
        {applied > 0 && (
          <CatalogLink href={resetHref} className="text-sm font-semibold text-brand hover:text-brand-deep focus-visible:outline-none focus-visible:underline">
            Скинути
          </CatalogLink>
        )}
      </div>
      {/* The gutter is reserved, so the scrollbar appearing cannot push the rows sideways. */}
      <div className="-mr-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-3 [scrollbar-gutter:stable] [scrollbar-width:thin]">
        <FilterPanel data={data} />
      </div>
    </aside>
  )
}

/* ------------------------------------------------------------------ */
/* Sorting                                                             */
/* ------------------------------------------------------------------ */

function SortMenu({ className }: { className?: string }) {
  const { params, navigate } = useCatalog()
  const sort = SORT_OPTIONS.some((option) => option.value === params.sort) ? params.sort : "default"
  const labelOf = (option: { value: string; label: string }) => (option.value === "default" && params.search ? "За відповідністю" : option.label)

  return (
    <Select.Root value={sort} onValueChange={(value) => navigate({ sort: value })}>
      <Select.Trigger
        aria-label="Сортування"
        className={cn(
          "group inline-flex h-11 items-center gap-2 rounded-md border border-brand-line bg-white px-4 text-sm font-medium text-brand-ink transition-colors hover:border-brand-ink focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 data-[state=open]:border-brand-ink",
          className,
        )}
      >
        <ArrowUpDown className="h-4 w-4 shrink-0 text-brand-muted" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-left">
          <Select.Value />
        </span>
        <Select.Icon>
          <ChevronDown className="h-4 w-4 shrink-0 text-brand-muted transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          position="popper"
          align="end"
          sideOffset={8}
          className="z-[60] min-w-[max(var(--radix-select-trigger-width),14rem)] overflow-hidden rounded-md border border-brand-line bg-white p-2 text-brand-ink shadow-[0_18px_40px_-12px_rgba(16,34,46,0.35)] data-[state=open]:animate-sheet-up"
        >
          <Select.Viewport>
            {SORT_OPTIONS.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className="relative flex h-11 cursor-pointer select-none items-center rounded-sm pl-9 pr-3 text-base outline-none data-[highlighted]:bg-brand-mist data-[state=checked]:font-semibold"
              >
                <Select.ItemIndicator className="absolute left-3 flex h-4 w-4 items-center justify-center">
                  <Check className="h-4 w-4 text-brand" aria-hidden="true" />
                </Select.ItemIndicator>
                <Select.ItemText>{labelOf(option)}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

/* ------------------------------------------------------------------ */
/* Toolbar                                                             */
/* ------------------------------------------------------------------ */

function Chips({ chips, resetHref, className }: { chips: AppliedChip[]; resetHref: string; className?: string }) {
  if (chips.length === 0) return null
  return (
    <ul aria-label="Застосовані фільтри" className={cn("flex items-center gap-2", className)}>
      {chips.map((chip) => (
        <li key={chip.label} className="shrink-0">
          <CatalogLink
            href={chip.href}
            className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full bg-brand-tint pl-4 pr-3 text-sm font-medium text-brand-deep transition-colors hover:bg-brand hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            {chip.label}
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">, прибрати фільтр</span>
          </CatalogLink>
        </li>
      ))}
      {chips.length > 1 && (
        <li className="shrink-0">
          <CatalogLink href={resetHref} className="whitespace-nowrap px-2 text-sm font-semibold text-brand hover:text-brand-deep focus-visible:outline-none focus-visible:underline">
            Скинути все
          </CatalogLink>
        </li>
      )}
    </ul>
  )
}

/**
 * The bar above the results. It has one fixed height and sticks below the
 * header, so applying or removing a filter never moves the product grid:
 * the chips live inside the bar and scroll sideways when there are many.
 *
 * Desktop: result count, applied filters, sorting.
 * Phones: the "Фільтри" button and sorting, with the chips on a second row.
 */
export function CatalogToolbar({ data, total, chips, resetHref }: { data: FilterData; total: number; chips: AppliedChip[]; resetHref: string }) {
  const { params } = useCatalog()
  const [open, setOpen] = useState(false)
  const applied = activeFilterCount(params)

  // A filter chosen in the sheet keeps the sheet open; leaving the catalog scope closes it.
  useEffect(() => setOpen(false), [data.scopeKey])

  return (
    <>
      {/* 56px tall, border included: the same box as the heading of the filter column beside it. */}
      <div className="sticky top-[var(--sticky-top)] z-30 -mx-4 h-14 border-b border-brand-line bg-white px-4 transition-[top] duration-200 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <div className="flex h-full items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-brand-ink/80 px-4 text-sm font-semibold text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Фільтри
            {applied > 0 && <span className="rounded-full bg-brand px-2 leading-5 text-xs font-bold tabular-nums text-white">{applied}</span>}
          </button>

          <p className="hidden shrink-0 text-sm tabular-nums text-brand-muted lg:block" aria-live="polite">
            {countLabel(total, PRODUCT_FORMS)}
          </p>

          <div className="hidden min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] lg:block [&::-webkit-scrollbar]:hidden">
            <Chips chips={chips} resetHref={resetHref} />
          </div>

          <SortMenu className="min-w-0 flex-1 lg:w-56 lg:flex-none" />
        </div>
        <PendingBar />
      </div>

      {/* Phones: chips on their own row of fixed height, present only when there are filters. */}
      {chips.length > 0 && (
        <div className="-mx-4 overflow-x-auto px-4 pt-3 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:hidden [&::-webkit-scrollbar]:hidden">
          <Chips chips={chips} resetHref={resetHref} />
        </div>
      )}

      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="Фільтри"
        description="Фільтри каталогу"
        headerExtra={
          applied > 0 ? (
            <CatalogLink href={resetHref} className="px-2 text-sm font-semibold text-brand focus-visible:outline-none focus-visible:underline">
              Скинути
            </CatalogLink>
          ) : null
        }
        footer={
          <div className="px-4 py-3">
            <button type="button" onClick={() => setOpen(false)} className="btn-primary w-full">
              Показати {countLabel(total, PRODUCT_FORMS)}
            </button>
          </div>
        }
      >
        <div className="px-4">
          <FilterPanel data={data} />
        </div>
      </Drawer>
    </>
  )
}
