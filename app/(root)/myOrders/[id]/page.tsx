import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Check } from "lucide-react"
import Breadcrumbs from "@/components/storefront/Breadcrumbs"
import { fetchOrder } from "@/lib/actions/order.actions"
import { money } from "@/lib/storefront/format"
import { DELIVERY_STATUS, DELIVERY_STEPS, PAYMENT_STATUS, TONE_CLASS, formatOrderDate, maskEmail, maskPhone } from "@/lib/storefront/orders"
import { getCurrentUser } from "@/lib/storefront/session"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Замовлення",
  robots: { index: false, follow: false },
}

async function loadOrder(id: string): Promise<any | null> {
  try {
    const order = await fetchOrder({ orderId: id })
    return order ? JSON.parse(JSON.stringify(order)) : null
  } catch {
    return null
  }
}

const Page = async ({ params }: { params: { id: string } }) => {
  const [order, user] = await Promise.all([loadOrder(params.id), getCurrentUser()])
  if (!order) notFound()

  // The link works without signing in (it is in the confirmation e-mail), so a
  // visitor who is not the customer sees the status and the items, not the person.
  const ownerId = String(order.user?._id ?? order.user ?? "")
  const isOwner = Boolean(user && (user.id === ownerId || user.isAdmin))

  const delivery = DELIVERY_STATUS[order.deliveryStatus] ?? DELIVERY_STATUS.Proceeding
  const payment = PAYMENT_STATUS[order.paymentStatus] ?? PAYMENT_STATUS.Pending
  const canceled = order.deliveryStatus === "Canceled"
  const currentStep = Math.max(0, DELIVERY_STEPS.findIndex((step) => step.key === order.deliveryStatus))
  const lines: any[] = (order.products ?? []).filter((line: any) => line?.product)
  const itemsTotal = lines.reduce((sum, line) => sum + (line.product.priceToShow ?? 0) * (line.amount ?? 0), 0)
  const discount = Math.max(0, itemsTotal - (order.value ?? itemsTotal))

  const crumbs = user ? [{ label: "Мої замовлення", href: `/myOrders/user/${user.id}` }, { label: `№${order.id}` }] : [{ label: `Замовлення №${order.id}` }]

  return (
    <div className="shell pt-4 lg:pt-6">
      <Breadcrumbs crumbs={crumbs} />

      <header className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="heading-display text-2xl sm:text-3xl">Замовлення №{order.id}</h1>
          <p className="mt-2 text-sm text-brand-muted">Оформлено {formatOrderDate(order.data)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-2 text-sm font-medium ${TONE_CLASS[delivery.tone]}`}>{delivery.label}</span>
          <span className={`rounded-full px-3 py-2 text-sm font-medium ${TONE_CLASS[payment.tone]}`}>{payment.label}</span>
        </div>
      </header>

      {!canceled && (
        <ol aria-label="Етапи замовлення" className="mt-8 grid grid-cols-3">
          {DELIVERY_STEPS.map((step, index) => {
            const done = index <= currentStep
            return (
              <li key={step.key} aria-current={index === currentStep ? "step" : undefined} className="relative flex flex-col items-center text-center">
                {index > 0 && (
                  <span aria-hidden="true" className={cn("absolute right-1/2 top-[13px] h-0.5 w-full", done ? "bg-brand" : "bg-brand-line")} />
                )}
                <span
                  className={cn(
                    "relative z-[1] flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold",
                    done ? "border-brand bg-brand text-white" : "border-brand-line bg-white text-brand-muted",
                  )}
                >
                  {done ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
                </span>
                <span className={cn("mt-2 text-sm", done ? "font-semibold text-brand-ink" : "text-brand-muted")}>{step.label}</span>
              </li>
            )
          })}
        </ol>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14">
        <section aria-labelledby="order-items">
          <h2 id="order-items" className="heading-display text-lg">
            Товари
          </h2>
          <ul className="mt-3 divide-y divide-brand-line border-y border-brand-line">
            {lines.map((line, index) => (
              <li key={index} className="flex gap-4 py-4">
                <Link
                  href={`/catalog/${line.product._id}`}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="relative h-24 w-[72px] shrink-0 overflow-hidden rounded-sm border border-brand-line bg-white"
                >
                  <Image src={line.product.images?.[0] || "/placeholder.svg"} alt="" fill sizes="78px" className="object-contain" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/catalog/${line.product._id}`} className="line-clamp-2 text-sm font-medium text-brand-ink hover:text-brand focus-visible:outline-none focus-visible:underline">
                    {line.product.name}
                  </Link>
                  {line.product.articleNumber && <p className="mt-1 text-sm text-brand-muted">Артикул {line.product.articleNumber}</p>}
                  <p className="mt-1 text-sm text-brand-muted">
                    {line.amount} × {money(line.product.priceToShow)}
                  </p>
                </div>
                <p className="shrink-0 text-base font-semibold tabular-nums">{money((line.product.priceToShow ?? 0) * (line.amount ?? 0))}</p>
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-6 lg:self-start">
          <div className="rounded-md bg-brand-mist p-5 sm:p-6">
            <h2 className="heading-display text-lg">Разом</h2>
            <dl className="mt-4 space-y-3 text-base">
              <div className="flex justify-between">
                <dt className="text-brand-muted">Товари</dt>
                <dd className="tabular-nums">{money(itemsTotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-brand-muted">Знижка{order.promocode && isOwner ? ` (${order.promocode})` : ""}</dt>
                  <dd className="tabular-nums text-brand-sale">−{money(discount)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-brand-line pt-3">
                <dt className="font-semibold">До сплати</dt>
                <dd className="text-2xl font-semibold tabular-nums">{money(order.value)}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h2 className="heading-display text-lg">Доставка та оплата</h2>
            <dl className="mt-3 divide-y divide-brand-line border-y border-brand-line text-base">
              <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 py-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
                <dt className="text-brand-muted">Спосіб</dt>
                <dd>{order.deliveryMethod}</dd>
              </div>
              <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 py-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
                <dt className="text-brand-muted">Куди</dt>
                <dd>{isOwner ? [order.city, order.warehouse].filter(Boolean).join(", ") : order.city}</dd>
              </div>
              <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 py-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
                <dt className="text-brand-muted">Отримувач</dt>
                <dd>
                  {isOwner ? `${order.name} ${order.surname}` : `${order.name} ${String(order.surname ?? "").slice(0, 1)}.`}
                  <span className="block tabular-nums text-brand-muted">{isOwner ? order.phoneNumber : maskPhone(order.phoneNumber)}</span>
                  <span className="block break-all text-brand-muted">{isOwner ? order.email : maskEmail(order.email)}</span>
                </dd>
              </div>
              <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 py-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
                <dt className="text-brand-muted">Оплата</dt>
                <dd>{order.paymentType}</dd>
              </div>
              {isOwner && order.invoiceString && (
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 py-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
                  <dt className="text-brand-muted">Накладна</dt>
                  <dd className="break-all tabular-nums">{order.invoiceString}</dd>
                </div>
              )}
              {isOwner && order.comment && (
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 py-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
                  <dt className="text-brand-muted">Коментар</dt>
                  <dd className="break-words">{order.comment}</dd>
                </div>
              )}
            </dl>
            {!isOwner && (
              <p className="mt-3 text-sm text-brand-muted">
                Особисті дані приховано.{" "}
                <Link href="/login" className="font-medium text-brand-ink link-quiet">
                  Увійдіть
                </Link>
                , щоб побачити їх повністю.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Page
