"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Copy } from "lucide-react"
import toast from "react-hot-toast"
import { Panel, adminButton, adminInput } from "@/components/admin/ui"
import { addInvoiceString, createOrderInvoice } from "@/lib/actions/order.actions"
import { formatAdminDateTime } from "@/lib/admin/status"

/**
 * The order's waybill in brief: its number and last known status, or a way to
 * create it from the default sender branch, or to type a number in. All other
 * delivery work is on /admin/delivery.
 */
export function OrderDeliveryPanel({
  orderId,
  invoiceNumber,
  invoiceStatus,
  invoiceCheckedAt,
  canCreate,
  defaultBranch,
  problems,
}: {
  orderId: string
  invoiceNumber: string
  invoiceStatus: string
  invoiceCheckedAt: string | null
  /** The order has a Nova Poshta city and branch. */
  canCreate: boolean
  defaultBranch: string | null
  /** What is missing in the delivery settings (empty when ready). */
  problems: string[]
}) {
  const router = useRouter()
  const [manual, setManual] = useState("")
  const [showManual, setShowManual] = useState(false)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  const create = () => {
    setError("")
    startTransition(async () => {
      try {
        const result = await createOrderInvoice({ orderId })
        if (!result.ok) {
          setError(result.error)
          return
        }
        toast.success(`Накладну ${result.invoice.IntDocNumber} створено`)
        router.refresh()
      } catch {
        setError("Не вдалося створити накладну. Перевірте з’єднання і спробуйте ще раз.")
      }
    })
  }

  const saveManual = (event: React.FormEvent) => {
    event.preventDefault()
    const value = manual.replace(/\s/g, "")
    if (!/^\d{6,20}$/.test(value)) {
      setError("Номер накладної складається лише з цифр, наприклад 20450000000000.")
      return
    }
    setError("")
    startTransition(async () => {
      try {
        await addInvoiceString({ orderId, invoiceString: value })
        toast.success("Номер накладної збережено")
        setManual("")
        setShowManual(false)
        router.refresh()
      } catch {
        setError("Не вдалося зберегти номер. Спробуйте ще раз.")
      }
    })
  }

  return (
    <Panel
      title="Накладна"
      action={
        <Link href="/admin/delivery" className="text-sm font-medium text-neutral-700 underline-offset-4 hover:text-black hover:underline">
          Усе про доставку
        </Link>
      }
    >
      {invoiceNumber ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-base tabular-nums text-neutral-900">{invoiceNumber}</p>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(invoiceNumber).then(() => toast.success("Номер скопійовано"))}
              className={adminButton.icon}
              aria-label="Скопіювати номер накладної"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <p className="text-sm text-neutral-600">
            {invoiceStatus ? `${invoiceStatus}` : "Статус ще не перевіряли."}
            {invoiceCheckedAt ? <span className="block text-xs text-neutral-500">перевірено {formatAdminDateTime(invoiceCheckedAt)}</span> : null}
          </p>
          <a href={`https://novaposhta.ua/tracking/?cargo_number=${invoiceNumber}`} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-medium underline-offset-4 hover:underline">
            Відстежити на сайті Нової пошти
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {canCreate && problems.length === 0 ? (
            <>
              <button type="button" onClick={create} disabled={pending} className={`${adminButton.secondary} w-full`}>
                {pending ? "Створюємо накладну…" : "Створити накладну"}
              </button>
              <p className="text-xs text-neutral-500">Відправлення з: {defaultBranch}</p>
            </>
          ) : canCreate ? (
            <div className="rounded-md bg-neutral-50 p-3 text-sm text-neutral-700">
              <p>Автоматично створити накладну поки не можна:</p>
              <ul className="mt-1 list-disc pl-4 text-neutral-600">
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
              <Link href="/admin/delivery?tab=sender" className="mt-2 inline-block font-medium underline-offset-4 hover:underline">
                Налаштувати доставку
              </Link>
            </div>
          ) : (
            <p className="text-sm text-neutral-600">Замовлення без відділення Нової пошти: створіть накладну в кабінеті перевізника і введіть номер.</p>
          )}

          {showManual ? (
            <form onSubmit={saveManual} noValidate className="flex gap-2">
              <label htmlFor="order-invoice-number" className="sr-only">
                Номер накладної
              </label>
              <input
                id="order-invoice-number"
                inputMode="numeric"
                autoFocus
                value={manual}
                onChange={(event) => setManual(event.target.value)}
                placeholder="20450000000000"
                disabled={pending}
                className={adminInput}
              />
              <button type="submit" disabled={pending || !manual.trim()} className={adminButton.secondary}>
                Зберегти
              </button>
            </form>
          ) : (
            <button type="button" onClick={() => setShowManual(true)} className="text-sm font-medium text-neutral-700 underline-offset-4 hover:text-black hover:underline">
              Ввести номер вручну
            </button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </Panel>
  )
}
