"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import Select from "@/components/admin/Select"
import { Pill, adminButton, adminTable } from "@/components/admin/ui"
import { createInvoicesForOrders, createOrderInvoice } from "@/lib/actions/order.actions"
import { money } from "@/lib/storefront/format"

export type AwaitingTableRow = {
  _id: string
  id: string
  when: string
  recipient: string
  phone: string
  place: string
  value: number
  payment: string
  paid: boolean
  ready: boolean
}

type Outcome = { ok: boolean; text: string }

/** Orders waiting for a waybill: one at a time or several selected at once. */
export function AwaitingTable({
  rows,
  branches,
  defaultBranchId,
  blocked,
}: {
  rows: AwaitingTableRow[]
  branches: { value: string; label: string; hint?: string }[]
  defaultBranchId: string | null
  /** Settings are incomplete: creating is switched off (the reason is shown above the table). */
  blocked: boolean
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [branchId, setBranchId] = useState(defaultBranchId ?? "")
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const selectable = useMemo(() => rows.filter((row) => row.ready), [rows])
  const allSelected = selectable.length > 0 && selectable.every((row) => selected.has(row._id))

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const createOne = (row: AwaitingTableRow) => {
    setBusyId(row._id)
    startTransition(async () => {
      try {
        const result = await createOrderInvoice({ orderId: row._id, branchId })
        setOutcomes((current) => ({ ...current, [row._id]: result.ok ? { ok: true, text: `Накладна ${result.invoice.IntDocNumber}` } : { ok: false, text: result.error } }))
        if (result.ok) {
          toast.success(`Замовлення №${row.id}: накладну створено`)
          router.refresh()
        }
      } catch {
        setOutcomes((current) => ({ ...current, [row._id]: { ok: false, text: "Не вдалося створити накладну. Спробуйте ще раз." } }))
      } finally {
        setBusyId(null)
      }
    })
  }

  const createSelected = () => {
    const ids = Array.from(selected)
    startTransition(async () => {
      try {
        const result = await createInvoicesForOrders({ orderIds: ids, branchId })
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        const next: Record<string, Outcome> = {}
        for (const item of result.results) next[item.orderId] = item.ok ? { ok: true, text: `Накладна ${item.number}` } : { ok: false, text: item.error ?? "Помилка" }
        setOutcomes((current) => ({ ...current, ...next }))
        const created = result.results.filter((item) => item.ok).length
        if (created) toast.success(`Створено накладних: ${created} з ${ids.length}`)
        else toast.error("Жодної накладної не створено. Причину видно в рядках.")
        setSelected(new Set())
        if (created) router.refresh()
      } catch {
        toast.error("Не вдалося створити накладні. Спробуйте ще раз.")
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => setSelected(allSelected ? new Set() : new Set(selectable.map((row) => row._id)))}
            disabled={blocked || selectable.length === 0}
            className="check"
          />
          Вибрати всі на сторінці
        </label>
        <div className="flex min-w-[15rem] flex-1 items-center gap-2 sm:max-w-md">
          <span id="awaiting-branch-label" className="shrink-0 text-sm text-neutral-500">
            Відправляти з
          </span>
          <Select
            aria-labelledby="awaiting-branch-label"
            options={branches}
            value={branchId}
            onChange={setBranchId}
            placeholder="Немає відділень"
            disabled={blocked || branches.length === 0}
            size="sm"
            className="min-w-0 flex-1"
          />
        </div>
        <button type="button" onClick={createSelected} disabled={blocked || pending || selected.size === 0} className={`${adminButton.primary} ml-auto`}>
          {pending && !busyId ? "Створюємо…" : selected.size ? `Створити накладні (${selected.size})` : "Створити накладні"}
        </button>
      </div>

      <div className={`hidden md:block ${adminTable.wrap}`}>
        <table className={`${adminTable.table} min-w-[53.75rem]`}>
          <thead>
            <tr className={adminTable.headRow}>
              <th scope="col" className={`${adminTable.th} w-8`}>
                <span className="sr-only">Вибір</span>
              </th>
              <th scope="col" className={adminTable.th}>Замовлення</th>
              <th scope="col" className={adminTable.th}>Отримувач</th>
              <th scope="col" className={adminTable.th}>Куди</th>
              <th scope="col" className={`${adminTable.th} text-right`}>Сума</th>
              <th scope="col" className={`${adminTable.th} pr-0 text-right`}>
                <span className="sr-only">Дія</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const outcome = outcomes[row._id]
              return (
                <tr key={row._id} className={adminTable.row}>
                  <td className={adminTable.td}>
                    <input
                      type="checkbox"
                      checked={selected.has(row._id)}
                      onChange={() => toggle(row._id)}
                      disabled={blocked || !row.ready}
                      aria-label={`Вибрати замовлення №${row.id}`}
                      className="check"
                    />
                  </td>
                  <td className={adminTable.td}>
                    <Link href={`/admin/Orders/${row.id}`} className="font-semibold hover:underline">
                      №{row.id}
                    </Link>
                    <p className="mt-0.5 whitespace-nowrap text-xs text-neutral-500">{row.when}</p>
                  </td>
                  <td className={adminTable.td}>
                    <p className="font-medium">{row.recipient || "Без імені"}</p>
                    <p className="mt-0.5 text-xs tabular-nums text-neutral-500">{row.phone}</p>
                  </td>
                  <td className={`${adminTable.td} max-w-[20rem]`}>
                    <p className="line-clamp-2 text-neutral-700">{row.place || "—"}</p>
                    {!row.ready && <p className="mt-0.5 text-xs text-red-700">Немає відділення з довідника: лише вручну</p>}
                  </td>
                  <td className={`${adminTable.td} text-right`}>
                    <p className="font-semibold tabular-nums">{money(row.value)}</p>
                    <div className="mt-1 flex justify-end">{row.paid ? <Pill tone="ok">Оплачено</Pill> : <Pill>{row.payment}</Pill>}</div>
                  </td>
                  <td className={`${adminTable.td} pr-0 text-right`}>
                    {outcome ? (
                      <p className={`max-w-[13.75rem] text-xs ${outcome.ok ? "text-emerald-800" : "text-red-700"}`}>{outcome.text}</p>
                    ) : (
                      <button type="button" onClick={() => createOne(row)} disabled={blocked || !row.ready || pending} className={adminButton.secondary}>
                        {busyId === row._id ? "Створюємо…" : "Створити накладну"}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-neutral-100 border-y border-neutral-100 md:hidden">
        {rows.map((row) => {
          const outcome = outcomes[row._id]
          return (
            <li key={row._id} className="flex gap-3 py-4">
              <input
                type="checkbox"
                checked={selected.has(row._id)}
                onChange={() => toggle(row._id)}
                disabled={blocked || !row.ready}
                aria-label={`Вибрати замовлення №${row.id}`}
                className="check mt-1"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <Link href={`/admin/Orders/${row.id}`} className="font-semibold">
                    №{row.id}
                  </Link>
                  <span className="font-semibold tabular-nums">{money(row.value)}</span>
                </div>
                <p className="mt-0.5 text-sm text-neutral-700">{row.recipient}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{row.place}</p>
                {outcome ? (
                  <p className={`mt-2 text-xs ${outcome.ok ? "text-emerald-800" : "text-red-700"}`}>{outcome.text}</p>
                ) : (
                  <button type="button" onClick={() => createOne(row)} disabled={blocked || !row.ready || pending} className={`${adminButton.secondary} mt-2`}>
                    Створити накладну
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
