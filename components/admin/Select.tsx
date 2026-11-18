"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import * as Popover from "@radix-ui/react-popover"
import { Check, ChevronDown, Plus, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type SelectOption = {
  value: string
  label: string
  /** Second line under the label (a count, an address, a path). */
  hint?: string
  /** Options with the same group are listed together under this heading. */
  group?: string
  disabled?: boolean
}

type Props = {
  options: SelectOption[]
  /** Controlled value. Leave out and use `defaultValue` inside plain forms. */
  value?: string | null
  defaultValue?: string | null
  onChange?: (value: string) => void
  placeholder?: string
  /**
   * A search box above the list. "auto" (default) shows it when the list is
   * long enough to need one; short lists stay a plain select.
   */
  searchable?: boolean | "auto"
  searchPlaceholder?: string
  /** Adds a hidden input, so the select works inside a native <form>. */
  name?: string
  /** Submits the surrounding form after a choice (URL-driven filters). */
  submitOnChange?: boolean
  /** Shows a small cross that returns to "nothing chosen" (value ""). */
  clearable?: boolean
  disabled?: boolean
  invalid?: boolean
  size?: "md" | "sm"
  id?: string
  className?: string
  emptyText?: string
  /**
   * Offers «Додати „…“» when the search matches no option exactly. Called with the typed text;
   * the caller makes it the value. The list is searchable whenever this is set.
   */
  onCreate?: (text: string) => void
  "aria-label"?: string
  "aria-labelledby"?: string
}

const AUTO_SEARCH_FROM = 9
const MAX_RENDERED = 150
/**
 * Tallest the list gets, and the room below the field that is enough to open
 * downwards, in px of the 16px base. They are scaled by the root font size, so
 * they follow the panel's unit (on a desktop 1rem is 12px: 270 and 180px).
 */
const MAX_HEIGHT = 360
const COMFORTABLE_BELOW = 240
const MIN_HEIGHT = 120
const EDGE = 8

/** Root font size / 16: how much the panel's rem is scaled on this screen. */
export function remScale(): number {
  if (typeof window === "undefined") return 1
  const size = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
  return Number.isFinite(size) && size > 0 ? size / 16 : 1
}

const normalise = (text: string) => text.toLowerCase().replace(/ё/g, "е").trim()

/**
 * The one select of the admin panel.
 *
 *  - Short lists: a plain select. Long lists: the same control with a search box.
 *  - Direction-aware: opens downwards, or upwards when there is more room above.
 *  - Space-aware: the list is never taller than the room it has, never wider
 *    than the window, and scrolls inside itself.
 *  - Keyboard: arrows, Home/End, Enter, Escape; typing jumps to a match in a
 *    plain list and filters in a searchable one.
 *  - Works controlled, or uncontrolled inside a native form (`name`).
 */
export default function Select({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = "Оберіть",
  searchable = "auto",
  searchPlaceholder = "Пошук",
  name,
  submitOnChange,
  clearable,
  disabled,
  invalid,
  size = "md",
  id,
  className,
  emptyText = "Нічого не знайдено",
  onCreate,
  ...aria
}: Props) {
  const listId = useId()
  const controlled = value !== undefined
  const [inner, setInner] = useState(defaultValue ?? "")
  const current = controlled ? value ?? "" : inner

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  // Where the list opens and how tall it may be, measured at the moment of opening.
  const [placement, setPlacement] = useState<{ side: "bottom" | "top"; maxHeight: number }>({ side: "bottom", maxHeight: MAX_HEIGHT })
  const hiddenRef = useRef<HTMLInputElement>(null)
  const typed = useRef({ text: "", at: 0 })

  const withSearch = Boolean(onCreate) || searchable === true || (searchable === "auto" && options.length >= AUTO_SEARCH_FROM)
  const selected = options.find((option) => option.value === current)

  const matches = useMemo(() => {
    const term = normalise(query)
    if (!term) return options
    return options.filter((option) => normalise(option.label).includes(term) || (option.hint && normalise(option.hint).includes(term)))
  }, [options, query])
  const shown = matches.slice(0, MAX_RENDERED)
  const newText = query.trim().replace(/\s+/g, " ")
  const canCreate = Boolean(onCreate && newText && !options.some((option) => normalise(option.label) === normalise(newText)))
  // The «Додати» row is one more item after the options.
  const itemCount = shown.length + (canCreate ? 1 : 0)

  useEffect(() => {
    if (!open) return
    setQuery("")
    const index = options.findIndex((option) => option.value === current)
    setActive(index >= 0 && index < MAX_RENDERED ? index : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" })
  }, [active, open])

  function choose(next: string) {
    if (!controlled) setInner(next)
    onChange?.(next)
    setOpen(false)
    if (submitOnChange) {
      // The hidden input gets its value on the next render; submit after that.
      requestAnimationFrame(() => hiddenRef.current?.form?.requestSubmit())
    }
  }

  function create() {
    if (!canCreate || !onCreate) return
    onCreate(newText)
    setOpen(false)
  }

  function move(delta: number) {
    if (itemCount === 0) return
    let index = active
    for (let step = 0; step < itemCount; step++) {
      index = (index + delta + itemCount) % itemCount
      if (index >= shown.length || !shown[index].disabled) break
    }
    setActive(index)
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      move(1)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      move(-1)
    } else if (event.key === "Home" && !withSearch) {
      event.preventDefault()
      setActive(0)
    } else if (event.key === "End" && !withSearch) {
      event.preventDefault()
      setActive(shown.length - 1)
    } else if (event.key === "Enter") {
      event.preventDefault()
      const option = shown[active]
      if (option && !option.disabled) choose(option.value)
      else if (!option && canCreate) create()
    } else if (!withSearch && event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      // Type-ahead in a plain list: jump to the first option starting with the typed letters.
      const now = Date.now()
      typed.current = { text: now - typed.current.at < 700 ? typed.current.text + event.key : event.key, at: now }
      const term = normalise(typed.current.text)
      const index = shown.findIndex((option) => normalise(option.label).startsWith(term))
      if (index >= 0) setActive(index)
    }
  }

  const height = size === "sm" ? "h-control-sm" : "h-control"
  let lastGroup: string | undefined

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next && triggerRef.current) {
          // Downwards whenever there is comfortable room; upwards only when the
          // space above is clearly better. The list then takes exactly the room it has.
          const rect = triggerRef.current.getBoundingClientRect()
          const below = window.innerHeight - rect.bottom - 4 - EDGE
          const above = rect.top - 4 - EDGE
          const scale = remScale()
          const side = below >= COMFORTABLE_BELOW * scale || below >= above ? "bottom" : "top"
          setPlacement({ side, maxHeight: Math.max(MIN_HEIGHT * scale, Math.min(MAX_HEIGHT * scale, side === "bottom" ? below : above)) })
        }
        setOpen(next)
      }}
    >
      {name && <input ref={hiddenRef} type="hidden" name={name} value={current} />}
      <div className={cn("relative", className)}>
        <Popover.Trigger
          ref={triggerRef}
          id={id}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          {...aria}
          className={cn(
            "flex w-full items-center gap-2 rounded-md border bg-white pl-3 text-left text-sm transition-colors focus-visible:border-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500",
            height,
            clearable && current ? "pr-14" : "pr-9",
            invalid ? "border-red-500" : "border-neutral-300 hover:border-neutral-500 data-[state=open]:border-black",
          )}
        >
          <span className={cn("min-w-0 flex-1 truncate", selected ? "text-neutral-900" : "text-neutral-500")}>{selected?.label ?? placeholder}</span>
        </Popover.Trigger>
        <ChevronDown
          aria-hidden="true"
          className={cn("pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 transition-transform", open && "rotate-180")}
        />
        {clearable && current && !disabled && (
          <button
            type="button"
            aria-label="Скинути вибір"
            data-tip="Скинути вибір"
            onClick={() => choose("")}
            className="absolute right-7 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      <Popover.Portal>
        <Popover.Content
          align="start"
          side={placement.side}
          sideOffset={4}
          avoidCollisions={false}
          style={{ maxHeight: placement.maxHeight }}
          onOpenAutoFocus={(event) => {
            // A plain list takes the focus itself; a searchable one focuses its input.
            if (!withSearch) {
              event.preventDefault()
              listRef.current?.focus()
            }
          }}
          className="z-[90] flex w-[var(--radix-popover-trigger-width)] min-w-[12.5rem] max-w-[min(27.5rem,calc(100vw-16px))] flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white text-sm text-neutral-900 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.25)] outline-none"
        >
          {withSearch && (
            <div className="flex h-9 shrink-0 items-center gap-2 border-b border-neutral-200 px-3">
              <Search className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
              <input
                autoFocus
                role="searchbox"
                aria-controls={listId}
                aria-activedescendant={active < itemCount ? `${listId}-${active}` : undefined}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setActive(0)
                }}
                onKeyDown={onKeyDown}
                placeholder={searchPlaceholder}
                autoComplete="off"
                className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-0"
              />
            </div>
          )}

          <div
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            onKeyDown={withSearch ? undefined : onKeyDown}
            aria-activedescendant={!withSearch && shown[active] ? `${listId}-${active}` : undefined}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1 outline-none"
          >
            {shown.length === 0 ? (
              !canCreate && <p className="px-2 py-3 text-neutral-500">{emptyText}</p>
            ) : (
              shown.map((option, index) => {
                const heading = option.group && option.group !== lastGroup ? option.group : null
                lastGroup = option.group
                const isSelected = option.value === current
                return (
                  <div key={option.value || `empty-${index}`}>
                    {heading && <p className="px-2 pb-1 pt-2 text-xs font-medium text-neutral-500">{heading}</p>}
                    <div
                      id={`${listId}-${index}`}
                      data-index={index}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={option.disabled || undefined}
                      onMouseMove={() => index !== active && setActive(index)}
                      onClick={() => !option.disabled && choose(option.value)}
                      className={cn(
                        "flex min-h-8 cursor-pointer items-center gap-2 rounded px-2 py-1.5",
                        index === active && "bg-neutral-100",
                        option.disabled && "cursor-not-allowed text-neutral-400",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className={cn("block break-words", isSelected && "font-semibold")}>{option.label}</span>
                        {option.hint && <span className="block break-words text-xs text-neutral-500">{option.hint}</span>}
                      </span>
                      {isSelected && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                    </div>
                  </div>
                )
              })
            )}
            {canCreate && (
              <div
                id={`${listId}-${shown.length}`}
                data-index={shown.length}
                role="option"
                aria-selected={false}
                onMouseMove={() => active !== shown.length && setActive(shown.length)}
                onClick={create}
                className={cn("flex min-h-8 cursor-pointer items-center gap-2 rounded px-2 py-1.5", shown.length > 0 && "mt-1 border-t border-neutral-100", active === shown.length && "bg-neutral-100")}
              >
                <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 break-words">Додати «{newText}»</span>
              </div>
            )}
            {matches.length > shown.length && (
              <p className="px-2 py-2 text-xs text-neutral-500">
                Показано перші {shown.length} з {matches.length}. Уточніть пошук.
              </p>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
