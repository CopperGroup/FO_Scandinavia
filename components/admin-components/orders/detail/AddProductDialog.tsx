"use client"

import { useEffect, useRef, useState } from "react"
import { Plus, Search } from "lucide-react"
import { adminButton, adminInput } from "@/components/admin/ui"
import { AdminDialog } from "@/components/admin-components/AdminDialog"
import { searchOrderProducts } from "@/lib/admin/order-actions"
import type { ProductHit } from "@/lib/admin/orders"
import { thumbnailUrl } from "@/lib/admin/thumb"
import { money } from "@/lib/storefront/format"

/**
 * Finds products on the server (name, article or product number, 20 results
 * at most) and hands the chosen one back. Nothing is loaded until the
 * manager types.
 */
export function AddProductDialog({
  open,
  onClose,
  onPick,
  inOrder,
}: {
  open: boolean
  onClose: () => void
  onPick: (product: ProductHit) => void
  inOrder: Set<string>
}) {
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<ProductHit[]>([])
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle")
  const requestId = useRef(0)

  useEffect(() => {
    if (!open) {
      setQuery("")
      setHits([])
      setState("idle")
    }
  }, [open])

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) {
      setHits([])
      setState("idle")
      return
    }
    const id = ++requestId.current
    const timer = setTimeout(async () => {
      setState("loading")
      try {
        const found = await searchOrderProducts(term)
        if (id !== requestId.current) return
        setHits(found)
        setState("done")
      } catch {
        if (id === requestId.current) setState("error")
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <AdminDialog open={open} onClose={onClose} title="Додати товар" description="Пошук за назвою, артикулом або номером товару." size="lg">
      <div className="relative">
        <label htmlFor="order-product-search" className="sr-only">
          Пошук товару
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
        <input
          id="order-product-search"
          type="search"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Наприклад, «куртка» або артикул"
          className={`${adminInput} pl-9`}
        />
      </div>

      <div className="mt-4 min-h-[10rem]" aria-live="polite">
        {state === "idle" && <p className="py-6 text-center text-sm text-neutral-500">Введіть щонайменше 2 символи.</p>}
        {state === "loading" && hits.length === 0 && <p className="py-6 text-center text-sm text-neutral-500">Шукаємо…</p>}
        {state === "error" && <p className="py-6 text-center text-sm text-red-700">Не вдалося виконати пошук. Спробуйте ще раз.</p>}
        {state === "done" && hits.length === 0 && <p className="py-6 text-center text-sm text-neutral-500">Нічого не знайдено. Перевірте назву або артикул.</p>}
        {hits.length > 0 && (
          <ul className="divide-y divide-neutral-100">
            {hits.map((hit) => {
              const added = inOrder.has(hit.productId)
              return (
                <li key={hit.productId} className="flex items-center gap-3 py-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={hit.image ? thumbnailUrl(hit.image) : "/placeholder.svg"} alt="" width={44} height={44} loading="lazy" className="h-11 w-11 shrink-0 rounded-md border border-neutral-200 bg-white object-contain" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-neutral-900">{hit.name}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {[hit.articleNumber && `арт. ${hit.articleNumber}`, hit.size && `розмір ${hit.size}`, hit.available ? `на складі ${hit.quantity}` : "немає в наявності"]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{money(hit.price)}</span>
                  <button
                    type="button"
                    onClick={() => onPick(hit)}
                    disabled={added}
                    className={adminButton.secondary}
                    aria-label={added ? `${hit.name}: вже в замовленні` : `Додати ${hit.name}`}
                  >
                    {added ? "Додано" : <Plus className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </AdminDialog>
  )
}
