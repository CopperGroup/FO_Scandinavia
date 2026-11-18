"use client"

import { useMemo } from "react"
import { Plus, X } from "lucide-react"
import MultiSelect from "@/components/admin/MultiSelect"
import { categoryNameKey, categoryNameProblem, isObjectIdLike, normalizeCategoryName } from "@/lib/admin/catalog-shared"
import { cn } from "@/lib/utils"

type Option = { id: string; name: string; path?: string }

const NEW = "new:"

/**
 * The categories of a product: chips of the chosen ones and a «Додати
 * категорію» button that opens a searchable multi-choice list (with the path
 * of each category). A search that matches nothing offers to create a
 * category with that name; it is created when the product is saved. A name
 * that matches an existing category (any letter case) is never offered as new,
 * and nothing that looks like an id is ever shown or created as a name.
 */
export function CategoryPicker({
  options,
  selected,
  newNames,
  onChange,
  invalid,
  describedBy,
  inputId,
}: {
  /** Id of the «Додати категорію» button (validation focuses it). */
  inputId?: string
  options: Option[]
  selected: string[]
  newNames: string[]
  onChange: (next: { selected: string[]; newNames: string[] }) => void
  invalid?: boolean
  describedBy?: string
}) {
  const visible = useMemo(() => options.filter((option) => !isObjectIdLike(option.name)), [options])
  const byId = useMemo(() => new Map(options.map((option) => [option.id, option])), [options])

  const listOptions = useMemo(
    () => [
      ...newNames.map((name) => ({ value: `${NEW}${name}`, label: name, hint: "Нова: буде створена під час збереження" })),
      ...visible.map((option) => ({ value: option.id, label: option.name, hint: option.path || "Верхній рівень" })),
    ],
    [visible, newNames],
  )
  const value = [...selected, ...newNames.map((name) => `${NEW}${name}`)]

  const setValue = (next: string[]) =>
    onChange({
      selected: next.filter((item) => !item.startsWith(NEW)),
      newNames: next.filter((item) => item.startsWith(NEW)).map((item) => item.slice(NEW.length)),
    })

  const create = (text: string) => {
    const name = normalizeCategoryName(text)
    const key = categoryNameKey(name)
    const existing = visible.find((option) => categoryNameKey(option.name) === key)
    if (existing) {
      if (!selected.includes(existing.id)) onChange({ selected: [...selected, existing.id], newNames })
      return
    }
    if (newNames.some((item) => categoryNameKey(item) === key)) return
    onChange({ selected, newNames: [...newNames, name] })
  }

  const chip = "inline-flex h-control-sm max-w-full items-center gap-1 rounded-md border pl-2 pr-0.5 text-sm"
  const removeButton =
    "flex h-6 w-6 shrink-0 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(selected.length > 0 || newNames.length > 0) && (
        <ul className="contents" aria-label="Вибрані категорії">
          {selected.map((id) => {
            const option = byId.get(id)
            const label = option?.name ?? "Категорію видалено"
            return (
              <li key={id} className={cn(chip, "border-neutral-300 bg-white")} data-tip={option?.path ? `${option.path} / ${label}` : label}>
                <span className="min-w-0 truncate">
                  {option?.path && <span className="text-neutral-500">{option.path.split(" / ").slice(-1)[0]} / </span>}
                  <span className="font-medium">{label}</span>
                </span>
                <button type="button" onClick={() => onChange({ selected: selected.filter((value) => value !== id), newNames })} className={removeButton} aria-label={`Прибрати категорію «${label}»`}>
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            )
          })}
          {newNames.map((name) => (
            <li key={name} className={cn(chip, "border-dashed border-neutral-400 bg-neutral-50")} data-tip="Буде створена під час збереження товару">
              <span className="min-w-0 truncate">
                <span className="font-medium">{name}</span> <span className="text-neutral-500">· нова</span>
              </span>
              <button type="button" onClick={() => onChange({ selected, newNames: newNames.filter((value) => value !== name) })} className={removeButton} aria-label={`Прибрати нову категорію «${name}»`}>
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <MultiSelect
        id={inputId}
        options={listOptions}
        value={value}
        onChange={setValue}
        onCreate={create}
        createProblem={(text) => categoryNameProblem(text)}
        searchPlaceholder="Знайдіть або введіть нову назву"
        emptyText="Категорій немає."
        invalid={invalid}
        aria-describedby={describedBy}
        triggerClassName={cn(
          "inline-flex h-control-sm items-center gap-1 rounded-md border border-dashed px-2 text-sm font-medium transition-colors hover:border-black hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 data-[state=open]:border-black",
          invalid ? "border-red-500 text-red-700" : "border-neutral-400 text-neutral-900",
        )}
        trigger={
          <>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Додати категорію
          </>
        }
      />
    </div>
  )
}
