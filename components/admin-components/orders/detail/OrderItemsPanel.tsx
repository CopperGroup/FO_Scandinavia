"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Minus, Plus, Trash2 } from "lucide-react"
import toast from "react-hot-toast"
import { Panel, adminButton } from "@/components/admin/ui"
import type { OrderDetail, OrderLine, ProductHit } from "@/lib/admin/orders"
import { thumbnailUrl } from "@/lib/admin/thumb"
import { money } from "@/lib/storefront/format"
import { AddProductDialog } from "./AddProductDialog"
import { saveOrder } from "./save"

const MAX_AMOUNT = 99

function Thumb({ src }: { src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src ? thumbnailUrl(src, 160) : "/placeholder.svg"} alt="" width={56} height={72} loading="lazy" className="h-[4.5rem] w-14 shrink-0 rounded-md border border-neutral-200 bg-white object-contain" />
  )
}

/** Line items with totals. "Змінити товари" turns the list into an editor; nothing is saved until "Зберегти". */
export function OrderItemsPanel({ order }: { order: OrderDetail }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [lines, setLines] = useState<OrderLine[]>(order.lines)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  const shown = editing ? lines : order.lines
  const units = shown.reduce((sum, line) => sum + line.amount, 0)
  const subtotal = shown.reduce((sum, line) => sum + line.price * line.amount, 0)
  const discountAmount = order.discount ? Math.round(subtotal * (order.discount / 100)) : 0
  // While editing, the total is an estimate from current prices; the server recalculates it on save.
  const total = editing ? subtotal - discountAmount : order.value
  const inOrder = useMemo(() => new Set(lines.map((line) => line.productId)), [lines])

  const setAmount = (index: number, amount: number) =>
    setLines((current) => current.map((line, i) => (i === index ? { ...line, amount: Math.min(MAX_AMOUNT, Math.max(1, amount || 1)) } : line)))

  const remove = (index: number) => setLines((current) => current.filter((_, i) => i !== index))

  const add = (hit: ProductHit) => {
    setLines((current) => [
      ...current,
      { productId: hit.productId, code: hit.code, name: hit.name, image: hit.image, articleNumber: hit.articleNumber, size: hit.size, price: hit.price, amount: 1, exists: true },
    ])
    toast.success("Товар додано. Збережіть зміни, щоб оновити замовлення.")
  }

  const cancel = () => {
    setLines(order.lines)
    setEditing(false)
    setError("")
  }

  const save = () => {
    if (lines.length === 0) {
      setError("У замовленні має лишитися хоча б один товар. Щоб відмовитися від замовлення, змініть його стан на «Скасовано».")
      return
    }
    setError("")
    startTransition(async () => {
      const result = await saveOrder(order, { lines: lines.map((line) => ({ productId: line.productId, amount: line.amount })) })
      if (!result.ok) {
        setError(result.error)
        return
      }
      toast.success(`Товари збережено. Сума: ${money(result.value)}`)
      setEditing(false)
      router.refresh()
    })
  }

  return (
    <Panel
      title="Товари"
      description={`${shown.length} позиц., ${units} шт.`}
      padded={false}
      action={
        editing ? (
          <button type="button" onClick={() => setAdding(true)} className={adminButton.secondary}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Додати товар
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setLines(order.lines)
              setEditing(true)
            }}
            className={adminButton.secondary}
          >
            Змінити товари
          </button>
        )
      }
    >
      <ul className="divide-y divide-neutral-100">
        {shown.map((line, index) => (
          <li key={`${line.productId}-${index}`} className="flex gap-4 px-4 py-3">
            <Thumb src={line.image} />
            <div className="min-w-0 flex-1">
              {line.exists ? (
                <Link href={`/admin/createProduct/list/${line.productId}`} className="line-clamp-2 text-sm font-medium text-neutral-900 hover:underline focus-visible:underline focus-visible:outline-none">
                  {line.name}
                </Link>
              ) : (
                <p className="text-sm font-medium text-red-700">{line.name}</p>
              )}
              <p className="mt-1 text-xs text-neutral-500">
                {[line.articleNumber && `Артикул ${line.articleNumber}`, line.size && `Розмір ${line.size}`, line.code && `ID ${line.code}`].filter(Boolean).join(" · ")}
              </p>

              {editing ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center rounded-md border border-neutral-300">
                    <button type="button" onClick={() => setAmount(index, line.amount - 1)} disabled={pending || line.amount <= 1} className={adminButton.icon} aria-label={`Менше: ${line.name}`}>
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={MAX_AMOUNT}
                      value={line.amount}
                      onChange={(event) => setAmount(index, Number.parseInt(event.target.value, 10))}
                      disabled={pending}
                      aria-label={`Кількість: ${line.name}`}
                      className="h-9 w-12 border-0 bg-transparent text-center text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-black/10"
                    />
                    <button type="button" onClick={() => setAmount(index, line.amount + 1)} disabled={pending || line.amount >= MAX_AMOUNT} className={adminButton.icon} aria-label={`Більше: ${line.name}`}>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <button type="button" onClick={() => remove(index)} disabled={pending} className={`${adminButton.ghost} text-red-700 hover:text-red-800`}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Прибрати
                  </button>
                </div>
              ) : (
                <p className="mt-1 text-sm tabular-nums text-neutral-600">
                  {line.amount} × {money(line.price)}
                </p>
              )}
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums">{money(line.price * line.amount)}</p>
          </li>
        ))}
        {shown.length === 0 && <li className="px-4 py-6 text-center text-sm text-neutral-500">Немає товарів. Додайте хоча б один.</li>}
      </ul>

      <dl className="space-y-2 border-t border-neutral-200 px-4 py-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-neutral-500">Товари за поточними цінами</dt>
          <dd className="tabular-nums">{money(subtotal)}</dd>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">
              Знижка {order.discount}%{order.promocode ? ` (${order.promocode})` : ""}
            </dt>
            <dd className="tabular-nums">−{money(discountAmount)}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-4 border-t border-neutral-100 pt-2">
          <dt className="font-semibold">{editing ? "До сплати після збереження" : "До сплати"}</dt>
          <dd className="text-base font-semibold tabular-nums">{money(total)}</dd>
        </div>
        {!editing && Math.abs(subtotal - discountAmount - order.value) > 1 && (
          <p className="text-xs text-neutral-500">Сума замовлення розрахована за цінами на момент оформлення.</p>
        )}
      </dl>

      {editing && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-neutral-200 px-4 py-3">
          {error && (
            <p role="alert" className="mr-auto text-sm text-red-700">
              {error}
            </p>
          )}
          <button type="button" onClick={cancel} disabled={pending} className={adminButton.secondary}>
            Скасувати
          </button>
          <button type="button" onClick={save} disabled={pending} className={adminButton.primary}>
            {pending ? "Зберігаємо…" : "Зберегти товари"}
          </button>
        </div>
      )}

      <AddProductDialog open={adding} onClose={() => setAdding(false)} onPick={add} inOrder={inOrder} />
    </Panel>
  )
}
