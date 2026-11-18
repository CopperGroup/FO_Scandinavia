"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { Plus, Search, X } from "lucide-react"
import Select from "@/components/admin/Select"
import { EmptyState, Pill, adminButton, adminButtonSm, adminInput, adminTable } from "@/components/admin/ui"
import { Thumb } from "@/components/admin-components/ProductsTable"
import {
  addProductsToCategory,
  moveSelectedProducts,
  removeProductsFromCategory,
  searchProductsForCategory,
  undoProductMove,
  type CategoryActionResult,
  type ProductSearchHit,
} from "@/lib/actions/categories.actions"
import { discountPercent, productsWord } from "@/lib/admin/catalog-shared"
import { cn } from "@/lib/utils"

type Row = {
  _id: string
  name: string
  articleNumber: string
  image: string | null
  price: number
  priceToShow: number
  quantity: number
  purchasable: boolean
}

type Option = { id: string; name: string; path?: string }

type Result = CategoryActionResult
type Status = { tone: "ok" | "error"; text: string; undo?: () => void } | null

const money = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 })

/** Toolbar and the first/last cells share this inset, so the panel has one left edge. */
const inset = "px-4 sm:px-4"

/**
 * Products of one category (or the products without any category) as one
 * panel: a toolbar (search, position, «+ Додати товари») that turns into a
 * selection bar when rows are ticked, the table, and the pagination.
 * `search` and `pagination` are rendered by the server page (URL-driven).
 */
export default function CategoryProductsPane({
  mode,
  categoryId,
  categoryName,
  rows,
  targets,
  search,
  position,
  pagination,
  query,
}: {
  mode: "category" | "uncategorized"
  categoryId?: string
  categoryName?: string
  rows: Row[]
  targets: Option[]
  search: React.ReactNode
  /** "1–25 з 83", shown in the toolbar so the admin knows where they are without scrolling. */
  position?: string
  pagination?: React.ReactNode
  query: string
}) {
  const router = useRouter()
  const [refreshing, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState("")
  const [status, setStatus] = useState<Status>(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => setSelected(new Set()), [rows])

  const allOnPage = rows.length > 0 && rows.every((row) => selected.has(row._id))
  const someOnPage = !allOnPage && rows.some((row) => selected.has(row._id))
  const ids = Array.from(selected)

  /** Runs an action on the ticked rows; a successful one can come with a way back. */
  const run = async (key: string, action: () => Promise<{ ok: true; message: string; undo?: () => Promise<Result> } | { ok: false; error: string }>) => {
    setBusy(key)
    setStatus(null)
    try {
      const result = await action()
      if (result.ok) {
        const undo = result.undo
        setStatus({ tone: "ok", text: result.message, undo: undo ? () => void run("undo", undo) : undefined })
        setSelected(new Set())
        startTransition(() => router.refresh())
      } else setStatus({ tone: "error", text: result.error })
    } catch {
      setStatus({ tone: "error", text: "Не вдалося виконати дію. Перевірте з’єднання і спробуйте ще раз." })
    } finally {
      setBusy("")
    }
  }

  const moveTo = (target: string) =>
    void run("move", async () => {
      const sourceId = mode === "category" ? categoryId! : null
      const result = await moveSelectedProducts({ sourceId, targetId: target, productIds: ids })
      if (!result.ok) return result
      return {
        ok: true,
        message: result.message,
        undo: () => undoProductMove({ sourceId, targetId: target, moved: result.moved, addedToTarget: result.addedToTarget }),
      }
    })

  const removeFromCategory = () =>
    void run("remove", async () => {
      const removed = ids
      const result = await removeProductsFromCategory(categoryId!, removed)
      if (!result.ok) return result
      return {
        ok: true,
        message: result.message,
        undo: async () => {
          const back = await addProductsToCategory(categoryId!, removed)
          return back.ok ? { ok: true, message: "Скасовано: товари знову в категорії." } : back
        },
      }
    })

  const targetOptions = targets
    .filter((option) => option.id !== categoryId)
    .map((option) => ({ value: option.id, label: option.name, hint: option.path || undefined }))

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const selecting = selected.size > 0

  return (
    <section className="rounded-lg border border-neutral-200 bg-white" aria-busy={refreshing || undefined}>
      {/* One bar, two states: browse (search, add) or act on the ticked rows. Same height in both. */}
      <div className={cn(inset, "flex min-h-[4rem] flex-wrap items-center gap-x-3 gap-y-2 border-b border-neutral-200 py-3", selecting && "bg-neutral-50")}>
        {selecting ? (
          <>
            <p className="order-1 text-sm font-medium tabular-nums" role="status" aria-label={`Вибрано ${selected.size} ${productsWord(selected.size)}`}>
              {busy === "move" ? "Переносимо…" : busy === "remove" ? "Прибираємо…" : `Вибрано ${selected.size}`}
            </p>
            {/* Phones: count and «Скасувати» on the first line, the actions on the second. */}
            <button type="button" className={cn(adminButton.ghost, "order-2 ml-auto px-3 sm:order-4")} onClick={() => setSelected(new Set())} disabled={busy !== ""}>
              Скасувати
            </button>
            <span className="order-3 basis-full sm:hidden" aria-hidden="true" />
            <div className="order-4 min-w-0 flex-1 sm:order-2 sm:w-56 sm:flex-none">
              <Select
                value=""
                onChange={moveTo}
                disabled={busy !== ""}
                searchable
                placeholder={mode === "category" ? "Перенести в…" : "Призначити категорію…"}
                searchPlaceholder="Знайти категорію"
                options={targetOptions}
                aria-label={mode === "category" ? "Перенести вибрані товари в категорію" : "Призначити вибраним товарам категорію"}
              />
            </div>
            {mode === "category" && (
              <button type="button" className={cn(adminButton.danger, "order-5 sm:order-3")} disabled={busy !== ""} onClick={removeFromCategory}>
                <span className="sm:hidden">Прибрати</span>
                <span className="hidden sm:inline">Прибрати з категорії</span>
              </button>
            )}
          </>
        ) : (
          <>
            {search}
            <div className="ml-auto flex items-center gap-3">
              {position && <p className="hidden text-sm tabular-nums text-neutral-500 sm:block">{position}</p>}
              {mode === "category" && (
                <button type="button" className={adminButton.secondary} aria-expanded={adding} onClick={() => setAdding((value) => !value)}>
                  {adding ? <X className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                  {adding ? "Закрити пошук" : "Додати товари"}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {adding && mode === "category" && categoryId && (
        <AddProducts
          categoryId={categoryId}
          categoryName={categoryName ?? ""}
          onClose={() => setAdding(false)}
          onAdded={(text) => {
            setStatus({ tone: "ok", text })
            startTransition(() => router.refresh())
          }}
        />
      )}

      {status && (
        <div
          role={status.tone === "error" ? "alert" : "status"}
          className={cn(inset, "flex items-center gap-3 border-b py-2.5 text-sm", status.tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-neutral-200 text-neutral-700")}
        >
          <p className="min-w-0 flex-1">{status.text}</p>
          {status.undo && (
            <button
              type="button"
              disabled={busy !== ""}
              onClick={status.undo}
              className="shrink-0 rounded-md px-2 py-1 font-medium text-black underline underline-offset-2 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50"
            >
              Скасувати
            </button>
          )}
          <button type="button" onClick={() => setStatus(null)} aria-label="Закрити повідомлення" className={adminButtonSm.icon}>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="p-4 sm:p-4">
          <EmptyState
            title={query ? "Нічого не знайдено" : mode === "category" ? "У категорії ще немає товарів" : "Усі товари мають категорію"}
            text={
              query
                ? `Серед цих товарів немає «${query}». Спробуйте інший запит.`
                : mode === "category"
                  ? `Знайдіть товари за назвою чи артикулом і додайте їх до «${categoryName}».`
                  : "Тут з’являться товари, у яких немає жодної категорії."
            }
            action={
              !query && mode === "category" && !adding ? (
                <button type="button" className={adminButton.secondary} onClick={() => setAdding(true)}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Додати товари
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className={adminTable.wrap}>
          {/* Fixed layout: the product column takes what is left, so long names and article numbers never push the price out. */}
          <table className={cn(adminTable.table, "table-fixed")}>
            <thead>
              <tr className={adminTable.headRow}>
                <th scope="col" className="w-12 py-3 pl-4 pr-2 sm:pl-4">
                  <input
                    type="checkbox"
                    checked={allOnPage}
                    ref={(element) => {
                      if (element) element.indeterminate = someOnPage
                    }}
                    onChange={() => setSelected(allOnPage ? new Set() : new Set(rows.map((row) => row._id)))}
                    aria-label={allOnPage ? "Зняти вибір з усіх на сторінці" : "Вибрати всі на сторінці"}
                    className="check"
                  />
                </th>
                <th scope="col" className={adminTable.th}>
                  Товар
                </th>
                <th scope="col" className={cn(adminTable.th, "hidden w-28 sm:table-cell")}>
                  Склад
                </th>
                <th scope="col" className={cn(adminTable.th, "w-20 pr-4 text-right sm:w-28 sm:pr-4")}>
                  Ціна, ₴
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const discount = discountPercent(row.price, row.priceToShow)
                const isSelected = selected.has(row._id)
                return (
                  <tr key={row._id} className={cn(adminTable.row, "h-14", isSelected && "bg-neutral-50")}>
                    <td className="py-2 pl-4 pr-2 sm:pl-4">
                      <input type="checkbox" checked={isSelected} onChange={() => toggle(row._id)} aria-label={`Вибрати «${row.name}»`} className="check" />
                    </td>
                    <td className="py-2 pr-3 sm:pr-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <Thumb src={row.image} size={40} />
                        <div className="min-w-0">
                          <Link href={`/admin/createProduct/list/${row._id}`} className="line-clamp-2 font-medium [overflow-wrap:anywhere] hover:underline sm:line-clamp-1" data-tip={row.name}>
                            {row.name || "Без назви"}
                          </Link>
                          <p className="truncate text-xs text-neutral-500">
                            {row.articleNumber ? `Арт. ${row.articleNumber}` : "Без артикула"}
                            <span className="sm:hidden"> · {row.purchasable ? `${row.quantity} шт.` : "немає"}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden py-2 pr-4 sm:table-cell">{row.purchasable ? <Pill tone="ok">{row.quantity} шт.</Pill> : <Pill tone="muted">Немає</Pill>}</td>
                    <td className="py-2 pr-4 text-right tabular-nums sm:pr-4">
                      <p className="font-semibold">{money.format(row.priceToShow)}</p>
                      {discount > 0 && (
                        <p className="text-xs text-neutral-500">
                          <s>{money.format(row.price)}</s> −{discount}%
                        </p>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagination && <div className={cn(inset, "border-t border-neutral-200 py-3")}>{pagination}</div>}
    </section>
  )
}

/** Inline search that finds products by name, article number or code and adds them to the category. */
function AddProducts({
  categoryId,
  categoryName,
  onAdded,
  onClose,
}: {
  categoryId: string
  categoryName: string
  onAdded: (message: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<ProductSearchHit[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState("")
  const [error, setError] = useState("")
  const latest = useRef(0)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => input.current?.focus(), [])

  useEffect(() => {
    const text = query.trim()
    setError("")
    if (text.length < 2) {
      setHits(null)
      setLoading(false)
      return
    }
    const ticket = ++latest.current
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const result = await searchProductsForCategory(text, categoryId)
        if (ticket === latest.current) setHits(result)
      } catch {
        if (ticket === latest.current) setError("Пошук не вдався. Спробуйте ще раз.")
      } finally {
        if (ticket === latest.current) setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, categoryId])

  const add = async (hit: ProductSearchHit) => {
    setAdding(hit._id)
    setError("")
    try {
      const result = await addProductsToCategory(categoryId, [hit._id])
      if (!result.ok) return setError(result.error)
      setHits((current) => current?.map((item) => (item._id === hit._id ? { ...item, inCategory: true } : item)) ?? null)
      onAdded(`«${hit.name}» додано до «${categoryName}».`)
    } catch {
      setError("Не вдалося додати товар. Спробуйте ще раз.")
    } finally {
      setAdding("")
    }
  }

  return (
    <div className={cn(inset, "border-b border-neutral-200 bg-neutral-50 py-3")}>
      <div className="relative">
        <label htmlFor="add-products-search" className="sr-only">
          Знайти товар, щоб додати до категорії
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
        <input
          ref={input}
          id="add-products-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault()
              onClose()
            }
          }}
          placeholder="Назва, артикул або код товару"
          className={cn(adminInput, "pl-9")}
          autoComplete="off"
        />
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : !hits ? (
        <p className="mt-2 text-xs text-neutral-500">{loading ? "Шукаємо…" : "Введіть щонайменше дві літери. Товар залишиться і в своїх інших категоріях."}</p>
      ) : (
        <ul className="mt-2 max-h-72 divide-y divide-neutral-100 overflow-y-auto overscroll-contain rounded-md border border-neutral-200 bg-white" aria-busy={loading}>
          {hits.length === 0 ? (
            <li className="px-3 py-3 text-sm text-neutral-500">{loading ? "Шукаємо…" : "Нічого не знайдено."}</li>
          ) : (
            hits.map((hit) => (
              <li key={hit._id} className="flex h-14 items-center gap-3 px-3">
                <Thumb src={hit.image} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{hit.name}</p>
                  {hit.articleNumber && <p className="truncate text-xs text-neutral-500">Арт. {hit.articleNumber}</p>}
                </div>
                {hit.inCategory ? (
                  <span className="text-xs text-neutral-500">Уже в категорії</span>
                ) : (
                  <button type="button" className={adminButtonSm.secondary} onClick={() => void add(hit)} disabled={adding !== ""} aria-label={`Додати «${hit.name}»`}>
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {adding === hit._id ? "Додаємо…" : "Додати"}
                  </button>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
