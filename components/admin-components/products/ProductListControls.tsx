"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Search } from "lucide-react"
import Select from "@/components/admin/Select"
import { adminInput } from "@/components/admin/ui"
import { cn } from "@/lib/utils"

type Props = {
  query: string
  category: string
  sort: string
  tab: string
  size: number
  categories: { id: string; name: string; path?: string }[]
  sorts: { key: string; label: string }[]
}

/**
 * Search, category and sort for the products list, in one toolbar row.
 * Everything lives in the URL, so the server does the work and the list can
 * be shared or bookmarked.
 */
export default function ProductListControls({ query, category, sort, tab, size, categories, sorts }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const go = (changes: Record<string, string>) => {
    const next: Record<string, string> = { tab, q: query, category, sort, size: String(size), ...changes }
    const params = new URLSearchParams()
    if (next.tab && next.tab !== "all") params.set("tab", next.tab)
    if (next.q) params.set("q", next.q)
    if (next.category) params.set("category", next.category)
    if (next.sort && next.sort !== "updated") params.set("sort", next.sort)
    if (next.size && next.size !== "50") params.set("size", next.size)
    const search = params.toString()
    startTransition(() => router.push(search ? `/admin/products?${search}` : "/admin/products"))
  }

  return (
    <div className={cn("flex flex-col gap-2 md:flex-row md:items-center", pending && "opacity-70")} aria-busy={pending}>
      <form
        role="search"
        className="relative flex-1"
        onSubmit={(event) => {
          event.preventDefault()
          const value = new FormData(event.currentTarget).get("q")
          go({ q: String(value ?? "").trim() })
        }}
      >
        <label htmlFor="products-search" className="sr-only">
          Пошук товарів
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
        <input
          id="products-search"
          name="q"
          type="search"
          defaultValue={query}
          key={query}
          placeholder="Назва, артикул, бренд або ID — і Enter"
          className={cn(adminInput, "pl-9")}
        />
      </form>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:flex">
        <Select
          className="md:w-64"
          value={category}
          onChange={(value) => go({ category: value })}
          searchable
          clearable
          placeholder="Усі категорії"
          searchPlaceholder="Знайти категорію"
          aria-label="Категорія"
          options={categories.map((option) => ({ value: option.id, label: option.name, hint: option.path || undefined }))}
        />
        <Select
          className="md:w-52"
          value={sort}
          onChange={(value) => go({ sort: value })}
          searchable={false}
          aria-label="Сортування"
          options={sorts.map((option) => ({ value: option.key, label: option.label }))}
        />
      </div>
    </div>
  )
}
