"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Copy, Trash2 } from "lucide-react"
import { Pill, adminButton, adminButtonSm, adminTable } from "@/components/admin/ui"
import AdminDialog from "@/components/admin-components/modals/AdminDialog"
import { deletePromoCode, setPromoCodeActive } from "@/lib/actions/promo-admin.actions"
import type { PromoListRow } from "@/lib/promo/admin"
import { PROMO_STATUS_LABEL } from "@/lib/promo/rules"
import { cn } from "@/lib/utils"
import { SOURCE_SHORT, STATUS_TONE, daysText, minOrderText, statusTip, usageText } from "./format"

const OFFLINE = "Немає зв’язку із сервером. Перевірте інтернет і спробуйте ще раз."

type Notice = { tone: "ok" | "problem"; text: string }

/** Switching, copying and deleting, shared by the table and the phone cards. */
function useRowActions() {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [removing, setRemoving] = useState<PromoListRow | null>(null)
  const [removeError, setRemoveError] = useState("")
  const copyTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(copyTimer.current), [])

  const toggle = async (row: PromoListRow) => {
    setBusy(row.id)
    setNotice(null)
    try {
      const result = await setPromoCodeActive(row.id, !row.active)
      if (!result.ok) setNotice({ tone: "problem", text: result.error })
      else {
        setNotice({ tone: "ok", text: row.active ? `Код ${row.code} вимкнено: ним більше не можна скористатися.` : `Код ${row.code} знову ввімкнено.` })
        router.refresh()
      }
    } catch {
      setNotice({ tone: "problem", text: OFFLINE })
    } finally {
      setBusy(null)
    }
  }

  const copy = async (row: PromoListRow) => {
    try {
      await navigator.clipboard.writeText(row.code)
      setCopied(row.id)
      clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(null), 2000)
    } catch {
      setNotice({ tone: "problem", text: `Не вдалося скопіювати. Виділіть код ${row.code} і скопіюйте його вручну.` })
    }
  }

  const remove = async () => {
    if (!removing) return
    setBusy(removing.id)
    setRemoveError("")
    try {
      const result = await deletePromoCode(removing.id)
      if (!result.ok) setRemoveError(result.error)
      else {
        setNotice({ tone: "ok", text: `Код ${removing.code} видалено.` })
        setRemoving(null)
        router.refresh()
      }
    } catch {
      setRemoveError(OFFLINE)
    } finally {
      setBusy(null)
    }
  }

  const dialog = (
    <AdminDialog
      open={Boolean(removing)}
      onClose={() => {
        setRemoving(null)
        setRemoveError("")
      }}
      busy={Boolean(removing) && busy === removing?.id}
      tone="danger"
      title="Видалити промокод?"
      description={
        removing && (
          <>
            Код <span className="font-mono font-semibold text-neutral-900">{removing.code}</span> зникне зі списку назавжди. Ним ще ніхто не скористався, тож жодне замовлення не зміниться.
          </>
        )
      }
      footer={
        <>
          <button type="button" className={adminButton.secondary} onClick={() => setRemoving(null)} disabled={busy !== null}>
            Скасувати
          </button>
          <button type="button" className={adminButton.dangerSolid} onClick={() => void remove()} disabled={busy !== null}>
            {busy !== null ? "Видаляємо…" : "Видалити код"}
          </button>
        </>
      }
    >
      {removeError && (
        <p role="alert" className="text-sm text-red-700">
          {removeError}
        </p>
      )}
    </AdminDialog>
  )

  return { busy, copied, notice, toggle, copy, askRemove: (row: PromoListRow) => setRemoving(row), dialog }
}

function Owner({ row, compact = false }: { row: PromoListRow; compact?: boolean }) {
  if (!row.owner) return <span className="text-neutral-900">Усі покупці</span>
  const name = row.owner.name || row.owner.email || "Покупець без імені"
  return (
    <Link
      href={`/admin/clients/${row.owner.id}`}
      data-tip="Відкрити картку покупця"
      className={cn("relative z-10 block min-w-0 rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black", compact ? "" : "max-w-60")}
    >
      <span className="block truncate text-neutral-900">{name}</span>
      {row.owner.name && row.owner.email && <span className="block truncate text-xs text-neutral-500">{row.owner.email}</span>}
    </Link>
  )
}

/** Minimum order, where the code came from and the note: the second line under the code. */
function Details({ row }: { row: PromoListRow }) {
  const source = row.source !== "admin" ? SOURCE_SHORT[row.source] : undefined
  const parts = [minOrderText(row.minOrder), source?.label ?? ""].filter(Boolean)
  if (parts.length === 0 && !row.note) return null
  return (
    // Above the row's link layer, so the explanations open on hover.
    <p className="relative z-10 mt-0.5 flex min-w-0 max-w-72 gap-1 text-xs text-neutral-500">
      {parts.length > 0 && (
        <span className="shrink-0" data-tip={source?.tip}>
          {parts.join(" · ")}
        </span>
      )}
      {parts.length > 0 && row.note && <span aria-hidden="true">·</span>}
      {row.note && (
        <span className="min-w-0 truncate italic" data-tip={`Нотатка для себе: ${row.note}`}>
          <span className="sr-only">Нотатка: </span>
          {row.note}
        </span>
      )}
    </p>
  )
}

function Actions({ row, actions }: { row: PromoListRow; actions: ReturnType<typeof useRowActions> }) {
  const working = actions.busy === row.id
  const copied = actions.copied === row.id
  return (
    <div className="relative z-10 flex items-center justify-end gap-1">
      <button
        type="button"
        className={cn(adminButtonSm.secondary, "min-w-20")}
        onClick={() => void actions.toggle(row)}
        disabled={actions.busy !== null}
        aria-label={row.active ? `Вимкнути код ${row.code}` : `Увімкнути код ${row.code}`}
        data-tip={row.active ? "Код перестане діяти одразу. Увімкнути знову можна будь-коли." : "Код знову діятиме: у межах своїх дат і кількості замовлень."}
      >
        {working ? "Чекайте…" : row.active ? "Вимкнути" : "Увімкнути"}
      </button>
      <button
        type="button"
        className={adminButtonSm.icon}
        onClick={() => void actions.copy(row)}
        aria-label={copied ? `Код ${row.code} скопійовано` : `Скопіювати код ${row.code}`}
        data-tip={copied ? "Скопійовано" : "Скопіювати код"}
      >
        {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      </button>
      {row.usedCount === 0 ? (
        <button
          type="button"
          className={cn(adminButtonSm.icon, "hover:bg-red-50 hover:text-red-700")}
          onClick={() => actions.askRemove(row)}
          disabled={actions.busy !== null}
          aria-label={`Видалити код ${row.code}`}
          data-tip="Видалити код. Можна, доки ним ніхто не скористався."
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : (
        // A used code stays as the record of its orders; the empty square keeps the columns in line.
        <span className="h-control-sm w-control-sm shrink-0" aria-hidden="true" />
      )}
    </div>
  )
}

function StatusPill({ row }: { row: PromoListRow }) {
  // Above the row's link layer, so its explanation opens on hover.
  return (
    <span className="relative z-10 inline-flex">
      <Pill tone={STATUS_TONE[row.status]} tip={statusTip(row.status, row)}>
        {PROMO_STATUS_LABEL[row.status]}
      </Pill>
    </span>
  )
}

export function PromoTable({ rows }: { rows: PromoListRow[] }) {
  const actions = useRowActions()

  return (
    <>
      <div aria-live="polite" className="empty:hidden">
        {actions.notice && (
          <p role={actions.notice.tone === "problem" ? "alert" : "status"} className={cn("px-4 pt-3 text-sm", actions.notice.tone === "problem" ? "text-red-700" : "text-neutral-700")}>
            {actions.notice.text}
          </p>
        )}
      </div>

      {/* Seven columns need about 1 000px: the table from 1280px, cards below (two in a row on a tablet or a small laptop). */}
      <div className={cn("hidden xl:block", adminTable.wrap)}>
        <table className={adminTable.table}>
          <thead>
            <tr className={adminTable.headRow}>
              <th scope="col" className={cn(adminTable.th, "pl-4")}>
                Код
              </th>
              <th scope="col" className={cn(adminTable.th, "text-right")}>
                Знижка
              </th>
              <th scope="col" className={adminTable.th}>
                Для кого
              </th>
              <th scope="col" className={adminTable.th}>
                <span data-tip="Перший і останній день, обидва включно, за київським часом" className="cursor-help underline decoration-neutral-300 decoration-dotted underline-offset-4">
                  Діє
                </span>
              </th>
              <th scope="col" className={cn(adminTable.th, "text-right")}>
                <span
                  data-tip="Скільки замовлень оформили з кодом і скільки можна всього. Скасоване замовлення повертає використання."
                  className="cursor-help underline decoration-neutral-300 decoration-dotted underline-offset-4"
                >
                  Використано
                </span>
              </th>
              <th scope="col" className={adminTable.th}>
                Стан
              </th>
              <th scope="col" className={cn(adminTable.th, "pr-4")}>
                <span className="sr-only">Дії</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={cn(adminTable.row, "relative")}>
                <td className={cn(adminTable.td, "pl-4")}>
                  <Link
                    href={`/admin/promocodes/${row.id}`}
                    className="whitespace-nowrap font-mono font-semibold text-black after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:underline focus-visible:outline-none"
                  >
                    {row.code}
                  </Link>
                  <Details row={row} />
                </td>
                <td className={cn(adminTable.td, "whitespace-nowrap text-right font-semibold tabular-nums")}>−{row.percent}%</td>
                <td className={adminTable.td}>
                  <Owner row={row} />
                </td>
                <td className={cn(adminTable.td, "tabular-nums text-neutral-700")}>{daysText(row.startDay, row.endDay)}</td>
                <td className={cn(adminTable.td, "whitespace-nowrap text-right tabular-nums")}>{usageText(row)}</td>
                <td className={adminTable.td}>
                  <StatusPill row={row} />
                </td>
                <td className={cn(adminTable.td, "pr-4")}>
                  <Actions row={row} actions={actions} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-neutral-100 md:grid md:grid-cols-2 md:divide-y-0 xl:hidden">
        {rows.map((row) => (
          <li key={row.id} className="relative px-4 py-3 md:border-b md:border-neutral-100 md:odd:border-r">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/admin/promocodes/${row.id}`}
                  className="break-all font-mono font-semibold text-black after:absolute after:inset-0 after:content-[''] focus-visible:underline focus-visible:outline-none"
                >
                  {row.code}
                </Link>
                <Details row={row} />
              </div>
              <span className="shrink-0 font-semibold tabular-nums">−{row.percent}%</span>
            </div>
            <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
              <dt className="text-neutral-500">Для кого</dt>
              <dd className="min-w-0">
                <Owner row={row} compact />
              </dd>
              <dt className="text-neutral-500">Діє</dt>
              <dd className="tabular-nums text-neutral-700">{daysText(row.startDay, row.endDay)}</dd>
              <dt className="text-neutral-500">Використано</dt>
              <dd className="tabular-nums">{usageText(row)}</dd>
            </dl>
            <div className="mt-2 flex items-center justify-between gap-3">
              <StatusPill row={row} />
              <Actions row={row} actions={actions} />
            </div>
          </li>
        ))}
      </ul>

      {actions.dialog}
    </>
  )
}
