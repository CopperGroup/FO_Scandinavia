"use client"

import Link from "next/link"
import { useState } from "react"
import { Search, Settings2 } from "lucide-react"
import { adminInput } from "@/components/admin/ui"
import { cn } from "@/lib/utils"

type Row = { id: string; name: string; products: number; configured: number }

const SHOW = [
  { key: "all", label: "Усі" },
  { key: "configured", label: "Налаштовані" },
  { key: "empty", label: "Без фільтра" },
] as const

/** Left pane of the filter admin: categories with how many filter characteristics each has. */
export default function FilterCategoryNav({ rows, selected }: { rows: Row[]; selected: string }) {
  const [query, setQuery] = useState("")
  const [show, setShow] = useState<(typeof SHOW)[number]["key"]>("all")

  const key = query.trim().toLocaleLowerCase("uk-UA")
  const visible = rows.filter((row) => {
    if (key && !row.name.toLocaleLowerCase("uk-UA").includes(key)) return false
    if (show === "configured") return row.configured > 0
    if (show === "empty") return row.configured === 0
    return true
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-3 border-b border-neutral-200 p-4">
        <Link
          href="/admin/filter"
          aria-current={selected === "" ? "page" : undefined}
          className={cn("flex items-center gap-2 rounded-md px-2 py-2 text-sm", selected === "" ? "bg-black text-white" : "hover:bg-neutral-100")}
        >
          <Settings2 className="h-4 w-4" aria-hidden="true" />
          Загальні налаштування
        </Link>
        <div className="relative">
          <label htmlFor="filter-category-search" className="sr-only">
            Знайти категорію
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
          <input id="filter-category-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Знайти категорію" className={cn(adminInput, "pl-9")} />
        </div>
        <div role="group" aria-label="Показати" className="flex gap-1">
          {SHOW.map((entry) => (
            <button
              key={entry.key}
              type="button"
              aria-pressed={show === entry.key}
              onClick={() => setShow(entry.key)}
              className={cn(
                "h-control-sm rounded-full border px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black",
                show === entry.key ? "border-black bg-black text-white" : "border-neutral-300 text-neutral-700 hover:border-black",
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>
      <nav aria-label="Категорії фільтра" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        {visible.length === 0 ? (
          <p className="px-2 py-4 text-sm text-neutral-500">Нічого не знайдено.</p>
        ) : (
          <ul>
            {visible.map((row) => {
              const active = row.id === selected
              return (
                <li key={row.id}>
                  <Link
                    href={`/admin/filter?id=${row.id}`}
                    aria-current={active ? "page" : undefined}
                    className={cn("flex items-center gap-2 rounded-md px-2 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black", active ? "bg-black text-white" : "hover:bg-neutral-100")}
                  >
                    <span className="min-w-0 flex-1 truncate">{row.name}</span>
                    <span className={cn("shrink-0 text-xs", active ? "text-white/80" : row.configured ? "text-neutral-700" : "text-neutral-400")}>
                      {row.configured ? `${row.configured} у фільтрі` : "немає"}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </nav>
    </div>
  )
}
