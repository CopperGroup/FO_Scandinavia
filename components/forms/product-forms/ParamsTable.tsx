"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import * as Popover from "@radix-ui/react-popover"
import { Plus, X } from "lucide-react"
import { adminButton } from "@/components/admin/ui"
import { remScale } from "@/components/admin/Select"
import { cn } from "@/lib/utils"

export type Param = { name: string; value: string }
export type ParamSuggestion = { name: string; values: string[] }

const MAX_SUGGESTIONS = 8
const normalise = (text: string) => text.toLocaleLowerCase("uk-UA").replace(/\s+/g, " ").trim()

/**
 * A text input with a short list of suggestions under it (names or values used
 * in the catalog). Typing filters the list; arrows and Enter pick; Escape
 * closes. The admin can always type something new.
 */
function SuggestInput({
  id,
  value,
  onChange,
  suggestions,
  placeholder,
  label,
  invalid,
  onKeyDown,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder: string
  label: string
  invalid?: boolean
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
}) {
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [active, setActive] = useState(-1)
  const term = normalise(value)
  const matches = useMemo(() => {
    const list = term ? suggestions.filter((item) => normalise(item).includes(term) && normalise(item) !== term) : suggestions
    return list.slice(0, MAX_SUGGESTIONS)
  }, [suggestions, term])
  const open = focused && !dismissed && matches.length > 0
  const listId = `${id}-suggestions`

  useEffect(() => setActive(-1), [term])

  const pick = (item: string) => {
    onChange(item)
    setDismissed(true)
  }

  return (
    <Popover.Root open={open}>
      <Popover.Anchor asChild>
        <input
          id={id}
          value={value}
          placeholder={placeholder}
          aria-label={label}
          aria-invalid={invalid || undefined}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          maxLength={120}
          onFocus={() => {
            setFocused(true)
            setDismissed(false)
          }}
          onBlur={() => setFocused(false)}
          onChange={(event) => {
            onChange(event.target.value)
            setDismissed(false)
          }}
          onKeyDown={(event) => {
            if (open && event.key === "ArrowDown") {
              event.preventDefault()
              setActive((active + 1) % matches.length)
              return
            }
            if (open && event.key === "ArrowUp") {
              event.preventDefault()
              setActive((active - 1 + matches.length) % matches.length)
              return
            }
            if (open && event.key === "Enter" && active >= 0) {
              event.preventDefault()
              pick(matches[active])
              return
            }
            if (open && event.key === "Escape") {
              event.preventDefault()
              setDismissed(true)
              return
            }
            if (!open && event.key === "ArrowDown" && matches.length) {
              event.preventDefault()
              setDismissed(false)
              setActive(0)
              return
            }
            onKeyDown?.(event)
          }}
          className={cn(
            "h-10 w-full min-w-0 bg-transparent px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-black",
            invalid && "bg-red-50 placeholder:text-red-400",
          )}
        />
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          align="start"
          side="bottom"
          sideOffset={2}
          // Keeps clear of the sticky top bar + section tabs and of the save bar (px of the 16px base, scaled).
          collisionPadding={{ top: 120 * remScale(), bottom: 80 * remScale(), left: 8, right: 8 }}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onEscapeKeyDown={() => setDismissed(true)}
          onInteractOutside={() => setDismissed(true)}
          className="z-[90] w-[var(--radix-popover-trigger-width)] min-w-[11.25rem] max-w-[min(22.5rem,calc(100vw-16px))] overflow-hidden rounded-md border border-neutral-200 bg-white p-1 text-sm shadow-[0_12px_32px_-8px_rgba(0,0,0,0.25)] outline-none"
        >
          <ul id={listId} role="listbox" aria-label={`Підказки: ${label}`}>
            {matches.map((item, index) => (
              <li
                key={item}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onMouseMove={() => index !== active && setActive(index)}
                onClick={() => pick(item)}
                className={cn("flex min-h-8 cursor-pointer items-center rounded px-2 py-1", index === active && "bg-neutral-100")}
              >
                <span className="truncate">{item}</span>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

/**
 * Characteristics of a product as a small editable table (Назва, Значення).
 * Names and values used elsewhere in the catalog are suggested, so the
 * catalog filter gets one «Колір», not «колір» and «Колір ». A new row takes
 * the focus; Enter in the last value adds a row; a row is removed with its
 * button or with Backspace in an empty row.
 */
export function ParamsTable({
  params,
  onChange,
  suggestions,
  showErrors,
  idPrefix,
}: {
  params: Param[]
  onChange: (next: Param[]) => void
  suggestions: ParamSuggestion[]
  /** Highlight half-filled rows. */
  showErrors?: boolean
  /** Ids: `${idPrefix}-name-0`, `${idPrefix}-value-0`, `${idPrefix}-add`. */
  idPrefix: string
}) {
  const focusNext = useRef<string | null>(null)
  const names = useMemo(() => suggestions.map((item) => item.name), [suggestions])
  const valuesByName = useMemo(() => new Map(suggestions.map((item) => [normalise(item.name), item.values])), [suggestions])

  useEffect(() => {
    if (!focusNext.current) return
    document.getElementById(focusNext.current)?.focus()
    focusNext.current = null
  })

  const update = (index: number, patch: Partial<Param>) => onChange(params.map((item, i) => (i === index ? { ...item, ...patch } : item)))

  const add = () => {
    focusNext.current = `${idPrefix}-name-${params.length}`
    onChange([...params, { name: "", value: "" }])
  }

  const remove = (index: number) => {
    const next = params.filter((_, i) => i !== index)
    focusNext.current = next.length === 0 ? `${idPrefix}-add` : index < next.length ? `${idPrefix}-name-${index}` : `${idPrefix}-value-${index - 1}`
    onChange(next)
  }

  const used = new Set(params.map((param) => normalise(param.name)))

  return (
    <div>
      {params.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-neutral-200">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium text-neutral-500">
                <th scope="col" className="h-9 px-3 font-medium">
                  Назва
                </th>
                <th scope="col" className="h-9 border-l border-neutral-200 px-3 font-medium">
                  Значення
                </th>
                <th scope="col" className="h-9 w-11">
                  <span className="sr-only">Видалити</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {params.map((param, index) => {
                const half = showErrors && Boolean(param.name.trim()) !== Boolean(param.value.trim())
                const label = param.name.trim() || `рядок ${index + 1}`
                return (
                  <tr key={index} className="border-b border-neutral-100 last:border-b-0">
                    <td className="p-0">
                      <SuggestInput
                        id={`${idPrefix}-name-${index}`}
                        value={param.name}
                        onChange={(value) => update(index, { name: value })}
                        suggestions={names.filter((name) => !used.has(normalise(name)) || normalise(name) === normalise(param.name))}
                        placeholder="Напр. Розмір"
                        label={`Назва характеристики ${index + 1}`}
                        invalid={half && !param.name.trim()}
                        onKeyDown={(event) => {
                          if (event.key === "Backspace" && !param.name && !param.value) {
                            event.preventDefault()
                            remove(index)
                          }
                        }}
                      />
                    </td>
                    <td className="border-l border-neutral-200 p-0">
                      <SuggestInput
                        id={`${idPrefix}-value-${index}`}
                        value={param.value}
                        onChange={(value) => update(index, { value })}
                        suggestions={valuesByName.get(normalise(param.name)) ?? []}
                        placeholder="Напр. M"
                        label={`Значення характеристики ${label}`}
                        invalid={half && !param.value.trim()}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault()
                            if (index === params.length - 1 && param.name.trim() && param.value.trim()) add()
                            else document.getElementById(`${idPrefix}-name-${index + 1}`)?.focus()
                          }
                        }}
                      />
                    </td>
                    <td className="p-0 text-center">
                      <button
                        type="button"
                        className="inline-flex h-control-sm w-control-sm items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                        aria-label={`Видалити характеристику «${label}»`}
                        data-tip="Видалити рядок"
                        onClick={() => remove(index)}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-neutral-500">Характеристик ще немає. Додайте розмір, колір, склад: за ними покупці фільтрують каталог.</p>
      )}
      <button type="button" id={`${idPrefix}-add`} className={cn(adminButton.ghost, "-ml-3 mt-2")} onClick={add}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Додати характеристику
      </button>
    </div>
  )
}
