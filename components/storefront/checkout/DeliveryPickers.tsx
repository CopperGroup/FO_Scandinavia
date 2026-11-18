"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import * as Popover from "@radix-ui/react-popover"
import { Check, ChevronDown, Loader2, Search } from "lucide-react"
import { cn } from "@/lib/utils"

type Option = { key: string; title: string; note?: string }

type PickerProps = {
  /** Text of the closed field when nothing is chosen. */
  placeholder: string
  searchPlaceholder: string
  /** Title of the chosen option; empty when none. */
  selectedTitle: string
  selectedKey: string
  options: Option[]
  /** Called with the text typed into the search box. */
  onSearch: (text: string) => void
  onSelect: (option: Option) => void
  status: "idle" | "loading" | "error"
  onRetry: () => void
  emptyText: string
  disabled?: boolean
  invalid?: boolean
  labelledBy: string
}

/**
 * A field that opens a searchable list. Looks like every other field of the
 * checkout; the list is as wide as the field and works with the keyboard alone.
 */
function SearchPicker({
  placeholder,
  searchPlaceholder,
  selectedTitle,
  selectedKey,
  options,
  onSearch,
  onSelect,
  status,
  onRetry,
  emptyText,
  disabled,
  invalid,
  labelledBy,
}: PickerProps) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!open) return
    setText("")
    onSearch("")
    setActive(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" })
  }, [active])

  function choose(option: Option) {
    onSelect(option)
    setOpen(false)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActive((index) => Math.min(options.length - 1, index + 1))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActive((index) => Math.max(0, index - 1))
    } else if (event.key === "Enter") {
      event.preventDefault()
      if (options[active]) choose(options[active])
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        type="button"
        disabled={disabled}
        aria-labelledby={labelledBy}
        aria-invalid={invalid || undefined}
        className={cn(
          "flex h-12 w-full items-center gap-3 rounded-md border bg-white px-4 text-left text-base transition-colors focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 disabled:cursor-not-allowed disabled:bg-brand-mist disabled:text-brand-muted",
          invalid ? "border-brand-sale" : "border-brand-line hover:border-brand-ink/50 data-[state=open]:border-brand",
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", selectedTitle ? "text-brand-ink" : "text-brand-muted")}>{selectedTitle || placeholder}</span>
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-muted" aria-hidden="true" />
        ) : (
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-brand-muted transition-transform", open && "rotate-180")} aria-hidden="true" />
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-[60] w-[var(--radix-popover-trigger-width)] min-w-[260px] overflow-hidden rounded-md border border-brand-line bg-white text-brand-ink shadow-[0_18px_40px_-12px_rgba(16,34,46,0.35)] outline-none data-[state=open]:animate-sheet-up"
        >
          <div className="flex h-12 items-center gap-3 border-b border-brand-line px-4">
            <Search className="h-4 w-4 shrink-0 text-brand-muted" aria-hidden="true" />
            <input
              autoFocus
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={options[active] ? `${listId}-${active}` : undefined}
              value={text}
              onChange={(event) => {
                setText(event.target.value)
                onSearch(event.target.value)
                setActive(0)
              }}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              autoComplete="off"
              className="h-full min-w-0 flex-1 border-0 bg-transparent text-base placeholder:text-brand-muted focus:outline-none focus:ring-0"
            />
          </div>

          {status === "loading" ? (
            <p className="flex items-center gap-2 px-4 py-5 text-sm text-brand-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Завантажуємо список…
            </p>
          ) : status === "error" ? (
            <div className="px-4 py-5">
              <p className="text-sm text-brand-ink">Не вдалося завантажити список Нової пошти.</p>
              <button type="button" onClick={onRetry} className="mt-2 text-sm font-semibold text-brand hover:text-brand-deep focus-visible:outline-none focus-visible:underline">
                Спробувати ще раз
              </button>
            </div>
          ) : options.length === 0 ? (
            <p className="px-4 py-5 text-sm text-brand-muted">{emptyText}</p>
          ) : (
            <ul ref={listRef} id={listId} role="listbox" className="max-h-64 overflow-y-auto overscroll-contain p-2">
              {options.map((option, index) => {
                const selected = option.key === selectedKey
                return (
                  <li
                    key={option.key}
                    id={`${listId}-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(option)}
                    className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-3 py-2 text-base", index === active && "bg-brand-mist")}
                  >
                    <span className="min-w-0 flex-1">
                      <span className={cn("block", selected && "font-semibold")}>{option.title}</span>
                      {option.note && <span className="block text-xs text-brand-muted">{option.note}</span>}
                    </span>
                    {selected && <Check className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />}
                  </li>
                )
              })}
            </ul>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

/* ------------------------------------------------------------------ */
/* City                                                                */
/* ------------------------------------------------------------------ */

type City = { Description: string; Ref: string }

const POPULAR_CITIES = ["Київ", "Львів", "Одеса", "Дніпро", "Харків", "Вінниця", "Хмельницький", "Запоріжжя"]
const MAX_OPTIONS = 40

export function CityPicker({
  value,
  onChange,
  disabled,
  invalid,
  labelledBy,
}: {
  value: string
  onChange: (name: string, ref: string) => void
  disabled?: boolean
  invalid?: boolean
  labelledBy: string
}) {
  const [cities, setCities] = useState<City[]>([])
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading")
  const [query, setQuery] = useState("")
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setStatus("loading")
    fetch("/api/nova/cities")
      .then((response) => response.json())
      .then((result) => {
        if (cancelled) return
        if (result?.success && Array.isArray(result.data)) {
          setCities(result.data)
          setStatus("idle")
        } else setStatus("error")
      })
      .catch(() => !cancelled && setStatus("error"))
    return () => {
      cancelled = true
    }
  }, [attempt])

  const options = useMemo<Option[]>(() => {
    const term = query.trim().toLowerCase()
    const matches = term
      ? cities
          .filter((city) => city.Description.toLowerCase().includes(term))
          // Names that start with the query first, then the shorter (more exact) ones.
          .sort((a, b) => {
            const aStarts = a.Description.toLowerCase().startsWith(term) ? 0 : 1
            const bStarts = b.Description.toLowerCase().startsWith(term) ? 0 : 1
            return aStarts - bStarts || a.Description.length - b.Description.length
          })
      : POPULAR_CITIES.map((name) => cities.find((city) => city.Description === name)).filter((city): city is City => Boolean(city))
    return matches.slice(0, MAX_OPTIONS).map((city) => ({ key: city.Ref, title: city.Description }))
  }, [cities, query])

  return (
    <SearchPicker
      placeholder="Оберіть місто"
      searchPlaceholder="Почніть вводити назву"
      selectedTitle={value}
      selectedKey={cities.find((city) => city.Description === value)?.Ref ?? ""}
      options={options}
      onSearch={setQuery}
      onSelect={(option) => onChange(option.title, option.key)}
      status={status}
      onRetry={() => setAttempt((count) => count + 1)}
      emptyText="Такого міста немає в списку Нової пошти. Перевірте написання."
      disabled={disabled}
      invalid={invalid}
      labelledBy={labelledBy}
    />
  )
}

/* ------------------------------------------------------------------ */
/* Branch or parcel locker                                             */
/* ------------------------------------------------------------------ */

type Warehouse = { Description: string; Ref: string; Number: string; WarehouseIndex?: string; CategoryOfWarehouse?: string }

const isLocker = (warehouse: Warehouse) => warehouse.CategoryOfWarehouse === "Postomat" || warehouse.Description.toLowerCase().includes("поштомат")

export function WarehousePicker({
  cityRef,
  value,
  kind,
  onChange,
  disabled,
  invalid,
  labelledBy,
}: {
  cityRef: string
  /** Ref of the chosen branch. */
  value: string
  kind: "Branch" | "Postomat"
  onChange: (name: string, ref: string, index?: string) => void
  disabled?: boolean
  invalid?: boolean
  labelledBy: string
}) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle")
  const [query, setQuery] = useState("")
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!cityRef) {
      setWarehouses([])
      setStatus("idle")
      return
    }
    let cancelled = false
    setStatus("loading")
    fetch("/api/nova/warehouses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cityRef }),
    })
      .then((response) => response.json())
      .then((result) => {
        if (cancelled) return
        if (result?.success && Array.isArray(result.data)) {
          setWarehouses(result.data)
          setStatus("idle")
        } else setStatus("error")
      })
      .catch(() => !cancelled && setStatus("error"))
    return () => {
      cancelled = true
    }
  }, [cityRef, attempt])

  const ofKind = useMemo(
    () =>
      warehouses
        .filter((warehouse) => (kind === "Postomat" ? isLocker(warehouse) : !isLocker(warehouse)))
        .sort((a, b) => Number(a.Number) - Number(b.Number)),
    [warehouses, kind],
  )

  const options = useMemo<Option[]>(() => {
    const term = query.trim().toLowerCase()
    const matches = term
      ? ofKind.filter((warehouse) => String(warehouse.Number) === term || warehouse.Description.toLowerCase().includes(term))
      : ofKind
    return matches.slice(0, MAX_OPTIONS).map((warehouse) => ({
      key: warehouse.Ref,
      title: warehouse.Description,
      note: `${kind === "Postomat" ? "Поштомат" : "Відділення"} №${warehouse.Number}`,
    }))
  }, [ofKind, query, kind])

  const selected = warehouses.find((warehouse) => warehouse.Ref === value)
  const noun = kind === "Postomat" ? "поштомат" : "відділення"

  return (
    <SearchPicker
      placeholder={cityRef ? `Оберіть ${noun}` : "Спершу оберіть місто"}
      searchPlaceholder="Номер або адреса"
      selectedTitle={selected?.Description ?? ""}
      selectedKey={value}
      options={options}
      onSearch={setQuery}
      onSelect={(option) => {
        const warehouse = warehouses.find((entry) => entry.Ref === option.key)
        onChange(option.title, option.key, warehouse?.WarehouseIndex)
      }}
      status={status}
      onRetry={() => setAttempt((count) => count + 1)}
      emptyText={
        query.trim()
          ? "За цим номером чи адресою нічого немає. Спробуйте інакше."
          : kind === "Postomat"
            ? "У цьому місті немає поштоматів. Оберіть доставку у відділення."
            : "У цьому місті немає відділень."
      }
      disabled={disabled || !cityRef}
      invalid={invalid}
      labelledBy={labelledBy}
    />
  )
}
