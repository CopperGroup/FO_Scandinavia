"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Move, Trash2, X } from "lucide-react"
import AdminDialog from "@/components/admin-components/modals/AdminDialog"
import { adminButton, adminButtonSm } from "@/components/admin/ui"
import { deleteEmptyCategories } from "@/lib/actions/categories.actions"
import { pluralUk } from "@/lib/admin/catalog-shared"
import { cn } from "@/lib/utils"

type Entry = { id: string; name: string; path: string; products: number }

const number = new Intl.NumberFormat("uk-UA")
const inset = "px-4 sm:px-4"

function categoriesWord(count: number) {
  return pluralUk(count, "категорію", "категорії", "категорій")
}

function PanelHead({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className={cn(inset, "border-b border-neutral-200 py-3")}>
      <div className="flex min-h-9 items-center justify-between gap-3">
        <h2 className="min-w-0 truncate text-base font-semibold text-neutral-900">{title}</h2>
        {action}
      </div>
      <p className="text-sm text-neutral-500">{description}</p>
    </div>
  )
}

/**
 * The right pane when no category is chosen: empty categories to clean up
 * (open or delete each, or all at once) and the biggest categories.
 */
export default function CategoriesOverview({ empty, biggest }: { empty: Entry[]; biggest: Entry[] }) {
  const router = useRouter()
  const [refreshing, startTransition] = useTransition()
  const [confirmOne, setConfirmOne] = useState<string | null>(null)
  const [confirmAll, setConfirmAll] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null)

  const remove = async (ids: string[]) => {
    setBusy(true)
    setStatus(null)
    try {
      const result = await deleteEmptyCategories(ids)
      setStatus(result.ok ? { tone: "ok", text: result.message } : { tone: "error", text: result.error })
      if (result.ok) startTransition(() => router.refresh())
    } catch {
      setStatus({ tone: "error", text: "Не вдалося видалити. Перевірте з’єднання і спробуйте ще раз." })
    } finally {
      setBusy(false)
      setConfirmOne(null)
      setConfirmAll(false)
    }
  }

  const max = Math.max(1, ...biggest.map((entry) => entry.products))

  return (
    <>
      {status && (
        <div
          role={status.tone === "error" ? "alert" : "status"}
          className={cn("flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm", status.tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-neutral-200 bg-neutral-50 text-neutral-700")}
        >
          <p className="min-w-0 flex-1">{status.text}</p>
          <button type="button" onClick={() => setStatus(null)} aria-label="Закрити повідомлення" className={adminButtonSm.icon}>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <section className="rounded-lg border border-neutral-200 bg-white" aria-busy={refreshing || undefined}>
          <PanelHead
            title={`Порожні категорії${empty.length ? ` · ${empty.length}` : ""}`}
            description="Без товарів, і в підкатегоріях теж."
            action={
              empty.length > 1 ? (
                <button type="button" className={adminButtonSm.danger} onClick={() => setConfirmAll(true)} disabled={busy}>
                  Видалити всі
                </button>
              ) : undefined
            }
          />
          {empty.length === 0 ? (
            <p className={cn(inset, "py-6 text-sm text-neutral-500")}>Порожніх категорій немає: у кожній є товари.</p>
          ) : (
            <ul className="max-h-[24.5rem] overflow-y-auto overscroll-contain">
              {empty.map((entry) => (
                <li key={entry.id} className={cn(inset, "flex h-14 items-center gap-3 border-b border-neutral-100 last:border-b-0")}>
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/categories?id=${entry.id}`} className="block truncate text-sm font-medium hover:underline" data-tip={entry.name}>
                      {entry.name}
                    </Link>
                    <p className="truncate text-xs text-neutral-500">{entry.path || "Верхній рівень"}</p>
                  </div>
                  {confirmOne === entry.id ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" className={adminButtonSm.dangerSolid} onClick={() => void remove([entry.id])} disabled={busy}>
                        {busy ? "Видаляємо…" : "Видалити"}
                      </button>
                      <button type="button" className={adminButtonSm.ghost} onClick={() => setConfirmOne(null)} disabled={busy}>
                        Ні
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={cn(adminButton.icon, "hover:bg-red-50 hover:text-red-700")}
                      onClick={() => setConfirmOne(entry.id)}
                      disabled={busy}
                      aria-label={`Видалити «${entry.name}»`}
                      data-tip="Видалити категорію"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white">
          <PanelHead title="Найбільші категорії" description="Товари в самій категорії, без підкатегорій." />
          {biggest.length === 0 ? (
            <p className={cn(inset, "py-6 text-sm text-neutral-500")}>Товарів у категоріях ще немає.</p>
          ) : (
            <ol>
              {biggest.map((entry) => (
                <li key={entry.id} className={cn(inset, "flex h-14 flex-col justify-center gap-2 border-b border-neutral-100 last:border-b-0")}>
                  <div className="flex min-w-0 items-baseline gap-3">
                    <Link href={`/admin/categories?id=${entry.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline" data-tip={entry.path ? `${entry.path} / ${entry.name}` : entry.name}>
                      {entry.name}
                    </Link>
                    <span className="shrink-0 text-sm tabular-nums text-neutral-700">{number.format(entry.products)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100" aria-hidden="true">
                    <div className="h-full rounded-full bg-neutral-900" style={{ width: `${Math.max(2, (entry.products / max) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <p className="flex items-start gap-2 text-sm text-neutral-500">
        <Move className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          Щоб перемістити категорію, перетягніть її в дереві на іншу (або на «Верхній рівень») чи оберіть батьківську на вкладці «Загальне». Переміщення можна скасувати.
        </span>
      </p>

      <AdminDialog
        open={confirmAll}
        onClose={() => setConfirmAll(false)}
        busy={busy}
        tone="danger"
        title={`Видалити ${empty.length} ${categoriesWord(empty.length)} без товарів?`}
        description="Товарів це не зачепить: у цих категоріях їх немає. Якщо в якійсь товар з’явився щойно, її буде пропущено."
        footer={
          <>
            <button type="button" className={adminButton.secondary} onClick={() => setConfirmAll(false)} disabled={busy}>
              Скасувати
            </button>
            <button type="button" className={adminButton.dangerSolid} onClick={() => void remove(empty.map((entry) => entry.id))} disabled={busy}>
              {busy ? "Видаляємо…" : `Видалити ${empty.length} ${categoriesWord(empty.length)}`}
            </button>
          </>
        }
      >
        <ul className="max-h-48 list-disc space-y-0.5 overflow-y-auto pl-4 text-sm text-neutral-700">
          {empty.map((entry) => (
            <li key={entry.id}>{entry.path ? `${entry.path} / ${entry.name}` : entry.name}</li>
          ))}
        </ul>
      </AdminDialog>
    </>
  )
}
