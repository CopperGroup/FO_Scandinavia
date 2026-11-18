"use client"

import { useRouter } from "next/navigation"
import AddToCart from "@/components/shared/AddToCart"
import { trackFacebookEvent } from "@/helpers/pixel"
import { productAddedToCart } from "@/lib/actions/product.actions"
import { useCart } from "@/lib/storefront/use-cart"

type Props = {
  id: string
  name: string
  image: string
  price: number
  priceWithoutDiscount: number
  url: string
  variantLabel: string | null
  /** A size still has to be chosen; `axisKey` is the selector to point at. */
  pending: boolean
  axisKey: string | null
  axisPrompt: string
  priceText: string
}

function pointAtSelector(axisKey: string | null) {
  const selector = document.getElementById(`variant-${axisKey ?? "size"}`)
  if (!selector) return
  selector.scrollIntoView({ behavior: "smooth", block: "center" })
  selector.setAttribute("data-attention", "true")
  window.setTimeout(() => selector.removeAttribute("data-attention"), 1800)
  selector.querySelector<HTMLElement>("a")?.focus({ preventScroll: true })
}

/**
 * Buy buttons of the product page, plus the bar pinned to the bottom of a
 * phone screen so the main action is always within reach of the thumb.
 */
export default function BuyActions({ id, name, image, price, priceWithoutDiscount, url, variantLabel, pending, axisKey, axisPrompt, priceText }: Props) {
  const cart = useCart()
  const router = useRouter()

  async function buyNow() {
    if (!cart.has(id)) {
      cart.add({ id, name, image, price, priceWithoutDiscount, url, variant: variantLabel })
      trackFacebookEvent("AddToCart", { content_name: name, content_ids: id, content_type: "product", value: priceWithoutDiscount, currency: "UAH" })
      productAddedToCart(id).catch(() => undefined)
    }
    trackFacebookEvent("InitiateCheckout", {
      content_name: "Buy now",
      content_ids: [id],
      value: price,
      currency: "UAH",
      num_items: 1,
    })
    router.push("/order")
  }

  const cartProps = { id, name, image, price, priceWithoutDiscount, url, variantLabel }

  return (
    <>
      <div className="space-y-3">
        {pending ? (
          <button type="button" onClick={() => pointAtSelector(axisKey)} className="btn-primary h-12 w-full text-base">
            {axisPrompt}
          </button>
        ) : (
          <>
            <AddToCart {...cartProps} variant="full" />
            <button type="button" onClick={buyNow} className="btn-secondary h-12 w-full text-base">
              Купити зараз
            </button>
          </>
        )}
      </div>

      <div data-bottom-bar="buy" className="fixed inset-x-0 bottom-0 z-40 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="box-border flex h-16 items-center gap-3 border-t border-brand-line px-4">
          <div className="min-w-0">
            <p className="text-lg font-semibold tabular-nums text-brand-ink">{priceText}</p>
            {variantLabel && !pending && <p className="truncate text-xs text-brand-muted">{variantLabel}</p>}
          </div>
          <div className="ml-auto w-[58%] max-w-[260px]">
            {pending ? (
              <button type="button" onClick={() => pointAtSelector(axisKey)} className="btn-primary h-12 w-full px-3">
                {axisPrompt}
              </button>
            ) : (
              <AddToCart {...cartProps} variant="full" short className="h-12 px-3 text-base" />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
