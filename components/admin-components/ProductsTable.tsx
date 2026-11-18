"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useRef, useState, useTransition } from "react"
import { Download, FolderInput, Percent, Trash2, X } from "lucide-react"
import { Pill, adminButton, adminTable } from "@/components/admin/ui"
import BulkEditProductsModal, { type BulkMode } from "./modals/BulkEditProductsModal/BulkEditProductsModal"
import type { BulkTarget } from "@/lib/actions/product.actions"
import type { ProductListFilter, ProductRow } from "@/lib/admin/products"
import { discountPercent, productsWord } from "@/lib/admin/catalog-shared"
import { cn } from "@/lib/utils"

const money = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 })
const dateFormat = new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Kiev" })

type Props = {
  rows: ProductRow[]
  /** How many products match the current filter (all pages). */
  total: number
  /** "51–100 з 3 553": where this page sits in the list. */
  position?: string
  filter: ProductListFilter
  categories: { id: string; name: string; path?: string }[]
}

/**
 * One page of products with selection and bulk actions. Selection covers the
 * rows on this page, or, after "select all matching", every product that
 * matches the filter; the server resolves that set itself.
 */
export default function ProductsTable({ rows, total, position, filter, categories }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [allMatching, setAllMatching] = useState(false)
  const [mode, setMode] = useState<BulkMode | null>(null)
  const [notice, setNotice] = useState("")
  const [, startTransition] = useTransition()
  const exportForm = useRef<HTMLFormElement>(null)

  const pageIds = useMemo(() => rows.map((row) => row._id), [rows])
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const count = allMatching ? total : selected.size
  const target: BulkTarget = allMatching ? { filter } : { ids: Array.from(selected) }
  const sampleNames = allMatching ? rows.slice(0, 5).map((row) => row.name) : rows.filter((row) => selected.has(row._id)).map((row) => row.name)

  const toggle = (id: string) => {
    setAllMatching(false)
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const togglePage = () => {
    setAllMatching(false)
    setSelected(allOnPage ? new Set() : new Set(pageIds))
  }

  const clear = () => {
    setSelected(new Set())
    setAllMatching(false)
  }

  const done = (message: string) => {
    setMode(null)
    clear()
    setNotice(message)
    startTransition(() => router.refresh())
  }

  return (
    <div>
      {/* Bulk bar: stays in view while the admin scrolls the list. */}
      <div className={cn("sticky top-0 z-10 border-b border-neutral-200 bg-white px-4 py-3 sm:px-4", count === 0 && "py-2")}>
        <div className="flex flex-wrap items-center gap-2">
          {count > 0 ? (
            <>
              <p className="mr-2 text-sm font-medium tabular-nums" aria-live="polite">
                Вибрано {count} {productsWord(count)}
              </p>
              {!allMatching && allOnPage && total > rows.length && (
                <button type="button" className={cn(adminButton.ghost, "underline underline-offset-2")} onClick={() => setAllMatching(true)}>
                  Вибрати всі {total} за фільтром
                </button>
              )}
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                <button type="button" className={adminButton.secondary} onClick={() => setMode("category")}>
                  <FolderInput className="h-4 w-4" aria-hidden="true" />
                  Категорія
                </button>
                <button type="button" className={adminButton.secondary} onClick={() => setMode("price")}>
                  <Percent className="h-4 w-4" aria-hidden="true" />
                  Ціна
                </button>
                <button type="button" className={adminButton.secondary} onClick={() => exportForm.current?.requestSubmit()}>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Завантажити файл (XML)
                </button>
                <button type="button" className={adminButton.danger} onClick={() => setMode("delete")}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Видалити
                </button>
                <button type="button" className={adminButton.icon} onClick={clear} aria-label="Зняти вибір">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-neutral-500" aria-live="polite">
                {notice || (
                  <>
                    <span className="font-medium tabular-nums text-neutral-900">{position ?? total}</span> · Позначте товари, щоб змінити їх разом.
                  </>
                )}
              </p>
              <button type="button" className={cn(adminButton.ghost, "ml-auto")} onClick={() => exportForm.current?.requestSubmit()}>
                <Download className="h-4 w-4" aria-hidden="true" />
                Завантажити файл (XML), {total}
              </button>
            </>
          )}
        </div>
      </div>

      {/* The export runs on the server and comes back as a file download; the page stays. */}
      <form ref={exportForm} method="post" action="/admin/products/export" className="hidden">
        {count > 0 && !allMatching ? (
          <input type="hidden" name="ids" value={Array.from(selected).join(",")} />
        ) : (
          <>
            <input type="hidden" name="tab" value={filter.tab} />
            <input type="hidden" name="q" value={filter.query} />
            <input type="hidden" name="category" value={filter.category} />
          </>
        )}
      </form>

      {/* Wide screens: a table. */}
      <div className={cn(adminTable.wrap, "hidden md:block")}>
        <table className={cn(adminTable.table, "min-w-[53.75rem]")}>
          <thead>
            <tr className={adminTable.headRow}>
              <th scope="col" className="w-12 py-3 pl-4 pr-2">
                <input
                  type="checkbox"
                  checked={allOnPage}
                  onChange={togglePage}
                  aria-label={allOnPage ? "Зняти вибір з усіх на сторінці" : "Вибрати всі на сторінці"}
                  className="check"
                />
              </th>
              <th scope="col" className={adminTable.th}>
                Товар
              </th>
              <th scope="col" className={adminTable.th}>
                Категорії
              </th>
              <th scope="col" className={adminTable.th}>
                Склад
              </th>
              <th scope="col" className={cn(adminTable.th, "text-right")}>
                Ціна, ₴
              </th>
              <th scope="col" className={cn(adminTable.th, "pr-4")}>
                Змінено
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isSelected = allMatching || selected.has(row._id)
              return (
                <tr key={row._id} className={cn(adminTable.row, isSelected && "bg-neutral-50")}>
                  <td className="py-3 pl-4 pr-2 align-middle">
                    <input type="checkbox" checked={isSelected} onChange={() => toggle(row._id)} aria-label={`Вибрати «${row.name}»`} className="check" />
                  </td>
                  <td className={adminTable.td}>
                    <div className="flex items-center gap-3">
                      <Thumb src={row.image} />
                      <div className="min-w-0">
                        <Link
                          href={`/admin/createProduct/list/${row._id}`}
                          className="line-clamp-2 font-medium text-neutral-900 hover:underline focus-visible:underline focus-visible:outline-none"
                        >
                          {row.name || "Без назви"}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-neutral-500">
                          {[row.articleNumber && `Арт. ${row.articleNumber}`, row.vendor, `ID ${row.id}`].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={cn(adminTable.td, "max-w-[13.75rem]")}>
                    <CategoryPills row={row} />
                  </td>
                  <td className={adminTable.td}>
                    <Stock row={row} />
                  </td>
                  <td className={cn(adminTable.td, "text-right")}>
                    <Price row={row} />
                  </td>
                  <td className={cn(adminTable.td, "whitespace-nowrap pr-4 text-xs text-neutral-500")}>
                    {row.updatedAt ? dateFormat.format(new Date(row.updatedAt)) : "—"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Phones: cards. */}
      <ul className="divide-y divide-neutral-100 md:hidden">
        <li className="flex items-center gap-3 px-4 py-3 text-sm">
          <input type="checkbox" id="select-page-mobile" checked={allOnPage} onChange={togglePage} className="check" />
          <label htmlFor="select-page-mobile" className="text-neutral-600">
            Вибрати всі на сторінці
          </label>
        </li>
        {rows.map((row) => {
          const isSelected = allMatching || selected.has(row._id)
          return (
            <li key={row._id} className={cn("flex gap-3 px-4 py-4", isSelected && "bg-neutral-50")}>
              <input type="checkbox" checked={isSelected} onChange={() => toggle(row._id)} aria-label={`Вибрати «${row.name}»`} className="check mt-1" />
              <Thumb src={row.image} />
              <div className="min-w-0 flex-1">
                <Link href={`/admin/createProduct/list/${row._id}`} className="line-clamp-2 text-sm font-medium hover:underline">
                  {row.name || "Без назви"}
                </Link>
                <p className="mt-0.5 truncate text-xs text-neutral-500">{[row.articleNumber && `Арт. ${row.articleNumber}`, row.vendor].filter(Boolean).join(" · ")}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Price row={row} inline />
                  <Stock row={row} />
                </div>
                <div className="mt-2">
                  <CategoryPills row={row} />
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <BulkEditProductsModal
        mode={mode}
        target={target}
        count={count}
        categories={categories}
        sampleNames={sampleNames}
        onClose={() => setMode(null)}
        onDone={done}
      />
    </div>
  )
}

// Hosts next/image may resize (see next.config.js). Any other URL an admin pasted is shown as is.
const OPTIMIZED_HOSTS = /(^|\.)(juventa\.ua|utfs\.io|uploadthing\.com|sveamoda\.com\.ua|nordiva\.com\.ua|rozetka\.com\.ua)$/

/** `size` is in px of the 16px base; the box is set in rem so it scales with the panel (48 → 36px on a desktop). */
export function Thumb({ src, size = 48 }: { src: string | null; size?: number }) {
  let optimizable = false
  try {
    optimizable = Boolean(src) && OPTIMIZED_HOSTS.test(new URL(src!).hostname)
  } catch {
    optimizable = false
  }
  return (
    <span className="relative shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-white" style={{ width: `${size / 16}rem`, height: `${size / 16}rem` }}>
      {/* Fixed width (not `fill`): the srcset then has two entries instead of eleven long URLs. */}
      {src && optimizable ? <Image src={src} alt="" width={size} height={size} className="h-full w-full object-contain" /> : null}
      {src && !optimizable ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" className="h-full w-full object-contain" />
      ) : null}
    </span>
  )
}

function CategoryPills({ row }: { row: ProductRow }) {
  if (row.categories.length === 0) return <Pill tone="problem">Без категорії</Pill>
  const shown = row.categories.slice(0, 2)
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((category) => (
        <Link key={category.id} href={`/admin/categories?id=${category.id}`} className="max-w-full truncate rounded-full border border-neutral-200 px-2 py-0.5 text-xs text-neutral-700 hover:border-black">
          {category.name}
        </Link>
      ))}
      {row.categories.length > shown.length && <span className="px-1 py-0.5 text-xs text-neutral-500">+{row.categories.length - shown.length}</span>}
    </div>
  )
}

function Stock({ row }: { row: ProductRow }) {
  if (row.purchasable) return <Pill tone="ok">{row.quantity} шт.</Pill>
  if (row.isAvailable) return <Pill tone="problem" tip="Товар продається, але на складі нічого немає. Купити його не можна, доки ви не додасте кількість.">Закінчився</Pill>
  return <Pill tone="muted" tip="Товар знято з продажу: його вимкнули ви або файл постачальника.">Вимкнено</Pill>
}

function Price({ row, inline }: { row: ProductRow; inline?: boolean }) {
  const discount = discountPercent(row.price, row.priceToShow)
  return (
    <div className={cn("tabular-nums", inline && "flex items-baseline gap-2")}>
      <p className="font-semibold">{money.format(row.priceToShow)}{inline ? " ₴" : ""}</p>
      {discount > 0 && (
        <p className="text-xs text-neutral-500">
          <span className="line-through">{money.format(row.price)}</span> −{discount}%
        </p>
      )}
    </div>
  )
}
