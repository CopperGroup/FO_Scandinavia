"use client"

import { Check, ShoppingBag } from "lucide-react"
import { trackFacebookEvent } from "@/helpers/pixel"
import { productAddedToCart } from "@/lib/actions/product.actions"
import { useCart } from "@/lib/storefront/use-cart"
import { cn } from "@/lib/utils"

type Props = {
  id: string
  name: string
  image: string
  price: number
  priceWithoutDiscount: number
  url: string
  /** Size or option the shopper picked; shown on the cart line. */
  variantLabel?: string | null
  /** "full" is the wide button on the product page; the default is the compact card button. */
  variant?: "full"
  /** Shorter labels, for the narrow bar pinned to the bottom of a phone screen. */
  short?: boolean
  className?: string
}

/**
 * Adds the product to the cart and opens the cart panel as confirmation.
 * Once the product is in the cart the button leads to the cart instead of
 * silently removing it.
 */
const AddToCart = ({ id, name, image, price, priceWithoutDiscount, variant, variantLabel, url, short, className }: Props) => {
  const cart = useCart()
  const inCart = cart.ready && cart.has(id)

  async function onClick(event: React.MouseEvent) {
    event.preventDefault()
    event.stopPropagation()

    if (inCart) {
      cart.open()
      return
    }

    cart.add({ id, name, image, price, priceWithoutDiscount, url, variant: variantLabel ?? null })
    cart.open()

    trackFacebookEvent("AddToCart", {
      content_name: name,
      content_ids: id,
      content_type: "product",
      value: priceWithoutDiscount,
      currency: "UAH",
    })

    try {
      await productAddedToCart(id)
    } catch (error) {
      // Statistics only; the cart itself already holds the item.
      console.error("Could not record the add-to-cart event:", error)
    }
  }

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(inCart ? "btn-secondary" : "btn-primary", "h-12 w-full text-base", className)}
      >
        {inCart ? <Check className="h-5 w-5" aria-hidden="true" /> : <ShoppingBag className="h-5 w-5" aria-hidden="true" />}
        {inCart ? (short ? "У кошику" : "У кошику — переглянути") : short ? "У кошик" : "Додати в кошик"}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={inCart ? `${name}: уже в кошику, відкрити кошик` : `Додати в кошик: ${name}`}
      className={cn(
        "inline-flex h-11 w-full items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
        inCart ? "border border-brand-line bg-white text-brand-ink hover:bg-brand-mist" : "bg-brand-sun text-brand-ink hover:bg-brand-sun-dark",
        className,
      )}
    >
      {inCart ? <Check className="h-4 w-4" aria-hidden="true" /> : <ShoppingBag className="h-4 w-4" aria-hidden="true" />}
      {inCart ? "У кошику" : "У кошик"}
    </button>
  )
}

export default AddToCart
