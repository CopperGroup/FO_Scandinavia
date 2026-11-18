"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, ArrowUpToLine, ChevronRight, ChevronsDownUp, ChevronsUpDown, FolderX, Search, X } from "lucide-react"
import { adminButton, adminButtonSm, adminInput } from "@/components/admin/ui"
import { moveCategory } from "@/lib/actions/categories.actions"
import { productsWord } from "@/lib/admin/catalog-shared"
import { cn } from "@/lib/utils"
import CreateCategoryButton from "./CreateCategoryButton"
import {
  applyMove,
  canDrop,
  childrenMap,
  descendantIds,
  filterCounts,
  splitMatch,
  subtreeTotals,
  visibleRows,
  type CategoryNode,
  type TreeFilter,
} from "./tree-model"

const STORAGE_KEY = "admin.categories.expanded"
/** Indent per level and the left padding of the tree, in px of the 16px base (applied as rem). */
const INDENT = 20
const INSET = 4
/** Hovering a closed branch this long while dragging opens it. */
const OPEN_ON_HOVER_MS = 650
const ROOT = "__root"

type Note = { tone: "ok" | "error"; text: string; undo?: () => Promise<void> }

const FILTERS: { key: TreeFilter; label: string }[] = [
  { key: "all", label: "Усі" },
  { key: "with", label: "З товарами" },
  { key: "empty", label: "Порожні" },
]

function readExpanded(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")
    return Array.isArray(saved) ? saved.filter((value): value is string => typeof value === "string") : []
  } catch {
    return []
  }
}

function saveExpanded(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)))
  } catch {
    // Private mode: the tree just forgets what was open.
  }
}

/**
 * Left pane of the categories admin.
 *
 * - Search (matches inside closed branches and opens them) and a filter
 *   «Усі / З товарами / Порожні» with counts.
 * - «Без категорії» and «Пошкоджені» as a separate block above the tree.
 * - Rows are links (?id=…), so the choice survives a reload. Keyboard: ↑/↓
 *   move, →/← open/close (or go to the first child / the parent), Enter opens,
 *   Home/End.
 * - Drag a row onto another one to nest it, or onto «Верхній рівень»; a note
 *   with «Скасувати» undoes the move. The «Батьківська категорія» field on the
 *   «Загальне» tab does the same from the keyboard.
 */
export default function CategoryTreeNav({
  nodes: initialNodes,
  selected,
  uncategorized,
  damaged,
  options,
}: {
  nodes: CategoryNode[]
  selected: string
  uncategorized: number
  damaged: number
  /** Categories with their path, for the «Нова категорія» dialog. */
  options: { id: string; name: string; path?: string }[]
}) {
  const router = useRouter()
  const usable = useMemo(() => initialNodes.filter((node) => !node.damaged), [initialNodes])
  const [nodes, setNodes] = useState(usable)
  useEffect(() => setNodes(usable), [usable])
  const nodesRef = useRef(nodes)
  nodesRef.current = nodes

  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<TreeFilter>("all")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [ready, setReady] = useState(false)
  const [searchCollapsed, setSearchCollapsed] = useState<Set<string>>(new Set())
  const [focusId, setFocusId] = useState(selected)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [note, setNote] = useState<Note | null>(null)
  const [busy, setBusy] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const pendingFocus = useRef<string | null>(null)
  const pendingReveal = useRef<string | null>(null)
  const hoverTimer = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null)

  const totals = useMemo(() => subtreeTotals(nodes), [nodes])
  const counts = useMemo(() => filterCounts(nodes, totals), [nodes, totals])
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const parents = useMemo(() => {
    const map = childrenMap(nodes)
    return nodes.filter((node) => (map.get(node.id)?.length ?? 0) > 0).map((node) => node.id)
  }, [nodes])

  const narrowed = Boolean(query.trim()) || filter !== "all"
  const rows = useMemo(
    () => visibleRows({ nodes, expanded, query, filter, collapsedWhileNarrowed: searchCollapsed, totals }),
    [nodes, expanded, query, filter, searchCollapsed, totals],
  )
  const dragged = useMemo(() => (dragId ? new Set([dragId, ...Array.from(descendantIds(nodes, dragId))]) : null), [dragId, nodes])

  // What was open is remembered; the path to the chosen category is always open.
  useEffect(() => {
    setExpanded((current) => {
      const next = new Set(ready ? current : readExpanded())
      let cursor = byId.get(selected)?.parentId ?? null
      const seen = new Set<string>()
      while (cursor && !seen.has(cursor)) {
        seen.add(cursor)
        next.add(cursor)
        cursor = byId.get(cursor)?.parentId ?? null
      }
      return next
    })
    setReady(true)
    setFocusId(selected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, byId])

  // Bring the chosen category into view when the page opens (and when it changes from outside the tree).
  useEffect(() => {
    if (!ready || !selected) return
    const box = scrollRef.current
    const row = box?.querySelector<HTMLElement>(`[data-row="${CSS.escape(selected)}"]`)
    if (!box || !row) return
    const top = row.offsetTop
    if (top < box.scrollTop || top + row.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTop = Math.max(0, top - box.clientHeight / 2 + row.offsetHeight / 2)
    }
  }, [ready, selected])

  // Keyboard focus follows `focusId` once the row exists; a moved category is brought into view.
  useEffect(() => {
    const id = pendingFocus.current
    if (id) {
      const row = scrollRef.current?.querySelector<HTMLElement>(`[data-row="${CSS.escape(id)}"]`)
      if (row) {
        pendingFocus.current = null
        row.focus()
      }
    }
    const shown = pendingReveal.current
    if (shown) {
      const row = scrollRef.current?.querySelector<HTMLElement>(`[data-row="${CSS.escape(shown)}"]`)
      if (row) {
        pendingReveal.current = null
        row.scrollIntoView({ block: "nearest" })
      }
    }
  })

  // A note about a move goes away by itself after a while.
  useEffect(() => {
    if (!note || busy) return
    const timer = setTimeout(() => setNote(null), note.undo ? 12000 : 6000)
    return () => clearTimeout(timer)
  }, [note, busy])

  const setOpen = (id: string, open: boolean) => {
    if (narrowed) {
      setSearchCollapsed((current) => {
        const next = new Set(current)
        if (open) next.delete(id)
        else next.add(id)
        return next
      })
      return
    }
    setExpanded((current) => {
      const next = new Set(current)
      if (open) next.add(id)
      else next.delete(id)
      saveExpanded(next)
      return next
    })
  }

  const anyOpen = narrowed ? searchCollapsed.size < parents.length : expanded.size > 0
  const toggleAll = () => {
    if (narrowed) {
      setSearchCollapsed(anyOpen ? new Set(parents) : new Set())
      return
    }
    const next = anyOpen ? new Set<string>() : new Set(parents)
    saveExpanded(next)
    setExpanded(next)
  }

  const focusRow = (id: string) => {
    pendingFocus.current = id
    setFocusId(id)
  }

  const open = (id: string) => router.push(`/admin/categories?id=${id}`)

  const onTreeKeyDown = (event: React.KeyboardEvent) => {
    const target = event.target as HTMLElement
    if (rows.length === 0 || target.getAttribute("role") !== "treeitem") return
    // The row that has the focus right now, not the last one React rendered as focused.
    const current = target.dataset.row ?? focusId
    const index = Math.max(0, rows.findIndex((row) => row.node.id === current))
    const row = rows[index]
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault()
        focusRow(rows[Math.min(rows.length - 1, index + 1)].node.id)
        break
      case "ArrowUp":
        event.preventDefault()
        focusRow(rows[Math.max(0, index - 1)].node.id)
        break
      case "Home":
        event.preventDefault()
        focusRow(rows[0].node.id)
        break
      case "End":
        event.preventDefault()
        focusRow(rows[rows.length - 1].node.id)
        break
      case "ArrowRight":
        event.preventDefault()
        if (row.hasChildren && !row.open) setOpen(row.node.id, true)
        else if (row.open && rows[index + 1]) focusRow(rows[index + 1].node.id)
        break
      case "ArrowLeft":
        event.preventDefault()
        if (row.open) setOpen(row.node.id, false)
        else if (row.parentId) focusRow(row.parentId)
        break
      case "Enter":
        event.preventDefault()
        open(row.node.id)
        break
    }
  }

  /* ----------------------------- drag and drop ---------------------------- */

  const clearHover = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current.timer)
    hoverTimer.current = null
  }

  const endDrag = () => {
    clearHover()
    setDragId(null)
    setOverId(null)
  }

  const runMove = useCallback(
    async (id: string, parentId: string | null, index?: number, isUndo = false) => {
      const before = nodesRef.current
      const name = byId.get(id)?.name ?? ""
      setNodes((current) => applyMove(current, id, parentId, index))
      pendingReveal.current = id
      if (parentId) {
        setExpanded((current) => {
          const next = new Set(current).add(parentId)
          saveExpanded(next)
          return next
        })
      }
      setBusy(true)
      setNote(isUndo ? { tone: "ok", text: "Повертаємо…" } : { tone: "ok", text: `Переносимо «${name}»…` })
      try {
        const result = await moveCategory(id, parentId, index)
        if (!result.ok) {
          setNodes(before)
          setNote({ tone: "error", text: result.error })
          return
        }
        const previous = result.previous
        setNote(
          isUndo
            ? { tone: "ok", text: "Переміщення скасовано." }
            : {
                tone: "ok",
                text: result.message,
                undo: result.changed ? () => runMove(id, previous.parentId, previous.index, true) : undefined,
              },
        )
        router.refresh()
      } catch {
        setNodes(before)
        setNote({ tone: "error", text: "Не вдалося перемістити категорію. Перевірте з’єднання і спробуйте ще раз." })
      } finally {
        setBusy(false)
      }
    },
    [byId, router],
  )

  const dropOn = (targetId: string | null) => {
    const id = dragId
    endDrag()
    if (!id || busy || !canDrop(nodes, id, targetId)) return
    void runMove(id, targetId)
  }

  const dragProps = (id: string) => ({
    draggable: !busy,
    onDragStart: (event: React.DragEvent) => {
      event.dataTransfer.effectAllowed = "move"
      event.dataTransfer.setData("text/plain", byId.get(id)?.name ?? id)
      setNote(null)
      // Let the browser take the drag image before the tree re-renders.
      requestAnimationFrame(() => setDragId(id))
    },
    onDragEnd: endDrag,
    onDragOver: (event: React.DragEvent) => {
      if (!dragId) return
      if (!canDrop(nodes, dragId, id)) {
        event.dataTransfer.dropEffect = "none"
        if (overId === id) setOverId(null)
        return
      }
      event.preventDefault()
      event.dataTransfer.dropEffect = "move"
      if (overId !== id) setOverId(id)
      const row = rows.find((entry) => entry.node.id === id)
      const hasKids = (childrenMap(nodes).get(id)?.length ?? 0) > 0
      if (row && hasKids && !row.open && hoverTimer.current?.id !== id) {
        clearHover()
        hoverTimer.current = { id, timer: setTimeout(() => setOpen(id, true), OPEN_ON_HOVER_MS) }
      }
    },
    onDragLeave: (event: React.DragEvent) => {
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
      if (overId === id) setOverId(null)
      if (hoverTimer.current?.id === id) clearHover()
    },
    onDrop: (event: React.DragEvent) => {
      event.preventDefault()
      dropOn(id)
    },
  })

  /* --------------------------------- render -------------------------------- */

  const tabbable = rows.some((row) => row.node.id === focusId) ? focusId : rows[0]?.node.id
  const draggedNode = dragId ? byId.get(dragId) : null
  const rootAllowed = Boolean(dragId && canDrop(nodes, dragId, null))

  const special = (id: string, label: string, count: number, icon: React.ReactNode) => {
    const active = selected === id
    return (
      <Link
        href={`/admin/categories?id=${id}`}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-9 items-center gap-2 rounded-md px-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black",
          active ? "bg-neutral-900 text-white" : "text-neutral-800 hover:bg-white",
        )}
      >
        <span className={cn("shrink-0", active ? "text-white" : "text-neutral-500")}>{icon}</span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span
          className={cn(
            "min-w-[1.75rem] rounded-full px-2 py-0.5 text-center text-xs font-medium tabular-nums",
            active ? "bg-white/15 text-white" : count > 0 ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200" : "bg-neutral-200/70 text-neutral-600",
          )}
        >
          {count}
        </span>
      </Link>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Search and filter: they stick under the top bar on phones, where the whole page scrolls. */}
      <div className="sticky top-14 z-10 space-y-3 bg-white px-4 pb-3 pt-4 lg:static">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="category-tree-search" className="sr-only">
              Знайти категорію
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
            <input
              id="category-tree-search"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setSearchCollapsed(new Set())
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape" && query) {
                  event.preventDefault()
                  setQuery("")
                } else if (event.key === "ArrowDown" && rows[0]) {
                  event.preventDefault()
                  focusRow(rows[0].node.id)
                }
              }}
              placeholder="Знайти категорію"
              autoComplete="off"
              className={cn(adminInput, "pl-9")}
            />
          </div>
          <button
            type="button"
            onClick={toggleAll}
            disabled={parents.length === 0}
            aria-label={anyOpen ? "Згорнути все" : "Розгорнути все"}
            data-tip={anyOpen ? "Згорнути все" : "Розгорнути все"}
            className={cn(adminButton.secondary, "w-10 px-0 text-neutral-600")}
          >
            {anyOpen ? <ChevronsDownUp className="h-4 w-4" aria-hidden="true" /> : <ChevronsUpDown className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>

        <div role="group" aria-label="Показати" className="grid grid-cols-3 gap-0.5 rounded-lg bg-neutral-100 p-0.5">
          {FILTERS.map((entry) => {
            const active = filter === entry.key
            return (
              <button
                key={entry.key}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setFilter(entry.key)
                  setSearchCollapsed(new Set())
                }}
                className={cn(
                  "flex h-control-sm min-w-0 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black",
                  active ? "bg-white text-black shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "text-neutral-600 hover:text-black",
                )}
              >
                <span className="truncate">{entry.label}</span>
                <span className={cn("text-xs tabular-nums", active ? "text-neutral-500" : "text-neutral-400")}>{counts[entry.key]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* The two work queues: not categories, so they live apart from the tree. */}
      <div className="border-b border-neutral-200 px-4 pb-4">
        <div className="relative space-y-0.5 rounded-lg border border-neutral-200 bg-neutral-50 p-1">
          {special("uncategorized", "Без категорії", uncategorized, <FolderX className="h-4 w-4" aria-hidden="true" />)}
          {damaged > 0 && special("damaged", "Пошкоджені категорії", damaged, <AlertTriangle className="h-4 w-4" aria-hidden="true" />)}
          {/* While dragging, this spot becomes the «top level» drop zone: same size, nothing shifts. */}
          {dragId && (
            <div
              onDragOver={(event) => {
                if (!rootAllowed) return
                event.preventDefault()
                event.dataTransfer.dropEffect = "move"
                if (overId !== ROOT) setOverId(ROOT)
              }}
              onDragLeave={() => overId === ROOT && setOverId(null)}
              onDrop={(event) => {
                event.preventDefault()
                dropOn(null)
              }}
              className={cn(
                "absolute inset-0 z-10 flex items-center gap-2 rounded-lg border border-dashed px-3 text-sm transition-colors",
                !rootAllowed
                  ? "border-neutral-200 bg-white text-neutral-400"
                  : overId === ROOT
                    ? "border-black bg-neutral-100 text-black"
                    : "border-neutral-400 bg-white text-neutral-700",
              )}
            >
              <ArrowUpToLine className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{rootAllowed ? "Верхній рівень: відпустіть тут" : "Уже на верхньому рівні"}</span>
            </div>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
        {nodes.length === 0 ? (
          <p className="px-2 py-4 text-sm text-neutral-500">Категорій ще немає. Створіть першу кнопкою нижче.</p>
        ) : rows.length === 0 ? (
          <div className="px-2 py-6 text-sm text-neutral-500">
            <p>{query.trim() ? `Нічого не знайдено за запитом «${query.trim()}».` : filter === "empty" ? "Порожніх категорій немає." : "Таких категорій немає."}</p>
            <button
              type="button"
              className="mt-2 font-medium text-black underline underline-offset-2"
              onClick={() => {
                setQuery("")
                setFilter("all")
              }}
            >
              Показати всі категорії
            </button>
          </div>
        ) : (
          <div role="tree" aria-label="Дерево категорій" aria-describedby="category-tree-help" onKeyDown={onTreeKeyDown}>
            {rows.map((row) => {
              const { node, depth } = row
              const active = node.id === selected
              const isTarget = overId === node.id
              const dim = dragged?.has(node.id)
              const match = narrowed && !row.context ? splitMatch(node.name, query) : null
              const total = totals.get(node.id) ?? 0
              return (
                <div
                  key={node.id}
                  data-row={node.id}
                  role="treeitem"
                  aria-level={depth + 1}
                  aria-posinset={row.posInSet}
                  aria-setsize={row.setSize}
                  aria-expanded={row.hasChildren ? row.open : undefined}
                  aria-selected={active}
                  tabIndex={node.id === tabbable ? 0 : -1}
                  onFocus={(event) => event.target === event.currentTarget && setFocusId(node.id)}
                  className={cn("group relative flex h-9 items-center outline-none", dim && "opacity-40")}
                  style={{ paddingLeft: `${(INSET + depth * INDENT) / 16}rem` }}
                  {...dragProps(node.id)}
                >
                  {Array.from({ length: depth }, (_, level) => (
                    <span
                      key={level}
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 w-px bg-neutral-200"
                      style={{ left: `${(INSET + level * INDENT + 13) / 16}rem` }}
                    />
                  ))}
                  <div
                    className={cn(
                      "flex h-9 min-w-0 flex-1 items-center rounded-md pr-2 transition-colors group-focus-visible:ring-2 group-focus-visible:ring-black group-focus-visible:ring-offset-1",
                      active ? "bg-neutral-900 text-white" : isTarget ? "bg-neutral-100 ring-2 ring-inset ring-black" : "hover:bg-neutral-100",
                      dragId && !dim && !isTarget && !active && "hover:bg-transparent",
                    )}
                  >
                    {row.hasChildren ? (
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setOpen(node.id, !row.open)}
                        aria-label={row.open ? `Згорнути «${node.name}»` : `Розгорнути «${node.name}»`}
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors",
                          active ? "text-white/80 hover:bg-white/15 hover:text-white" : "text-neutral-500 hover:bg-neutral-200 hover:text-black",
                        )}
                      >
                        <ChevronRight className={cn("h-4 w-4 transition-transform", row.open && "rotate-90")} aria-hidden="true" />
                      </button>
                    ) : (
                      <span className="w-7 shrink-0" aria-hidden="true" />
                    )}
                    <Link
                      href={`/admin/categories?id=${node.id}`}
                      tabIndex={-1}
                      draggable={false}
                      aria-current={active ? "page" : undefined}
                      data-tip={`${node.name}: ${node.products} ${productsWord(node.products)}${total !== node.products ? `, разом з підкатегоріями ${total}` : ""}`}
                      className={cn("flex h-9 min-w-0 flex-1 items-center gap-2 pl-1 text-sm outline-none", row.context && !active && "text-neutral-400")}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {match ? (
                          <>
                            {match[0]}
                            <mark className={cn("rounded-sm px-px font-semibold text-inherit", active ? "bg-white/25" : "bg-neutral-200")}>{match[1]}</mark>
                            {match[2]}
                          </>
                        ) : (
                          node.name
                        )}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 text-right text-xs tabular-nums",
                          active ? "text-white/70" : node.products === 0 ? "text-neutral-300" : "text-neutral-500",
                        )}
                      >
                        {node.products}
                      </span>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <p id="category-tree-help" className="sr-only">
          Стрілки вгору і вниз переходять між категоріями, вправо і вліво розгортають і згортають, Enter відкриває. Щоб перемістити категорію з клавіатури, відкрийте її і змініть батьківську категорію.
        </p>
      </div>

      {note && (
        <div
          role={note.tone === "error" ? "alert" : "status"}
          className={cn(
            "flex items-center gap-2 border-t px-4 py-2.5 text-sm",
            note.tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-neutral-200 bg-neutral-50 text-neutral-800",
          )}
        >
          <p className="min-w-0 flex-1">{note.text}</p>
          {note.undo && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const undo = note.undo
                setNote(null)
                void undo?.()
              }}
              className="shrink-0 rounded-md px-2 py-1 font-medium text-black underline underline-offset-2 hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50"
            >
              Скасувати
            </button>
          )}
          {!busy && (
            <button type="button" onClick={() => setNote(null)} aria-label="Закрити повідомлення" className={adminButtonSm.icon}>
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      <div className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white p-4 lg:static">
        {draggedNode ? (
          <p className="flex h-10 items-center text-sm text-neutral-600">
            <span className="truncate">Перетягніть «{draggedNode.name}» на іншу категорію</span>
          </p>
        ) : (
          <CreateCategoryButton categories={options} defaultParentId="" className="w-full" />
        )}
      </div>
    </div>
  )
}
