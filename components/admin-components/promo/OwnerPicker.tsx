"use client"

import { useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { Loader2, Search, UserRound } from "lucide-react"
import { adminButtonSm, adminInput } from "@/components/admin/ui"
import { findPromoOwners } from "@/lib/actions/promo-admin.actions"
import type { PromoOwner } from "@/lib/promo/admin"
import { cn } from "@/lib/utils"

const MIN_TEXT = 2
const WAIT_MS = 250

/** The chosen customer: name, e-mail, a link to their card, and (unless locked) a way to choose another. */
function Chosen({ owner, onChange, locked }: { owner: PromoOwner; onChange?: () => void; locked?: boolean }) {
  return (
    // The buttons move under the name when the two do not fit in one line (a phone).
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-neutral-300 bg-white px-3 py-2">
      <UserRound className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden="true" />
      <div className="min-w-0 flex-1 basis-48">
        <p className="truncate text-sm font-medium text-neutral-900">{owner.name || owner.email || "Покупець без імені"}</p>
        {owner.name && owner.email && <p className="truncate text-xs text-neutral-500">{owner.email}</p>}
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Link href={`/admin/clients/${owner.id}`} className={adminButtonSm.ghost} data-tip="Відкрити картку покупця в новій вкладці" target="_blank" rel="noopener noreferrer">
          Картка покупця
        </Link>
        {!locked && onChange && (
          <button type="button" className={adminButtonSm.secondary} onClick={onChange}>
            Обрати іншого
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Whose code it is: type a name, an e-mail or a phone number, pick from the
 * list with the mouse or the arrow keys and Enter. Escape closes the list.
 */
export function OwnerPicker({
  id,
  owner,
  onChange,
  locked,
  invalid,
  describedBy,
}: {
  id: string
  owner: PromoOwner | null
  onChange: (owner: PromoOwner | null) => void
  locked?: boolean
  invalid?: boolean
  describedBy?: string
}) {
  const listId = useId()
  const [text, setText] = useState("")
  const [results, setResults] = useState<PromoOwner[]>([])
  const [searched, setSearched] = useState("")
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [failed, setFailed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const focusAfterChange = useRef(false)

  // Search a moment after typing stops; an answer to an older text is dropped.
  useEffect(() => {
    const query = text.trim()
    if (query.length < MIN_TEXT) {
      setResults([])
      setSearched("")
      setLoading(false)
      return
    }
    let current = true
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const found = await findPromoOwners(query)
        if (!current) return
        setResults(found)
        setFailed(false)
      } catch {
        if (!current) return
        setResults([])
        setFailed(true)
      } finally {
        if (current) {
          setSearched(query)
          setActive(0)
          setLoading(false)
        }
      }
    }, WAIT_MS)
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [text])

  // Back to the search field after "Обрати іншого".
  useEffect(() => {
    if (!owner && focusAfterChange.current) {
      focusAfterChange.current = false
      inputRef.current?.focus()
    }
  }, [owner])

  // A click outside closes the list.
  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])

  if (owner) {
    return (
      <Chosen
        owner={owner}
        locked={locked}
        onChange={() => {
          focusAfterChange.current = true
          setText("")
          setResults([])
          onChange(null)
        }}
      />
    )
  }

  const choose = (next: PromoOwner) => {
    onChange(next)
    setOpen(false)
    setText("")
  }

  const query = text.trim()
  const showList = open && query.length >= MIN_TEXT
  const status =
    query.length < MIN_TEXT
      ? ""
      : loading || searched !== query
        ? "Шукаємо…"
        : failed
          ? "Не вдалося знайти: немає зв’язку із сервером. Спробуйте ще раз."
          : results.length === 0
            ? "Нікого не знайдено. Спробуйте частину імені, адресу e-mail або останні цифри телефону."
            : ""

  return (
    <div ref={wrapRef} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
      <input
        ref={inputRef}
        id={id}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        disabled={locked}
        placeholder="Ім’я, e-mail або телефон покупця"
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault()
            setOpen(true)
            if (results.length) setActive((index) => (index + 1) % results.length)
          } else if (event.key === "ArrowUp") {
            event.preventDefault()
            if (results.length) setActive((index) => (index - 1 + results.length) % results.length)
          } else if (event.key === "Enter") {
            // Enter picks the highlighted customer; it never submits the form from here.
            event.preventDefault()
            if (showList && results[active] && searched === query) choose(results[active])
          } else if (event.key === "Escape" && showList) {
            event.preventDefault()
            setOpen(false)
          }
        }}
        className={cn(adminInput, "pl-9 pr-9", invalid && "border-red-600")}
      />
      {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-400" aria-hidden="true" />}

      {showList && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-[0_12px_32px_-8px_rgba(0,0,0,0.25)]">
          {status ? (
            <p role="status" className="px-3 py-3 text-sm text-neutral-500">
              {status}
            </p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Знайдені покупці" className="max-h-72 overflow-y-auto p-1">
              {results.map((result, index) => (
                <li
                  key={result.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  onMouseMove={() => index !== active && setActive(index)}
                  // mousedown, not click: the input keeps its focus and the list does not close first.
                  onMouseDown={(event) => {
                    event.preventDefault()
                    choose(result)
                  }}
                  className={cn("cursor-pointer rounded px-2 py-1.5", index === active && "bg-neutral-100")}
                >
                  <span className="block truncate text-sm text-neutral-900">{result.name || "Без імені"}</span>
                  <span className="block truncate text-xs text-neutral-500">{result.email || "без e-mail"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {!showList && query.length > 0 && query.length < MIN_TEXT && <p className="mt-1 text-xs text-neutral-500">Введіть щонайменше {MIN_TEXT} символи.</p>}
    </div>
  )
}
