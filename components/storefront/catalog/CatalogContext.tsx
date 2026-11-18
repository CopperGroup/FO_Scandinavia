"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { catalogHref, flattenParams } from "@/lib/storefront/catalog-url"
import { cn } from "@/lib/utils"

type CatalogState = {
  /** Current catalog query, flattened from the URL. */
  params: Record<string, string>
  /** A change of filters is on its way; the previous results stay on screen meanwhile. */
  pending: boolean
  /** Applies changes to the query (null removes a key). */
  navigate: (changes: Record<string, string | null>) => void
  /** Opens a ready-made catalog URL the same way. */
  go: (href: string) => void
}

const CatalogContext = createContext<CatalogState | null>(null)

export function useCatalog(): CatalogState {
  const value = useContext(CatalogContext)
  if (!value) throw new Error("useCatalog must be used inside <CatalogProvider>")
  return value
}

/** Id of the element whose top edge is where the results begin. */
export const RESULTS_ID = "catalog-results"

/** Where sticky content starts in the window, in pixels, for the given header state. */
function stickyLine(state: "current" | "expanded"): number {
  const styles = getComputedStyle(document.documentElement)
  const px = (name: string) => parseFloat(styles.getPropertyValue(name)) || 0
  // The header variables are plain pixel values; only their sum is a calc().
  const expanded = window.matchMedia("(min-width: 1024px)").matches ? px("--bar-h") + px("--rule-h") + px("--nav-h") : 0
  if (state === "expanded") return expanded
  return document.documentElement.dataset.header === "compact" ? px("--nav-h") : expanded
}

/**
 * One navigation state for the whole catalog page.
 *
 * Every filter, chip, category and page link goes through the same transition,
 * so the page behaves the same whatever was clicked:
 *  - the URL changes without the browser jumping to the top;
 *  - the old results stay in place, dimmed, until the new ones are ready,
 *    so nothing collapses and re-expands;
 *  - if the shopper had scrolled past the start of the results, the window is
 *    brought back to exactly that start, so the new results are read from the top
 *    and a shorter list can never leave the window stranded below the footer.
 */
export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const query = searchParams.toString()
  const params = useMemo(() => flattenParams(new URLSearchParams(query)), [query])

  const go = useCallback(
    (href: string) => {
      startTransition(() => router.push(href, { scroll: false }))
    },
    [router],
  )
  const navigate = useCallback((changes: Record<string, string | null>) => go(catalogHref(params, changes)), [go, params])

  // Back and forward restore the scroll position themselves; leave those alone.
  const historyMove = useRef(false)
  useEffect(() => {
    const onPopState = () => {
      historyMove.current = true
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (historyMove.current) {
      historyMove.current = false
      return
    }
    const results = document.getElementById(RESULTS_ID)
    if (!results) return
    const top = results.getBoundingClientRect().top
    if (top >= stickyLine("current") - 1) return
    // Scrolling up reveals the full header, so aim below the expanded one.
    window.scrollTo({ top: Math.max(0, window.scrollY + top - stickyLine("expanded")), behavior: "instant" as ScrollBehavior })
  }, [query])

  const value = useMemo(() => ({ params, pending, navigate, go }), [params, pending, navigate, go])
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

type CatalogLinkProps = Omit<React.ComponentProps<typeof Link>, "href"> & { href: string }

/**
 * A real link (crawlable, opens in a new tab) that, on a plain click, moves
 * through the shared catalog transition instead of a hard scroll-to-top navigation.
 */
export function CatalogLink({ href, onClick, children, ...props }: CatalogLinkProps) {
  const { go } = useCatalog()
  return (
    <Link
      {...props}
      href={href}
      scroll={false}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        go(href)
      }}
    >
      {children}
    </Link>
  )
}

/** The product grid and pagination: kept on screen and dimmed while the next results load. */
export function ResultsRegion({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useCatalog()
  return (
    <div aria-busy={pending} className={cn("transition-opacity duration-150", pending && "pointer-events-none opacity-50", className)}>
      {children}
    </div>
  )
}

/** A hairline that runs under the toolbar while results are loading. */
export function PendingBar() {
  const { pending } = useCatalog()
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 -bottom-px h-0.5 origin-left bg-brand transition-opacity duration-200",
        pending ? "animate-pulse opacity-100" : "opacity-0",
      )}
    />
  )
}
