"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import * as Popover from "@radix-ui/react-popover"
import { Check, Plus, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { remScale, type SelectOption } from "./Select"

type Props = {
  options: SelectOption[]
  /** Chosen values (controlled). */
  value: string[]
  onChange: (next: string[]) => void
  /** Content of the button that opens the list, e.g. an icon and «Додати категорію». */
  trigger: React.ReactNode
  triggerClassName?: string
  searchPlaceholder?: string
  emptyText?: string
  /**
   * Offers «Створити „…“» when the search matches no option exactly. Called
   * with the typed text; the caller decides what a new item is.
   */
  onCreate?: (text: string) => void
  /** Why the typed text cannot be created (shown instead of the create row), or null. */
  createProblem?: (text: string) => string | null
  disabled?: boolean
  invalid?: boolean
  id?: string
  "aria-label"?: string
  "aria-describedby"?: string
}

const MAX_RENDERED = 150
/** In px of the 16px base, scaled by the root font size like <Select>. */
const MAX_HEIGHT = 420
const COMFORTABLE_BELOW = 280
const MIN_HEIGHT = 160
const EDGE = 8

const normalise = (text: string) => text.toLocaleLowerCase("uk-UA").replace(/ё/g, "е").replace(/\s+/g, " ").trim()

/**
 * Multi-choice companion of <Select>: a button opens a searchable list where
 * several options can be ticked; the list stays open until «Готово», Escape or
 * a click outside. Same look, placement rules and keyboard as <Select>
 * (arrows, Home/End, Enter or Space to tick, Escape to close), plus an optional
 * «Створити „…“» row for a search that matches nothing.
 */
export default function MultiSelect({
  options,
  value,
  onChange,
  trigger,
  triggerClassName,
  searchPlaceholder = "Пошук",
  emptyText = "Нічого не знайдено",
  onCreate,
  createProblem,
  disabled,
  invalid,
  id,
  ...aria
}: Props) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [placement, setPlacement] = useState<{ side: "bottom" | "top"; maxHeight: number }>({ side: "bottom", maxHeight: MAX_HEIGHT })

  const chosen = useMemo(() => new Set(value), [value])
  const term = normalise(query)
  const matches = useMemo(() => {
    if (!term) return options
    return options.filter((option) => normalise(option.label).includes(term) || (option.hint && normalise(option.hint).includes(term)))
  }, [options, term])
  const shown = matches.slice(0, MAX_RENDERED)
  const exact = term ? options.some((option) => normalise(option.label) === term) : true
  const problem = term && onCreate && !exact ? createProblem?.(query) ?? null : null
  const canCreate = Boolean(term && onCreate && !exact && !problem)
  // The create row is one more item for the keyboard, after the options.
  const itemCount = shown.length + (canCreate ? 1 : 0)

  useEffect(() => {
    if (!open) return
    setQuery("")
    setActive(0)
  }, [open])

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" })
  }, [active, open])

  function toggle(next: string) {
    onChange(chosen.has(next) ? value.filter((item) => item !== next) : [...value, next])
  }

  function create() {
    if (!canCreate || !onCreate) return
    onCreate(query)
    setQuery("")
    setActive(0)
  }

  function pick(index: number) {
    if (index < shown.length) {
      const option = shown[index]
      if (option && !option.disabled) toggle(option.value)
    } else if (canCreate) {
      create()
    }
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      if (itemCount) setActive((active + 1) % itemCount)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      if (itemCount) setActive((active - 1 + itemCount) % itemCount)
    } else if (event.key === "Home" && !query) {
      event.preventDefault()
      setActive(0)
    } else if (event.key === "End" && !query) {
      event.preventDefault()
      setActive(Math.max(0, itemCount - 1))
    } else if (event.key === "Enter" || (event.key === " " && !query)) {
      event.preventDefault()
      pick(active)
    }
  }

  let lastGroup: string | undefined

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next && triggerRef.current) {
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
      <Popover.Trigger
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        {...aria}
        className={triggerClassName}
      >
        {trigger}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          side={placement.side}
          sideOffset={4}
          avoidCollisions={false}
          style={{ maxHeight: placement.maxHeight }}
          className="z-[90] flex w-[min(25rem,calc(100vw-16px))] flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white text-sm text-neutral-900 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.25)] outline-none"
        >
          <div className="flex h-9 shrink-0 items-center gap-2 border-b border-neutral-200 px-3">
            <Search className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
            <input
              autoFocus
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={itemCount ? `${listId}-${active}` : undefined}
              aria-label={searchPlaceholder}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActive(0)
              }}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              autoComplete="off"
              maxLength={120}
              className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-0"
            />
          </div>

          <div ref={listRef} id={listId} role="listbox" aria-multiselectable="true" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1 outline-none">
            {shown.map((option, index) => {
              const heading = option.group && option.group !== lastGroup ? option.group : null
              lastGroup = option.group
              const isChosen = chosen.has(option.value)
              return (
                <div key={option.value}>
                  {heading && <p className="px-2 pb-1 pt-2 text-xs font-medium text-neutral-500">{heading}</p>}
                  <div
                    id={`${listId}-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={isChosen}
                    aria-disabled={option.disabled || undefined}
                    onMouseMove={() => index !== active && setActive(index)}
                    onClick={() => pick(index)}
                    className={cn(
                      "flex min-h-8 cursor-pointer items-center gap-2 rounded px-2 py-1.5",
                      index === active && "bg-neutral-100",
                      option.disabled && "cursor-not-allowed text-neutral-400",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        isChosen ? "border-black bg-black text-white" : "border-neutral-400 bg-white",
                      )}
                    >
                      {isChosen && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block break-words", isChosen && "font-medium")}>{option.label}</span>
                      {option.hint && <span className="block break-words text-xs text-neutral-500">{option.hint}</span>}
                    </span>
                  </div>
                </div>
              )
            })}

            {shown.length === 0 && !canCreate && <p className="px-2 py-3 text-neutral-500">{problem ?? emptyText}</p>}
            {shown.length > 0 && problem && <p className="px-2 py-2 text-xs text-neutral-500">{problem}</p>}

            {canCreate && (
              <div
                id={`${listId}-${shown.length}`}
                data-index={shown.length}
                role="option"
                aria-selected={false}
                onMouseMove={() => active !== shown.length && setActive(shown.length)}
                onClick={create}
                className={cn("mt-1 flex min-h-8 cursor-pointer items-center gap-2 rounded border-t border-neutral-100 px-2 py-1.5", active === shown.length && "bg-neutral-100")}
              >
                <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 break-words">
                  Створити «{query.trim().replace(/\s+/g, " ")}»
                </span>
              </div>
            )}

            {matches.length > shown.length && (
              <p className="px-2 py-2 text-xs text-neutral-500">
                Показано перші {shown.length} з {matches.length}. Уточніть пошук.
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-neutral-200 px-3 py-2">
            <span className="text-xs tabular-nums text-neutral-500">Вибрано: {value.length}</span>
            <Popover.Close className="inline-flex h-control-sm items-center rounded-md bg-black px-3 text-sm font-medium text-white hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2">
              Готово
            </Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
