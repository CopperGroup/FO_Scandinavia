"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import Select from "@/components/admin/Select"
import { Field, Panel } from "@/components/admin/ui"
import { changePaymentStatus, changedeliveryStatus } from "@/lib/actions/order.actions"

const PAYMENT_OPTIONS = [
  { value: "Pending", label: "Очікує оплати" },
  { value: "Success", label: "Оплачено" },
  { value: "Declined", label: "Оплату відхилено" },
]

const DELIVERY_OPTIONS = [
  { value: "Proceeding", label: "Нове", hint: "ще не відправлене" },
  { value: "Indelivery", label: "У дорозі", hint: "передане перевізнику" },
  { value: "Fulfilled", label: "Виконано", hint: "клієнт отримав" },
  { value: "Canceled", label: "Скасовано" },
]

/** Payment and delivery state. A change is saved straight away. */
export function OrderStatusControls({ orderId, paymentStatus, deliveryStatus }: { orderId: string; paymentStatus: string; deliveryStatus: string }) {
  const router = useRouter()
  const [payment, setPayment] = useState(paymentStatus)
  const [delivery, setDelivery] = useState(deliveryStatus)
  const [pending, startTransition] = useTransition()

  const change = (kind: "payment" | "delivery", value: string) => {
    const previous = kind === "payment" ? payment : delivery
    if (value === previous) return
    if (kind === "payment") setPayment(value)
    else setDelivery(value)

    startTransition(async () => {
      try {
        if (kind === "payment") await changePaymentStatus(orderId, value)
        else await changedeliveryStatus(orderId, value)
        toast.success(kind === "payment" ? "Статус оплати змінено" : "Статус доставки змінено")
        router.refresh()
      } catch {
        if (kind === "payment") setPayment(previous)
        else setDelivery(previous)
        toast.error("Не вдалося змінити статус. Спробуйте ще раз.")
      }
    })
  }

  return (
    <Panel title="Стан замовлення">
      <div className="space-y-4">
        <Field label="Оплата" htmlFor="order-payment-status">
          <Select id="order-payment-status" options={PAYMENT_OPTIONS} value={payment} onChange={(value) => change("payment", value)} disabled={pending} />
        </Field>
        <Field
          label="Доставка"
          htmlFor="order-delivery-status"
          hint={delivery === "Canceled" ? "Скасування не повертає товари на склад: за потреби змініть залишки вручну." : undefined}
        >
          <Select id="order-delivery-status" options={DELIVERY_OPTIONS} value={delivery} onChange={(value) => change("delivery", value)} disabled={pending} />
        </Field>
      </div>
    </Panel>
  )
}
