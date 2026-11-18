"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShoppingBag } from "lucide-react"
import { trackFacebookEvent } from "@/helpers/pixel"
import { money, plural } from "@/lib/storefront/format"
import { useCart } from "@/lib/storefront/use-cart"
import { CartLineItem, FreeDeliveryMeter } from "./CartParts"
import Drawer from "./Drawer"

/**
 * Cart panel. Opens from the header, the tab bar, and right after something
 * is added, so the shopper sees the confirmation and the way to checkout.
 */
export default function CartDrawer() {
  const cart = useCart()
  const pathname = usePathname()

  useEffect(() => {
    cart.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const trackCheckout = () => {
    trackFacebookEvent("InitiateCheckout", {
      content_name: "Cart Checkout",
      content_ids: cart.lines.map((line) => line.id),
      value: cart.total,
      currency: "UAH",
      num_items: cart.lines.length,
    })
  }

  const isEmpty = cart.lines.length === 0

  return (
    <Drawer
      open={cart.isOpen}
      onOpenChange={cart.setOpen}
      title={isEmpty ? "Кошик" : `Кошик: ${cart.units} ${plural(cart.units, ["товар", "товари", "товарів"])}`}
      description="Товари у вашому кошику"
      footer={
        isEmpty ? null : (
          <div className="space-y-4 px-4 py-4">
            <FreeDeliveryMeter amount={cart.total} />
            <dl className="space-y-2 text-sm">
              {cart.saved > 0 && (
                <div className="flex justify-between text-brand-muted">
                  <dt>Знижка</dt>
                  <dd className="tabular-nums">−{money(cart.saved)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between">
                <dt className="text-base font-semibold">Разом</dt>
                <dd className="text-xl font-semibold tabular-nums">{money(cart.total)}</dd>
              </div>
            </dl>
            <div className="grid gap-2">
              <Link href="/order" onClick={trackCheckout} className="btn-primary w-full">
                Оформити замовлення
              </Link>
              <Link href="/cart" className="btn-secondary h-11 w-full">
                Переглянути кошик
              </Link>
            </div>
          </div>
        )
      }
    >
      {isEmpty ? (
        <div className="flex h-full flex-col items-center justify-center px-8 py-16 text-center">
          <ShoppingBag className="h-10 w-10 text-brand-line" aria-hidden="true" />
          <p className="mt-4 font-display text-lg font-semibold tracking-[-0.02em]">У кошику поки порожньо</p>
          <p className="mt-2 max-w-xs text-sm text-brand-muted">Додайте товар із каталогу, і він з’явиться тут.</p>
          <Link href="/catalog" className="btn-blue mt-6">
            Перейти до каталогу
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-brand-line px-4">
          {cart.lines.map((line) => (
            <li key={line.id}>
              <CartLineItem
                compact
                line={line}
                onQuantity={(quantity) => cart.setQuantity(line.id, quantity)}
                onRemove={() => cart.remove(line.id)}
                onNavigate={cart.close}
              />
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  )
}
