"use client"

import { useState } from "react"
import Select from "@/components/admin/Select"
import { adminButton } from "@/components/admin/ui"
import { saveFilterDelay } from "@/lib/actions/filter.actions"
import { FILTER_DELAY_OPTIONS } from "@/lib/admin/catalog-shared"
import { cn } from "@/lib/utils"

/** How long the catalog waits after a filter click before it reloads the list. */
export default function FilterDelayForm({ delay }: { delay: number }) {
  const [value, setValue] = useState(String(delay))
  const [saved, setSaved] = useState(String(delay))
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null)
  const known = FILTER_DELAY_OPTIONS.some((option) => String(option.value) === value)

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
      onSubmit={async (event) => {
        event.preventDefault()
        setBusy(true)
        setStatus(null)
        try {
          const result = await saveFilterDelay(Number(value))
          setStatus(result.ok ? { tone: "ok", text: result.message } : { tone: "error", text: result.error })
          if (result.ok) setSaved(value)
        } catch {
          setStatus({ tone: "error", text: "Не вдалося зберегти. Спробуйте ще раз." })
        } finally {
          setBusy(false)
        }
      }}
    >
      <label htmlFor="filter-delay" className="text-sm font-medium">
        Затримка оновлення каталогу
      </label>
      <Select
        id="filter-delay"
        className="sm:w-56"
        value={value}
        onChange={setValue}
        searchable={false}
        options={[
          ...(known ? [] : [{ value, label: `${value} мс` }]),
          ...FILTER_DELAY_OPTIONS.map((option) => ({ value: String(option.value), label: option.label })),
        ]}
      />
      <button type="submit" className={adminButton.secondary} disabled={busy || value === saved}>
        {busy ? "Зберігаємо…" : "Зберегти"}
      </button>
      {status && (
        <p role={status.tone === "error" ? "alert" : "status"} className={cn("text-sm", status.tone === "error" ? "text-red-700" : "text-neutral-600")}>
          {status.text}
        </p>
      )}
    </form>
  )
}
