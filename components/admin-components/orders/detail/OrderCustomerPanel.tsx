"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Field, Panel, adminButton, adminInput, adminTextarea } from "@/components/admin/ui"
import type { OrderDetail } from "@/lib/admin/orders"
import { customerValuesOf, saveOrder, type CustomerValues } from "./save"

function phoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  return digits.startsWith("38") ? digits : `38${digits}`
}

/** Recipient and delivery address. Editable; the save keeps the items as they are. */
export function OrderCustomerPanel({ order }: { order: OrderDetail }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState<CustomerValues>(customerValuesOf(order))
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerValues | "form", string>>>({})
  const [pending, startTransition] = useTransition()

  const set = (key: keyof CustomerValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues({ ...values, [key]: event.target.value })

  const cancel = () => {
    setValues(customerValuesOf(order))
    setErrors({})
    setEditing(false)
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const found: typeof errors = {}
    if (!values.name.trim()) found.name = "Вкажіть ім’я отримувача."
    if (values.phoneNumber.replace(/\D/g, "").length < 9) found.phoneNumber = "Вкажіть телефон: щонайменше 9 цифр."
    if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) found.email = "Перевірте адресу e-mail."
    setErrors(found)
    if (Object.keys(found).length > 0) return

    startTransition(async () => {
      const result = await saveOrder(order, { customer: values })
      if (!result.ok) {
        setErrors({ form: result.error })
        return
      }
      toast.success("Дані отримувача збережено")
      setEditing(false)
      router.refresh()
    })
  }

  if (editing) {
    return (
      <Panel title="Отримувач і доставка">
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ім’я" htmlFor="order-name" error={errors.name}>
              <input id="order-name" value={values.name} onChange={set("name")} disabled={pending} className={adminInput} />
            </Field>
            <Field label="Прізвище" htmlFor="order-surname">
              <input id="order-surname" value={values.surname} onChange={set("surname")} disabled={pending} className={adminInput} />
            </Field>
            <Field label="Телефон" htmlFor="order-phone" error={errors.phoneNumber}>
              <input id="order-phone" type="tel" value={values.phoneNumber} onChange={set("phoneNumber")} disabled={pending} className={adminInput} />
            </Field>
            <Field label="E-mail" htmlFor="order-email" error={errors.email}>
              <input id="order-email" type="email" value={values.email} onChange={set("email")} disabled={pending} className={adminInput} />
            </Field>
            <Field label="Місто" htmlFor="order-city">
              <input id="order-city" value={values.city} onChange={set("city")} disabled={pending} className={adminInput} />
            </Field>
            <Field label="Відділення або поштомат" htmlFor="order-warehouse" optional>
              <input id="order-warehouse" value={values.warehouse} onChange={set("warehouse")} disabled={pending} className={adminInput} />
            </Field>
          </div>
          <Field label="Адреса" htmlFor="order-address" optional hint="Для кур’єрської доставки.">
            <input id="order-address" value={values.adress} onChange={set("adress")} disabled={pending} className={adminInput} />
          </Field>
          <Field label="Коментар клієнта" htmlFor="order-comment" optional>
            <textarea id="order-comment" value={values.comment} onChange={set("comment")} disabled={pending} rows={3} className={adminTextarea} />
          </Field>
          <p className="text-xs text-neutral-500">
            Зміна міста чи відділення тут не змінює адресу для автоматичної накладної Нової пошти: вона береться з оформлення замовлення.
          </p>
          {errors.form && (
            <p role="alert" className="text-sm text-red-700">
              {errors.form}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={cancel} disabled={pending} className={adminButton.secondary}>
              Скасувати
            </button>
            <button type="submit" disabled={pending} className={adminButton.primary}>
              {pending ? "Зберігаємо…" : "Зберегти зміни"}
            </button>
          </div>
        </form>
      </Panel>
    )
  }

  const rows: [string, React.ReactNode][] = [
    ["Отримувач", [order.name, order.surname].filter(Boolean).join(" ") || "—"],
    [
      "Телефон",
      order.phoneNumber ? (
        <a href={`tel:${order.phoneNumber}`} className="tabular-nums underline-offset-2 hover:underline">
          {order.phoneNumber}
        </a>
      ) : (
        "—"
      ),
    ],
    [
      "E-mail",
      order.email ? (
        <a href={`mailto:${order.email}`} className="break-all underline-offset-2 hover:underline">
          {order.email}
        </a>
      ) : (
        "—"
      ),
    ],
    ["Доставка", [order.deliveryMethod, order.isFreeDelivery ? "безкоштовна" : ""].filter(Boolean).join(", ") || "—"],
    ["Куди", [order.city, order.warehouse, order.adress].filter(Boolean).join(", ") || "—"],
    ["Оплата", order.paymentType || "—"],
  ]

  return (
    <Panel
      title="Отримувач і доставка"
      action={
        <button type="button" onClick={() => setEditing(true)} className={adminButton.secondary}>
          Редагувати
        </button>
      }
    >
      <dl className="space-y-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[6rem_1fr] gap-3">
            <dt className="text-neutral-500">{label}</dt>
            <dd className="min-w-0 break-words text-neutral-900">{value}</dd>
          </div>
        ))}
      </dl>

      {order.comment && (
        <div className="mt-4 rounded-md bg-neutral-50 p-3 text-sm">
          <p className="text-xs font-medium text-neutral-500">Коментар клієнта</p>
          <p className="mt-1 whitespace-pre-line break-words text-neutral-900">{order.comment}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {order.phoneNumber && (
          <>
            <a href={`viber://chat?number=%2B${phoneDigits(order.phoneNumber)}`} className={adminButton.secondary}>
              Viber
            </a>
            <a href={`https://t.me/+${phoneDigits(order.phoneNumber)}`} target="_blank" rel="noopener noreferrer" className={adminButton.secondary}>
              Telegram
            </a>
          </>
        )}
        {order.customerId && (
          <Link href={`/admin/clients/${order.customerId}`} className={adminButton.ghost}>
            Профіль клієнта
          </Link>
        )}
      </div>
    </Panel>
  )
}
