"use client"

import Link from "next/link"
import { ShoppingBag } from "lucide-react"
import Breadcrumbs from "@/components/storefront/Breadcrumbs"
import { CartLineItem, FreeDeliveryMeter } from "@/components/storefront/CartParts"
import { trackFacebookEvent } from "@/helpers/pixel"
import { countLabel, money, PRODUCT_FORMS } from "@/lib/storefront/format"
import { useCart } from "@/lib/storefront/use-cart"

export default function CartPage() {
  const cart = useCart()

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
    <div className="shell pt-4 lg:pt-6">
      <Breadcrumbs crumbs={[{ label: "Кошик" }]} />
      <h1 className="heading-display mt-3 text-2xl sm:text-3xl">Кошик</h1>

      {!cart.ready ? (
        <p className="mt-8 text-brand-muted" aria-live="polite">
          Завантажуємо кошик…
        </p>
      ) : isEmpty ? (
        <div className="mt-8 rounded-md bg-brand-mist px-6 py-16 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-brand-muted/50" aria-hidden="true" />
          <h2 className="heading-display mt-4 text-xl">У кошику поки порожньо</h2>
          <p className="mx-auto mt-2 max-w-sm text-base text-brand-muted">Додайте товар із каталогу, і він з’явиться тут.</p>
          <Link href="/catalog" className="btn-blue mt-6">
            Перейти до каталогу
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14">
          <section aria-label="Товари в кошику">
            <p className="border-b border-brand-line pb-3 text-sm text-brand-muted">{countLabel(cart.units, PRODUCT_FORMS)}</p>
            <ul className="divide-y divide-brand-line">
              {cart.lines.map((line) => (
                <li key={line.id}>
                  <CartLineItem line={line} onQuantity={(quantity) => cart.setQuantity(line.id, quantity)} onRemove={() => cart.remove(line.id)} />
                </li>
              ))}
            </ul>
            <Link href="/catalog" className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:text-brand-deep focus-visible:outline-none focus-visible:underline">
              Продовжити покупки
            </Link>
          </section>

          <aside aria-label="Підсумок замовлення" className="lg:sticky lg:top-[calc(var(--sticky-top)+24px)] lg:self-start lg:transition-[top] lg:duration-200">
            <div className="rounded-md bg-brand-mist p-5 sm:p-6">
              <h2 className="heading-display text-lg">Разом</h2>
              <dl className="mt-4 space-y-3 text-base">
                <div className="flex justify-between">
                  <dt className="text-brand-muted">Товари</dt>
                  <dd className="tabular-nums">{money(cart.regular)}</dd>
                </div>
                {cart.saved > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-brand-muted">Знижка</dt>
                    <dd className="tabular-nums text-brand-sale">−{money(cart.saved)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-brand-muted">Доставка</dt>
                  <dd>за тарифами перевізника</dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-brand-line pt-3">
                  <dt className="font-semibold">До сплати</dt>
                  <dd className="text-2xl font-semibold tabular-nums">{money(cart.total)}</dd>
                </div>
              </dl>

              <FreeDeliveryMeter amount={cart.total} className="mt-5" />

              <Link href="/order" onClick={trackCheckout} className="btn-primary mt-5 w-full">
                Оформити замовлення
              </Link>
              <p className="mt-3 text-center text-sm text-brand-muted">Реєстрація не потрібна</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
