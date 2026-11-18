"use client"

import { useRouter } from "next/navigation"
import Select from "@/components/admin/Select"

/** "Спільні та особисті / Лише спільні / Лише особисті": the choice goes to the URL, so the server filters the list. */
export function PromoKindFilter({ value, options }: { value: string; options: { value: string; label: string; hint?: string; href: string }[] }) {
  const router = useRouter()
  return (
    <Select
      size="sm"
      className="w-full sm:w-56"
      aria-label="Які коди показати"
      options={options.map(({ value: key, label, hint }) => ({ value: key, label, hint }))}
      value={value}
      onChange={(next) => {
        const target = options.find((option) => option.value === next)
        if (target) router.push(target.href)
      }}
    />
  )
}
