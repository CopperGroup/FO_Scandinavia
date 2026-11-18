import { ImageOff } from "lucide-react"
import { cn } from "@/lib/utils"

const uah = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 2 })
export const formatUah = (value: number) => `${uah.format(value)} ₴`

/**
 * The product as a catalog card, drawn from what is in the form right now:
 * main photo, discount tag, supplier, name, price with the old price struck
 * through, and stock. Mirrors components/cards/ProductCard at a smaller size.
 */
export function ProductPreview({
  image,
  name,
  vendor,
  price,
  priceToShow,
  discount,
  quantity,
  sellable,
}: {
  image: string | null
  name: string
  vendor: string
  /** NaN when the field is not a number yet. */
  price: number
  priceToShow: number
  discount: number
  quantity: number
  /** «Продається в магазині» is on. */
  sellable: boolean
}) {
  const hasPrice = Number.isFinite(priceToShow) && priceToShow > 0
  const inStock = sellable && quantity > 0

  return (
    <div className="mx-auto w-full max-w-[9.75rem]">
      <div className="relative aspect-[3/4] overflow-hidden rounded-sm border border-brand-line bg-white">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-neutral-50 text-xs text-neutral-400">
            <ImageOff className="h-5 w-5" aria-hidden="true" />
            Немає фото
          </div>
        )}
        {discount > 0 && <span className="absolute left-2 top-2 rounded-sm bg-brand-sale px-1.5 py-0.5 text-xs font-bold tabular-nums text-white">−{discount}%</span>}
      </div>
      <div className="pt-2">
        {vendor && <p className="truncate text-xs text-brand-muted">{vendor}</p>}
        <p className={cn("mt-0.5 line-clamp-2 text-sm ", name ? "text-brand-ink" : "text-neutral-400")}>{name || "Назва товару"}</p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 ">
          <span className={cn("text-base font-semibold tabular-nums", !hasPrice ? "text-neutral-400" : discount > 0 ? "text-brand-sale" : "text-brand-ink")}>
            {hasPrice ? formatUah(priceToShow) : "— ₴"}
          </span>
          {discount > 0 && Number.isFinite(price) && <span className="text-xs tabular-nums text-brand-muted line-through">{formatUah(price)}</span>}
        </p>
        <p className={cn("mt-1 text-xs", inStock ? "text-brand-ok" : "text-neutral-500")}>{inStock ? `В наявності: ${quantity} шт.` : "Немає в наявності"}</p>
      </div>
    </div>
  )
}
