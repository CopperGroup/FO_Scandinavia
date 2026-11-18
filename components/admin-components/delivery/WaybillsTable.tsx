"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Copy, ExternalLink, RefreshCw } from "lucide-react"
import toast from "react-hot-toast"
import { adminButton, adminTable } from "@/components/admin/ui"
import { AdminDialog } from "@/components/admin-components/AdminDialog"
import { DeliveryPill } from "@/components/admin-components/orders/StatusPills"
import { addInvoiceString, refreshWaybillStatuses } from "@/lib/actions/order.actions"
import { money } from "@/lib/storefront/format"

export type WaybillTableRow = {
  _id: string
  id: string
  number: string
  recipient: string
  city: string
  when: string
  cost: number | null
  estimated: string
  status: string
  checked: string
  deliveryStatus: string
}

const trackUrl = (number: string) => `https://novaposhta.ua/tracking/?cargo_number=${number}`

/** Created waybills: copy the number, open tracking, refresh statuses for this page, or take a wrong number off an order. */
export function WaybillsTable({ rows, apiKeySet }: { rows: WaybillTableRow[]; apiKeySet: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [removing, setRemoving] = useState<WaybillTableRow | null>(null)
  const [error, setError] = useState("")

  const copy = (number: string) => navigator.clipboard?.writeText(number).then(() => toast.success("Номер скопійовано"))

  const refresh = () => {
    setError("")
    startTransition(async () => {
      try {
        const result = await refreshWaybillStatuses(rows.map((row) => row.number))
        if (!result.ok) {
          setError(result.error)
          return
        }
        toast.success(`Оновлено статусів: ${result.updated}`)
        router.refresh()
      } catch {
        setError("Не вдалося оновити статуси. Спробуйте ще раз.")
      }
    })
  }

  const remove = () => {
    if (!removing) return
    const row = removing
    startTransition(async () => {
      try {
        await addInvoiceString({ orderId: row._id, invoiceString: "" })
        toast.success(`Номер прибрано із замовлення №${row.id}`)
        setRemoving(null)
        router.refresh()
      } catch {
        toast.error("Не вдалося прибрати номер. Спробуйте ще раз.")
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">Статуси оновлюються за запитом: Нова пошта не повідомляє про зміни сама.</p>
        <button type="button" onClick={refresh} disabled={pending || !apiKeySet || rows.length === 0} className={adminButton.secondary} data-tip={apiKeySet ? undefined : "Нова пошта не підключена"}>
          <RefreshCw className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden="true" />
          Оновити статуси на сторінці
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <div className={`hidden md:block ${adminTable.wrap}`}>
        <table className={`${adminTable.table} min-w-[56.25rem]`}>
          <thead>
            <tr className={adminTable.headRow}>
              <th scope="col" className={adminTable.th}>Накладна</th>
              <th scope="col" className={adminTable.th}>Замовлення</th>
              <th scope="col" className={adminTable.th}>Отримувач</th>
              <th scope="col" className={adminTable.th}>
                <span data-tip="Останнє, що повідомила Нова пошта. Щоб перевірити ще раз, натисніть «Оновити статуси на сторінці»" className="cursor-help underline decoration-neutral-300 decoration-dotted underline-offset-4">
                  Статус у Новій пошті
                </span>
              </th>
              <th scope="col" className={`${adminTable.th} text-right`}>Доставка</th>
              <th scope="col" className={`${adminTable.th} pr-0 text-right`}>
                <span className="sr-only">Дії</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className={adminTable.row}>
                <td className={adminTable.td}>
                  <div className="flex items-center gap-1">
                    <span className="font-mono tabular-nums">{row.number}</span>
                    <button type="button" onClick={() => copy(row.number)} className={adminButton.icon} aria-label={`Скопіювати номер ${row.number}`}>
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500">{row.when}</p>
                </td>
                <td className={adminTable.td}>
                  <Link href={`/admin/Orders/${row.id}`} className="font-semibold hover:underline">
                    №{row.id}
                  </Link>
                  <div className="mt-1">
                    <DeliveryPill status={row.deliveryStatus} />
                  </div>
                </td>
                <td className={adminTable.td}>
                  <p className="font-medium">{row.recipient || "—"}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{row.city}</p>
                </td>
                <td className={`${adminTable.td} max-w-[16.25rem]`}>
                  <p className="text-neutral-800">{row.status || "Ще не перевіряли"}</p>
                  {row.checked && <p className="mt-0.5 text-xs text-neutral-500">перевірено {row.checked}</p>}
                </td>
                <td className={`${adminTable.td} text-right`}>
                  <p className="tabular-nums">{row.cost !== null ? money(row.cost) : "—"}</p>
                  {row.estimated && <p className="mt-0.5 whitespace-nowrap text-xs text-neutral-500">прибуде {row.estimated}</p>}
                </td>
                <td className={`${adminTable.td} pr-0 text-right`}>
                  <div className="flex justify-end gap-1">
                    <a href={trackUrl(row.number)} target="_blank" rel="noopener noreferrer" className={adminButton.icon} aria-label={`Відстежити ${row.number} на сайті Нової пошти`}>
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                    <button type="button" onClick={() => setRemoving(row)} className={`${adminButton.ghost} text-red-700 hover:text-red-800`}>
                      Прибрати
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-neutral-100 border-y border-neutral-100 md:hidden">
        {rows.map((row) => (
          <li key={row._id} className="py-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm tabular-nums">{row.number}</span>
              <div className="flex gap-1">
                <button type="button" onClick={() => copy(row.number)} className={adminButton.icon} aria-label={`Скопіювати номер ${row.number}`}>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </button>
                <a href={trackUrl(row.number)} target="_blank" rel="noopener noreferrer" className={adminButton.icon} aria-label={`Відстежити ${row.number}`}>
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </div>
            <Link href={`/admin/Orders/${row.id}`} className="mt-1 block text-sm font-semibold">
              Замовлення №{row.id}
            </Link>
            <p className="text-sm text-neutral-600">
              {row.recipient}
              {row.city ? `, ${row.city}` : ""}
            </p>
            <p className="mt-1 text-xs text-neutral-500">{row.status || "Статус ще не перевіряли"}</p>
          </li>
        ))}
      </ul>

      <AdminDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Прибрати номер накладної?"
        description={removing ? `Номер ${removing.number} зникне із замовлення №${removing.id}. Сама накладна в Новій пошті не скасовується: за потреби видаліть її в кабінеті перевізника.` : undefined}
        footer={
          <>
            <button type="button" onClick={() => setRemoving(null)} className={adminButton.secondary}>
              Залишити
            </button>
            <button type="button" onClick={remove} disabled={pending} className={adminButton.dangerSolid}>
              Прибрати номер
            </button>
          </>
        }
      >
        <p className="text-sm text-neutral-600">Замовлення повернеться у вкладку «До відправлення», якщо воно ще нове.</p>
      </AdminDialog>
    </div>
  )
}
