"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import AdminDialog from "@/components/admin-components/modals/AdminDialog"
import Select from "@/components/admin/Select"
import { EmptyState, Panel, Pill, adminButton } from "@/components/admin/ui"
import { deleteCategory } from "@/lib/actions/categories.actions"
import type { DamagedCategory } from "@/lib/admin/categories"
import { productsWord } from "@/lib/admin/catalog-shared"
import { cn } from "@/lib/utils"

type Option = { id: string; name: string; path?: string }

/**
 * Body of the «Пошкоджені категорії» view (the page renders the header).
 * Categories that need fixing: names that are a bare id (left by an old bug)
 * and names used twice. Each has a one-click fix.
 */
export default function DamagedCategories({ items, targets }: { items: DamagedCategory[]; targets: Option[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [busy, setBusy] = useState("")
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null)
  const [moveTo, setMoveTo] = useState<Record<string, string>>({})
  const [confirm, setConfirm] = useState<DamagedCategory | null>(null)

  const run = async (id: string, moveToCategoryId?: string) => {
    setBusy(id)
    setStatus(null)
    try {
      const result = await deleteCategory({ categoryId: id, removeProducts: false, moveToCategoryId })
      setStatus(result.ok ? { tone: "ok", text: result.message } : { tone: "error", text: result.error })
      if (result.ok) startTransition(() => router.refresh())
    } catch {
      setStatus({ tone: "error", text: "Не вдалося виправити. Спробуйте ще раз." })
    } finally {
      setBusy("")
      setConfirm(null)
    }
  }

  const options = targets.map((option) => ({ value: option.id, label: option.name, hint: option.path || undefined }))

  return (
    <>
      {status && (
        <p
          role={status.tone === "error" ? "alert" : "status"}
          className={cn("rounded-lg border px-4 py-2.5 text-sm", status.tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-neutral-200 bg-neutral-50 text-neutral-700")}
        >
          {status.text}
        </p>
      )}

      {items.length === 0 ? (
        <EmptyState title="Усе гаразд" text="Пошкоджених категорій немає. Оберіть категорію ліворуч." />
      ) : (
        <Panel padded={false}>
          <ul className="divide-y divide-neutral-100">
            {items.map((item) => (
              <li key={item.id} className="space-y-3 px-4 py-3 sm:px-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 break-all font-medium">{item.problem === "id-name" ? "Без назви" : item.name}</p>
                  <Pill tone="problem">{item.problem === "id-name" ? "Назва — службовий код" : "Назва повторюється"}</Pill>
                  <span className="text-sm text-neutral-500">
                    {item.products} {productsWord(item.products)}
                  </span>
                </div>
                {item.problem === "id-name" ? (
                  <p className="text-sm text-neutral-600">
                    Такі категорії створювала стара форма товару через помилку. Перенесіть товари в правильну категорію або просто видаліть цю: товари залишаться в інших своїх категоріях.
                  </p>
                ) : (
                  <p className="text-sm text-neutral-600">
                    Така сама назва вже є: {item.twins.map((twin) => `«${twin.name}» (${twin.products} ${productsWord(twin.products)})`).join(", ")}. Об’єднайте їх, щоб покупці бачили одну категорію.
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {item.problem === "duplicate" ? (
                    item.twins.map((twin) => (
                      <button key={twin.id} type="button" className={adminButton.secondary} disabled={busy !== ""} onClick={() => void run(item.id, twin.id)}>
                        {busy === item.id ? "Об’єднуємо…" : `Об’єднати з «${twin.name}»`}
                      </button>
                    ))
                  ) : (
                    <>
                      {item.products > 0 && (
                        <>
                          <div className="w-full sm:w-64">
                            <Select
                              size="sm"
                              value={moveTo[item.id] ?? ""}
                              onChange={(value) => setMoveTo((current) => ({ ...current, [item.id]: value }))}
                              searchable
                              placeholder="Куди перенести товари"
                              searchPlaceholder="Знайти категорію"
                              aria-label="Куди перенести товари"
                              options={options}
                            />
                          </div>
                          <button type="button" className={adminButton.secondary} disabled={!moveTo[item.id] || busy !== ""} onClick={() => void run(item.id, moveTo[item.id])}>
                            Перенести і видалити
                          </button>
                        </>
                      )}
                      <button type="button" className={adminButton.danger} disabled={busy !== ""} onClick={() => setConfirm(item)}>
                        Видалити
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <AdminDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        busy={busy !== ""}
        tone="danger"
        title="Видалити пошкоджену категорію?"
        description={
          confirm?.products
            ? `${confirm.products} ${productsWord(confirm.products)} вийдуть з неї; товари без інших категорій з’являться в розділі «Без категорії».`
            : "У ній немає товарів."
        }
        footer={
          <>
            <button type="button" className={adminButton.secondary} onClick={() => setConfirm(null)} disabled={busy !== ""}>
              Скасувати
            </button>
            <button type="button" className={adminButton.dangerSolid} onClick={() => confirm && void run(confirm.id)} disabled={busy !== ""}>
              {busy ? "Видаляємо…" : "Видалити категорію"}
            </button>
          </>
        }
      />
    </>
  )
}
