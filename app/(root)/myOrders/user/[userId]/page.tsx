import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRight } from "lucide-react"
import Breadcrumbs from "@/components/storefront/Breadcrumbs"
import { fetchUsersOrders } from "@/lib/actions/order.actions"
import { countLabel, money, PRODUCT_FORMS } from "@/lib/storefront/format"
import { DELIVERY_STATUS, PAYMENT_STATUS, TONE_CLASS, formatOrderDate } from "@/lib/storefront/orders"
import { getCurrentUser } from "@/lib/storefront/session"

export const metadata: Metadata = {
  title: "Мої замовлення",
  robots: { index: false, follow: false },
}

const MyOrders = async ({ params }: { params: { userId: string } }) => {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  // Orders are personal: the address must be the signed-in customer's own (staff may open any).
  if (user.id !== params.userId && !user.isAdmin) redirect(`/myOrders/user/${user.id}`)

  const orders: any[] = JSON.parse(JSON.stringify(await fetchUsersOrders({ userId: params.userId })))

  return (
    <div className="shell pt-4 lg:pt-6">
      <Breadcrumbs crumbs={[{ label: "Мої замовлення" }]} />
      <h1 className="heading-display mt-3 text-2xl sm:text-3xl">Мої замовлення</h1>

      {orders.length === 0 ? (
        <div className="mt-8 rounded-md bg-brand-mist px-6 py-16 text-center">
          <h2 className="heading-display text-xl">Замовлень ще немає</h2>
          <p className="mx-auto mt-2 max-w-sm text-base text-brand-muted">Коли ви щось замовите, тут з’явиться статус і деталі доставки.</p>
          <Link href="/catalog" className="btn-blue mt-6">
            Перейти до каталогу
          </Link>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-brand-line border-y border-brand-line">
          {orders.map((order) => {
            const delivery = DELIVERY_STATUS[order.deliveryStatus] ?? DELIVERY_STATUS.Proceeding
            const payment = PAYMENT_STATUS[order.paymentStatus] ?? PAYMENT_STATUS.Pending
            const lines: any[] = (order.products ?? []).filter((line: any) => line?.product)
            const units = lines.reduce((sum, line) => sum + (line.amount ?? 0), 0)
            return (
              <li key={order.id}>
                <Link
                  href={`/myOrders/${order.id}`}
                  className="group flex flex-col gap-4 py-5 focus-visible:outline-none focus-visible:bg-brand-mist sm:flex-row sm:items-center sm:gap-6"
                >
                  <div className="min-w-0 sm:w-56">
                    <p className="text-base font-semibold text-brand-ink group-hover:text-brand">Замовлення №{order.id}</p>
                    <p className="mt-1 text-sm text-brand-muted">{formatOrderDate(order.data)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${TONE_CLASS[delivery.tone]}`}>{delivery.label}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${TONE_CLASS[payment.tone]}`}>{payment.label}</span>
                    </div>
                  </div>

                  <ul aria-hidden="true" className="flex min-w-0 flex-1 gap-2 overflow-hidden">
                    {lines.slice(0, 5).map((line, index) => (
                      <li key={index} className="relative h-16 w-12 shrink-0 overflow-hidden rounded-sm border border-brand-line bg-white">
                        <Image src={line.product.images?.[0] || "/placeholder.svg"} alt="" fill sizes="54px" className="object-contain" />
                      </li>
                    ))}
                    {lines.length > 5 && (
                      <li className="flex h-16 w-12 shrink-0 items-center justify-center rounded-sm bg-brand-mist text-sm font-medium text-brand-muted">
                        +{lines.length - 5}
                      </li>
                    )}
                  </ul>

                  <div className="flex items-center justify-between gap-4 sm:w-44 sm:justify-end">
                    <div className="sm:text-right">
                      <p className="text-base font-semibold tabular-nums text-brand-ink">{money(order.value)}</p>
                      <p className="text-sm text-brand-muted">{countLabel(units, PRODUCT_FORMS)}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-brand-muted group-hover:text-brand" aria-hidden="true" />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default MyOrders
