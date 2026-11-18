"use client"

import { useEffect, useId, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Search, X } from "lucide-react"
import { suggestCatalog, type SearchSuggestions } from "@/lib/actions/storefront.actions"
import { money } from "@/lib/storefront/format"
import { cn } from "@/lib/utils"

const DEBOUNCE_MS = 180

type Option = { href: string }

/**
 * Header search: submits to the catalog, and while typing shows matching
 * products and categories. Works with the keyboard alone.
 */
export default function SearchBox({ className, inputId }: { className?: string; inputId?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const requestRef = useRef(0)

  const urlSearch = pathname === "/catalog" ? params.get("search") ?? "" : ""
  const [text, setText] = useState(urlSearch)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(-1)
  const [result, setResult] = useState<SearchSuggestions | null>(null)

  // Keep the field in sync when the shopper navigates (back button, clearing a filter chip).
  useEffect(() => {
    setText(urlSearch)
    setOpen(false)
  }, [urlSearch, pathname])

  useEffect(() => {
    const query = text.trim()
    // Suggestions are only fetched while the shopper is in the field.
    if (!open || query.length < 2) {
      if (query.length < 2) setResult(null)
      setLoading(false)
      return
    }
    const request = ++requestRef.current
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const next = await suggestCatalog(query)
        if (request === requestRef.current) setResult(next)
      } catch {
        if (request === requestRef.current) setResult(null)
      } finally {
        if (request === requestRef.current) setLoading(false)
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [text, open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  // The mobile tab bar asks the search field to take focus.
  useEffect(() => {
    const onFocusRequest = () => {
      const input = inputRef.current
      if (!input || input.offsetParent === null) return
      window.scrollTo({ top: 0, behavior: "smooth" })
      input.focus({ preventScroll: true })
    }
    window.addEventListener("storefront:focus-search", onFocusRequest)
    return () => window.removeEventListener("storefront:focus-search", onFocusRequest)
  }, [])

  const query = text.trim()
  const searchHref = `/catalog?search=${encodeURIComponent(query)}`
  const options: Option[] = result
    ? [
        ...result.categories.map((category) => ({ href: `/catalog?categories=${category.id}` })),
        ...result.products.map((product) => ({ href: `/catalog/${product.id}` })),
      ]
    : []
  const showPanel = open && query.length >= 2 && (result !== null || loading)

  function go(href: string) {
    setOpen(false)
    inputRef.current?.blur()
    router.push(href)
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (active >= 0 && options[active]) return go(options[active].href)
    go(query ? searchHref : "/catalog")
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false)
      setActive(-1)
      return
    }
    if (!showPanel || options.length === 0) return
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActive((index) => (index + 1) % options.length)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActive((index) => (index <= 0 ? options.length - 1 : index - 1))
    }
  }

  const categoryCount = result?.categories.length ?? 0

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {/*
        One row, laid out by flex: icon, field, clear button, submit button.
        Nothing is positioned by a guessed offset, so the parts cannot collide
        whatever the width of the button label.
      */}
      <form
        role="search"
        action="/catalog"
        onSubmit={onSubmit}
        className="flex h-12 items-center rounded-md bg-white pl-4 focus-within:ring-2 focus-within:ring-brand-sun"
      >
        <label htmlFor={inputId ?? listId + "-input"} className="sr-only">
          Пошук товарів
        </label>
        <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-brand-muted" />
        <input
          ref={inputRef}
          id={inputId ?? listId + "-input"}
          name="search"
          type="search"
          autoComplete="off"
          enterKeyHint="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          placeholder="Назва, бренд або артикул"
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setOpen(true)
            setActive(-1)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-full min-w-0 flex-1 appearance-none text-ellipsis border-0 bg-transparent px-3 text-base text-brand-ink placeholder:text-brand-muted focus:outline-none focus:ring-0 [&::-webkit-search-cancel-button]:hidden"
        />
        {/* Sits in the row between the field and the button, so it can never overlap either. */}
        {text && (
          <button
            type="button"
            aria-label="Очистити пошук"
            onClick={() => {
              setText("")
              setResult(null)
              inputRef.current?.focus()
            }}
            className="flex h-full w-11 shrink-0 items-center justify-center text-brand-muted transition-colors hover:text-brand-ink focus-visible:text-brand focus-visible:outline-none"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <button
          type="submit"
          className="group/find flex h-full shrink-0 items-center px-1 focus-visible:outline-none"
        >
          <span className="flex h-10 items-center rounded-sm bg-brand px-4 text-sm font-semibold text-white transition-colors group-hover/find:bg-brand-dark group-focus-visible/find:ring-2 group-focus-visible/find:ring-brand group-focus-visible/find:ring-offset-1">
            Знайти
          </span>
        </button>
      </form>

      {showPanel && (
        <div
          id={listId}
          role="listbox"
          aria-label="Підказки пошуку"
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-md border border-brand-line bg-white text-brand-ink shadow-[0_18px_40px_-12px_rgba(16,34,46,0.35)] animate-sheet-up"
        >
          {result === null ? (
            <p className="px-4 py-5 text-sm text-brand-muted">Шукаємо…</p>
          ) : result.total === 0 && categoryCount === 0 ? (
            <div className="px-4 py-5">
              <p className="text-sm font-medium">За запитом «{result.query}» нічого не знайшлося</p>
              <p className="mt-1 text-sm text-brand-muted">Спробуйте інше написання, назву бренду або артикул.</p>
            </div>
          ) : (
            <>
              {categoryCount > 0 && (
                <div className="border-b border-brand-line px-2 py-2">
                  <p className="px-2 pb-1 pt-1 text-xs font-medium text-brand-muted">Категорії</p>
                  {result.categories.map((category, index) => (
                    <Link
                      key={category.id}
                      id={`${listId}-${index}`}
                      role="option"
                      aria-selected={active === index}
                      href={`/catalog?categories=${category.id}`}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center justify-between rounded-sm px-2 py-2 text-sm hover:bg-brand-mist",
                        active === index && "bg-brand-mist",
                      )}
                    >
                      <span className="font-medium">{category.name}</span>
                      <span className="tabular-nums text-brand-muted">{category.count}</span>
                    </Link>
                  ))}
                </div>
              )}

              {result.products.length > 0 && (
                <div className="px-2 py-2">
                  <p className="px-2 pb-1 pt-1 text-xs font-medium text-brand-muted">Товари</p>
                  {result.products.map((product, productIndex) => {
                    const index = categoryCount + productIndex
                    return (
                      <Link
                        key={product.id}
                        id={`${listId}-${index}`}
                        role="option"
                        aria-selected={active === index}
                        href={`/catalog/${product.id}`}
                        onClick={() => setOpen(false)}
                        className={cn("flex items-center gap-3 rounded-sm px-2 py-2 hover:bg-brand-mist", active === index && "bg-brand-mist")}
                      >
                        <Image
                          src={product.image || "/placeholder.svg"}
                          alt=""
                          width={44}
                          height={56}
                          className="h-14 w-11 shrink-0 rounded-sm border border-brand-line bg-white object-contain"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{product.title}</span>
                          <span className="block truncate text-xs text-brand-muted">{product.vendor}</span>
                        </span>
                        <span className="shrink-0 text-right text-sm font-semibold tabular-nums">
                          {money(product.priceToShow)}
                          {product.price > product.priceToShow && (
                            <span className="block text-xs font-normal text-brand-muted line-through">{money(product.price)}</span>
                          )}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}

              {result.total > 0 && (
                <Link
                  href={searchHref}
                  onClick={() => setOpen(false)}
                  className="block border-t border-brand-line px-4 py-3 text-sm font-semibold text-brand hover:bg-brand-mist"
                >
                  Показати всі результати: {result.total}
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
