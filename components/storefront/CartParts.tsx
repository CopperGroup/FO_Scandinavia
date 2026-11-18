"use client"

import Photo from "@/components/storefront/Photo"
import Link from "next/link"
import { Minus, Plus, Trash2 } from "lucide-react"
import { useShopSettings } from "./ShopSettings"
import { money } from "@/lib/storefront/format"
import type { CartLine } from "@/lib/storefront/use-cart"
import { cn } from "@/lib/utils"

/** Plus/minus stepper: no free-text quantity to mistype on a phone. */
export function QuantityStepper({
  value,
  onChange,
  label,
  size = "md",
}: {
  value: number
  onChange: (next: number) => void
  label: string
  size?: "sm" | "md"
}) {
  // Both sizes give the finger 44px; "sm" only narrows the number between the buttons.
  const box = "h-11 w-11"
  return (
    <div role="group" aria-label={`Кількість: ${label}`} className="inline-flex items-center rounded-md ring-1 ring-inset ring-brand-line">
      <button
        type="button"
        aria-label="Зменшити кількість"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
        className={cn(
          box,
          "flex items-center justify-center rounded-l-md text-brand-ink hover:bg-brand-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand disabled:text-brand-line disabled:hover:bg-transparent",
        )}
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <span aria-live="polite" className="min-w-8 text-center text-sm font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label="Збільшити кількість"
        disabled={value >= 99}
        onClick={() => onChange(value + 1)}
        className={cn(
          box,
          "flex items-center justify-center rounded-r-md text-brand-ink hover:bg-brand-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand disabled:text-brand-line",
        )}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

export function CartLineItem({
  line,
  onQuantity,
  onRemove,
  onNavigate,
  compact = false,
}: {
  line: CartLine
  onQuantity: (quantity: number) => void
  onRemove: () => void
  onNavigate?: () => void
  compact?: boolean
}) {
  const hasDiscount = Number(line.priceWithoutDiscount) > Number(line.price)
  const href = `/catalog/${line.id}`

  return (
    <article className="flex gap-4 py-4">
      <Link
        href={href}
        onClick={onNavigate}
        tabIndex={-1}
        aria-hidden="true"
        className={cn("relative shrink-0 overflow-hidden rounded-sm border border-brand-line bg-white", compact ? "h-24 w-[72px]" : "h-32 w-24")}
      >
        <Photo src={line.image || "/placeholder.svg"} alt="" sizes="100px" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Link
              href={href}
              onClick={onNavigate}
              className="line-clamp-2 text-sm font-medium text-brand-ink hover:text-brand focus-visible:outline-none focus-visible:underline"
            >
              {line.name}
            </Link>
            {line.variant && <p className="mt-1 text-sm text-brand-muted">{line.variant}</p>}
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Прибрати з кошика: ${line.name}`}
            className="-mr-3 -mt-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-brand-muted hover:bg-brand-mist hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Trash2 className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2 pt-3">
          <QuantityStepper value={line.quantity} onChange={onQuantity} label={line.name} size="sm" />
          <div className="ml-auto text-right">
            {hasDiscount && (
              <p className="text-xs text-brand-muted line-through tabular-nums">{money(line.priceWithoutDiscount * line.quantity)}</p>
            )}
            <p className={cn("text-base font-semibold tabular-nums", hasDiscount && "text-brand-sale")}>{money(line.price * line.quantity)}</p>
          </div>
        </div>
      </div>
    </article>
  )
}

/** How far the cart is from free delivery. */
export function FreeDeliveryMeter({ amount, className }: { amount: number; className?: string }) {
  const threshold = useShopSettings().freeDelivery
  if (threshold <= 0) return null

  const remaining = Math.max(0, threshold - amount)
  const progress = Math.min(100, (amount / threshold) * 100)

  return (
    <div className={className}>
      <p className="text-sm text-brand-ink">
        {remaining > 0 ? (
          <>
            До безкоштовної доставки ще <span className="font-semibold tabular-nums">{money(remaining)}</span>
          </>
        ) : (
          <span className="font-semibold text-brand-ok">Доставка цього замовлення безкоштовна</span>
        )}
      </p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={threshold}
        aria-valuenow={Math.min(amount, threshold)}
        aria-label="Прогрес до безкоштовної доставки"
        className="mt-2 h-2 overflow-hidden rounded-full bg-brand-line"
      >
        <div className={cn("h-full rounded-full transition-[width] duration-300", remaining > 0 ? "bg-brand" : "bg-brand-ok")} style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}
