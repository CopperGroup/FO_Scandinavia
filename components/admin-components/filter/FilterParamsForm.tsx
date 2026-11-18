"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import Select from "@/components/admin/Select"
import { Pill, adminButton, adminInput, adminTable } from "@/components/admin/ui"
import { saveFilterCategory } from "@/lib/actions/filter.actions"
import type { FilterParamRow } from "@/lib/admin/categories"
import { cn } from "@/lib/utils"

type Choice = { on: boolean; kind: "select" | "unit"; unit: string }

/**
 * Which params of one category appear in the storefront filter. "Список" shows
 * every value as a checkbox; "Число з одиницею" shows a range (e.g. см, кг).
 */
export default function FilterParamsForm({ categoryId, params, products }: { categoryId: string; params: FilterParamRow[]; products: number }) {
  const router = useRouter()
  const [choices, setChoices] = useState<Record<string, Choice>>(() =>
    Object.fromEntries(params.map((param) => [param.name, { on: param.kind !== "", kind: param.kind === "unit" ? "unit" : "select", unit: param.unit }])),
  )
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null)

  const update = (name: string, change: Partial<Choice>) => {
    setChoices((current) => ({ ...current, [name]: { ...current[name], ...change } }))
    setStatus(null)
  }

  const selected = params.filter((param) => choices[param.name]?.on)
  const missingUnit = selected.find((param) => choices[param.name].kind === "unit" && !choices[param.name].unit.trim())

  const save = async () => {
    if (missingUnit) {
      setStatus({ tone: "error", text: `Вкажіть одиницю для «${missingUnit.name}».` })
      document.getElementById(`unit-${missingUnit.name}`)?.focus()
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      const result = await saveFilterCategory(
        categoryId,
        selected.map((param) => ({ name: param.name, kind: choices[param.name].kind, unit: choices[param.name].unit })),
      )
      setStatus(result.ok ? { tone: "ok", text: result.message } : { tone: "error", text: result.error })
      if (result.ok) router.refresh()
    } catch {
      setStatus({ tone: "error", text: "Не вдалося зберегти. Спробуйте ще раз." })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 px-4 py-3 sm:px-4">
        <p className="mr-auto text-sm text-neutral-600" aria-live="polite">
          У фільтрі: {selected.length} з {params.length}
        </p>
        <button
          type="button"
          className={adminButton.ghost}
          onClick={() => {
            setChoices((current) => {
              const next = { ...current }
              for (const param of params) if (param.recommended && !next[param.name].on) next[param.name] = { ...next[param.name], on: true, kind: "select" }
              return next
            })
            setStatus(null)
          }}
        >
          Позначити рекомендовані
        </button>
        <button type="button" className={adminButton.primary} onClick={() => void save()} disabled={busy}>
          {busy ? "Зберігаємо…" : "Зберегти фільтр"}
        </button>
      </div>
      {status && (
        <p role={status.tone === "error" ? "alert" : "status"} className={cn("px-4 pt-3 text-sm", status.tone === "error" ? "text-red-700" : "text-neutral-700")}>
          {status.text}
        </p>
      )}

      <div className={adminTable.wrap}>
        <table className={cn(adminTable.table, "min-w-[40rem]")}>
          <thead>
            <tr className={adminTable.headRow}>
              <th scope="col" className={cn(adminTable.th, "pl-4")}>
                Характеристика
              </th>
              <th scope="col" className={cn(adminTable.th, "text-right")}>
                Товарів
              </th>
              <th scope="col" className={adminTable.th}>
                Приклади значень
              </th>
              <th scope="col" className={cn(adminTable.th, "pr-4")}>
                Як показувати
              </th>
            </tr>
          </thead>
          <tbody>
            {params.map((param) => {
              const choice = choices[param.name]
              const share = products ? Math.round((param.products / products) * 100) : 0
              return (
                <tr key={param.name} className={cn(adminTable.row, choice.on && "bg-neutral-50")}>
                  <td className={cn(adminTable.td, "pl-4")}>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked={choice.on} onChange={(event) => update(param.name, { on: event.target.checked })} className="check" />
                      <span className="font-medium">{param.name}</span>
                    </label>
                    <div className="mt-1 flex gap-1 pl-7">
                      {param.recommended && <Pill tone="muted">Рекомендовано</Pill>}
                      {param.products === 0 && <Pill tone="problem">Немає в товарах</Pill>}
                    </div>
                  </td>
                  <td className={cn(adminTable.td, "text-right tabular-nums")}>
                    {param.products}
                    <span className="block text-xs text-neutral-500">{share}%</span>
                  </td>
                  <td className={cn(adminTable.td, "max-w-[17.5rem] text-xs text-neutral-600")}>
                    {param.samples.join(", ") || "—"}
                    {param.values > param.samples.length && <span className="text-neutral-400"> і ще {param.values - param.samples.length}</span>}
                  </td>
                  <td className={cn(adminTable.td, "pr-4")}>
                    <div className="flex items-center gap-2">
                      <Select
                        id={`kind-${param.name}`}
                        size="sm"
                        className="w-48"
                        value={choice.kind}
                        disabled={!choice.on}
                        searchable={false}
                        aria-label={`Як показувати «${param.name}»`}
                        onChange={(value) => update(param.name, { kind: value as Choice["kind"] })}
                        options={[
                          { value: "select", label: "Список значень", hint: "Покупець ставить позначки" },
                          { value: "unit", label: "Число з одиницею", hint: "Діапазон «від — до», напр. см" },
                        ]}
                      />
                      {choice.on && choice.kind === "unit" && (
                        <>
                          <label className="sr-only" htmlFor={`unit-${param.name}`}>
                            Одиниця для «{param.name}»
                          </label>
                          <input
                            id={`unit-${param.name}`}
                            value={choice.unit}
                            onChange={(event) => update(param.name, { unit: event.target.value.replace(/-/g, "") })}
                            placeholder="см"
                            className={cn(adminInput, "w-20", !choice.unit.trim() && "border-red-600")}
                            maxLength={12}
                          />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
