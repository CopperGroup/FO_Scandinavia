import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { AdminPage, FormLayout } from "@/components/admin/ui"
import { OrderCustomerPanel } from "@/components/admin-components/orders/detail/OrderCustomerPanel"
import { OrderDeliveryPanel } from "@/components/admin-components/orders/detail/OrderDeliveryPanel"
import { OrderItemsPanel } from "@/components/admin-components/orders/detail/OrderItemsPanel"
import { DeleteOrderButton, PrintOrderButton } from "@/components/admin-components/orders/detail/OrderPageActions"
import { OrderStatusControls } from "@/components/admin-components/orders/detail/OrderStatusControls"
import { DeliveryPill, PaymentPill } from "@/components/admin-components/orders/StatusPills"
import { deliveryProblems, getDeliverySettings } from "@/lib/admin/delivery"
import { getOrderDetail } from "@/lib/admin/orders"
import { formatAdminDateTime } from "@/lib/admin/status"
import { money } from "@/lib/storefront/format"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return { title: `Замовлення №${params.id}` }
}

const Page = async ({ params }: { params: { id: string } }) => {
  const [order, delivery] = await Promise.all([getOrderDetail(params.id), getDeliverySettings()])
  if (!order) notFound()

  const customer = [order.name, order.surname].filter(Boolean).join(" ") || "Без імені"
  const defaultBranch = delivery.branches.find((branch) => branch.id === delivery.defaultBranchId)

  return (
    <AdminPage
      title={`Замовлення №${order.id}`}
      back={{ href: "/admin/Orders", label: "Замовлення" }}
      description={
        <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-2">
          <span>
            {formatAdminDateTime(order.date)} · {customer} · {money(order.value)}
          </span>
          <DeliveryPill status={order.deliveryStatus} />
          <PaymentPill status={order.paymentStatus} />
        </span>
      }
      actions={<PrintOrderButton />}
    >
      {/* key: after a save the page refreshes with new data and the panels start again from it. */}
      <FormLayout
        key={`${order.value}-${order.lines.length}-${order.name}-${order.phoneNumber}-${order.invoiceNumber}`}
        aside={
          <div className="space-y-4 print:hidden">
            <OrderStatusControls orderId={order.id} paymentStatus={order.paymentStatus} deliveryStatus={order.deliveryStatus} />
            <OrderDeliveryPanel
              orderId={order._id}
              invoiceNumber={order.invoiceNumber}
              invoiceStatus={order.invoiceStatus}
              invoiceCheckedAt={order.invoiceCheckedAt}
              canCreate={order.hasNovaPoshtaAddress}
              defaultBranch={defaultBranch ? `${defaultBranch.cityName}, ${defaultBranch.warehouseName}` : null}
              problems={deliveryProblems(delivery)}
            />
            <DeleteOrderButton orderId={order.id} summary={`${customer}, ${money(order.value)}`} />
          </div>
        }
      >
        <OrderItemsPanel order={order} />
        <OrderCustomerPanel order={order} />
      </FormLayout>
    </AdminPage>
  )
}

export default Page
