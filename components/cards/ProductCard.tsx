import Link from "next/link"
import { money, plural } from "@/lib/storefront/format"
import type { CardData } from "@/lib/storefront/navigation"
import Photo from "@/components/storefront/Photo"
import { cn } from "@/lib/utils"
import LikeButton from "../interface/LikeButton"
import AddToCart from "../shared/AddToCart"

const MAX_VISIBLE_SIZES = 6

type Props = {
  card: CardData
  /** E-mail of the signed-in shopper; empty for guests. */
  email?: string
  liked?: boolean
  /** Above-the-fold cards load their image eagerly. */
  priority?: boolean
  /** Rails show the bare card; the catalog grid adds the action button. */
  showAction?: boolean
  sizes?: string
  className?: string
}

/**
 * Catalog card: one per item, whatever the number of sizes. The photo and the
 * title open the product; sizes in stock are listed so nobody has to click
 * through to learn theirs is gone.
 */
export default function ProductCard({
  card,
  email = "",
  liked = false,
  priority = false,
  showAction = true,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  className,
}: Props) {
  const href = card.mustChoose ? `/catalog/${card.id}?choose=1` : `/catalog/${card.id}`
  const hasDiscount = card.discountPercent > 0
  const hasRange = card.priceMax > card.priceMin
  const visibleSizes = card.sizes.slice(0, MAX_VISIBLE_SIZES)
  const hiddenSizes = card.sizes.length - visibleSizes.length
  const choiceLabel = card.axisLabel === "Розмір" || !card.axisLabel ? "Обрати розмір" : "Обрати варіант"

  return (
    <article className={cn("group relative flex h-full flex-col", className)}>
      <div className="relative">
        <Link
          href={href}
          prefetch={false}
          tabIndex={-1}
          aria-hidden="true"
          className="relative block aspect-[3/4] overflow-hidden rounded-sm border border-brand-line bg-white transition-colors group-hover:border-brand-ink/40"
        >
          <Photo
            src={card.image || "/placeholder.svg"}
            alt=""
            priority={priority}
            sizes={sizes}
            className={cn("transition-opacity duration-300", card.hoverImage && "lg:group-hover:opacity-0")}
          />
          {card.hoverImage && (
            <Photo
              src={card.hoverImage}
              alt=""
              loading="lazy"
              sizes={sizes}
              frameClassName="hidden opacity-0 transition-opacity duration-300 lg:block lg:group-hover:opacity-100"
            />
          )}
        </Link>

        <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1">
          {hasDiscount && (
            <span className="rounded-sm bg-brand-sale px-2 leading-5 text-xs font-bold tabular-nums text-white">−{card.discountPercent}%</span>
          )}
          {card.isNew && <span className="rounded-sm bg-brand-ink px-2 leading-5 text-xs font-semibold text-white">Новинка</span>}
        </div>

        <LikeButton
          className="absolute right-1 top-1"
          initiallyLiked={liked}
          productId={card.productId}
          productName={card.title}
          value={card.priceToShow}
          email={email}
        />
      </div>

      <div className="flex flex-1 flex-col pt-3">
        {card.vendor && <p className="truncate text-xs text-brand-muted">{card.vendor}</p>}

        <h3 className="mt-1 text-sm text-brand-ink">
          <Link
            href={href}
            prefetch={false}
            className="line-clamp-2 min-h-10 hover:text-brand focus-visible:outline-none focus-visible:underline"
          >
            {card.title}
          </Link>
        </h3>

        <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className={cn("text-base font-semibold tabular-nums", hasDiscount ? "text-brand-sale" : "text-brand-ink")}>
            {hasRange && <span className="font-normal">від </span>}
            {money(hasRange ? card.priceMin : card.priceToShow)}
          </span>
          {hasDiscount && !hasRange && <span className="text-xs text-brand-muted line-through tabular-nums">{money(card.price)}</span>}
        </p>

        {(visibleSizes.length > 1 || card.colorCount > 1) && (
          <div className="mt-2 space-y-1 text-xs text-brand-muted">
            {visibleSizes.length > 1 && (
              <p className="flex flex-wrap gap-x-2 gap-y-1">
                <span className="sr-only">{card.axisLabel ?? "Варіанти"} в наявності: </span>
                {visibleSizes.map((size) => (
                  <span key={size} className="whitespace-nowrap">
                    {size}
                  </span>
                ))}
                {hiddenSizes > 0 && <span>+{hiddenSizes}</span>}
              </p>
            )}
            {card.colorCount > 1 && (
              <p>
                {card.colorCount} {plural(card.colorCount, ["колір", "кольори", "кольорів"])}
              </p>
            )}
          </div>
        )}

        {showAction && (
          <div className="mt-auto pt-3">
            {card.variantCount > 1 ? (
              <Link
                href={href}
                prefetch={false}
                className="inline-flex h-11 w-full items-center justify-center rounded-md border border-brand-ink/80 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-ink hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                {choiceLabel}
              </Link>
            ) : (
              <AddToCart
                id={card.id}
                image={card.image || ""}
                name={card.name}
                price={card.priceToShow}
                priceWithoutDiscount={card.price}
                url={card.url}
              />
            )}
          </div>
        )}
      </div>
    </article>
  )
}
