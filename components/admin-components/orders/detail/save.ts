import { updateOrder } from "@/lib/actions/order.actions"
import type { OrderDetail } from "@/lib/admin/orders"

export type CustomerValues = {
  name: string
  surname: string
  phoneNumber: string
  email: string
  city: string
  warehouse: string
  adress: string
  comment: string
}

export function customerValuesOf(order: OrderDetail): CustomerValues {
  return {
    name: order.name,
    surname: order.surname,
    phoneNumber: order.phoneNumber,
    email: order.email,
    city: order.city,
    warehouse: order.warehouse,
    adress: order.adress,
    comment: order.comment,
  }
}

/**
 * The save action takes the whole editable order, so each panel sends its own
 * changes together with the other half as it is now.
 */
export async function saveOrder(
  order: OrderDetail,
  changes: { customer?: CustomerValues; lines?: { productId: string; amount: number }[] },
): Promise<{ ok: true; value: number } | { ok: false; error: string }> {
  const customer = changes.customer ?? customerValuesOf(order)
  const lines = changes.lines ?? order.lines.map((line) => ({ productId: line.productId, amount: line.amount }))
  try {
    return await updateOrder({
      orderId: order._id,
      userData: customer,
      productsData: lines.map((line) => ({ product: line.productId, amount: line.amount })),
    })
  } catch {
    return { ok: false, error: "Не вдалося зберегти зміни. Перевірте з’єднання і спробуйте ще раз." }
  }
}
