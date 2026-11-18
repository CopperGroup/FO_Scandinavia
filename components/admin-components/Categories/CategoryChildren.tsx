"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { ArrowDown, ArrowUp, CornerDownRight, FolderInput, GripVertical, X } from "lucide-react"
import Select from "@/components/admin/Select"
import { EmptyState, adminButton, adminButtonSm } from "@/components/admin/ui"
import CreateCategoryButton from "./CreateCategoryButton"
import { moveCategory, reorderSubcategories } from "@/lib/actions/categories.actions"
import { productsWord } from "@/lib/admin/catalog-shared"
import { cn } from "@/lib/utils"

type Option = { id: string; name: string; path?: string }
type Item = { id: string; name: string; products: number; children: number }
type Note = { tone: "ok" | "error"; text: string; undo?: () => Promise<void> }

const inset = "px-4 sm:px-4"

/**
 * A Select that shows up already open, for actions that start with a button
 * («Перемістити…», «Вкласти наявну»). Closing it without a choice calls onCancel.
 */
function OpenedPicker({
  options,
  placeholder,
  label,
  onChoose,
  onCancel,
  className,
}: {
  options: { value: string; label: string; hint?: string }[]
  placeholder: string
  label: string
  onChoose: (value: string) => void
  onCancel: () => void
  className?: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const chosen = useRef(false)
  useEffect(() => {
    const trigger = box.current?.querySelector<HTMLButtonElement>("[role=combobox]")
    if (!trigger) return
    trigger.click()
    const watch = new MutationObserver(() => {
      if (trigger.getAttribute("aria-expanded") === "false" && !chosen.current) onCancel()
    })
    watch.observe(trigger, { attributes: true, attributeFilter: ["aria-expanded"] })
    return () => watch.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div ref={box} className={className}>
      <Select
        size="sm"
        value=""
        onChange={(value) => {
          chosen.current = true
          onChoose(value)
        }}
        searchable
        placeholder={placeholder}
        searchPlaceholder="Знайти категорію"
        aria-label={label}
        options={options}
      />
    </div>
  )
}

/**
 * «Підкатегорії» tab: one panel. Rows are dragged to reorder (↑/↓ do the same
 * from the keyboard), the name opens the subcategory, «Перемістити…» puts it
 * elsewhere. «Нова підкатегорія» and «Вкласти наявну» sit in the panel header;
 * the second opens its picker inline. Moves can be undone.
 */
export default function CategoryChildren({
  categoryId,
  categoryName,
  items,
  moveTargets,
  attachable,
  allOptions,
}: {
  categoryId: string
  categoryName: string
  items: Item[]
  /** Where a subcategory may go (the server checks the rules again). */
  moveTargets: Option[]
  /** Categories that may become a subcategory of this one (not this one, not its ancestors, not its children). */
  attachable: Option[]
  allOptions: Option[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [order, setOrder] = useState(items.map((item) => item.id))
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<Note | null>(null)
  const [attaching, setAttaching] = useState(false)
  const [moving, setMoving] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropAt, setDropAt] = useState<number | null>(null)

  useEffect(() => setOrder(items.map((item) => item.id)), [items])

  const byId = new Map(items.map((item) => [item.id, item]))
  const ordered = order.map((id) => byId.get(id)).filter((item): item is Item => Boolean(item))
  for (const item of items) if (!order.includes(item.id)) ordered.push(item)

  const run = async (action: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>, undo?: (result: unknown) => (() => Promise<void>) | undefined) => {
    setBusy(true)
    setNote(null)
    try {
      const result = await action()
      setNote(result.ok ? { tone: "ok", text: result.message, undo: undo?.(result) } : { tone: "error", text: result.error })
      if (result.ok) startTransition(() => router.refresh())
      return result.ok
    } catch {
      setNote({ tone: "error", text: "Не вдалося зберегти. Перевірте з’єднання і спробуйте ще раз." })
      return false
    } finally {
      setBusy(false)
    }
  }

  const saveOrder = async (next: string[]) => {
    const before = ordered.map((item) => item.id)
    setOrder(next)
    const ok = await run(
      () => reorderSubcategories(categoryId, next),
      () => async () => {
        await saveOrder(before)
      },
    )
    if (!ok) setOrder(before)
  }

  const shift = (index: number, delta: number) => {
    const next = ordered.map((item) => item.id)
    const [item] = next.splice(index, 1)
    next.splice(index + delta, 0, item)
    void saveOrder(next)
  }

  /** Moves a category (one of the children elsewhere, or another one in here) with undo. */
  const relocate = (id: string, parentId: string | null) =>
    run(
      () => moveCategory(id, parentId),
      (result) => {
        const moved = result as { changed: boolean; previous: { parentId: string | null; index: number } }
        if (!moved.changed) return undefined
        return async () => {
          await run(async () => {
            const back = await moveCategory(id, moved.previous.parentId, moved.previous.index)
            return back.ok ? { ok: true, message: "Переміщення скасовано." } : back
          })
        }
      },
    )

  /* Drag to reorder: the drop position is above or below the row under the pointer. */
  const onDragOver = (event: React.DragEvent, index: number) => {
    if (!dragId) return
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    const rect = event.currentTarget.getBoundingClientRect()
    const at = event.clientY < rect.top + rect.height / 2 ? index : index + 1
    if (at !== dropAt) setDropAt(at)
  }
  const onDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const id = dragId
    const at = dropAt
    setDragId(null)
    setDropAt(null)
    if (!id || at === null) return
    const current = ordered.map((item) => item.id)
    const from = current.indexOf(id)
    const next = current.filter((value) => value !== id)
    next.splice(at > from ? at - 1 : at, 0, id)
    if (next.join() !== current.join()) void saveOrder(next)
  }

  const moveOptions = (id: string) => [
    { value: "__root", label: "Верхній рівень", hint: "Окремий пункт меню каталогу" },
    ...moveTargets.filter((option) => option.id !== id && option.id !== categoryId).map((option) => ({ value: option.id, label: option.name, hint: option.path || undefined })),
  ]

  return (
    <section className="rounded-lg border border-neutral-200 bg-white">
      <div className={cn(inset, "border-b border-neutral-200 py-3")}>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h2 className="text-base font-semibold text-neutral-900">Підкатегорії</h2>
          <div className="flex flex-wrap gap-2">
          <button type="button" className={adminButton.secondary} aria-expanded={attaching} onClick={() => setAttaching((value) => !value)} disabled={busy}>
            <CornerDownRight className="h-4 w-4" aria-hidden="true" />
            <span className="sm:hidden">Вкласти</span>
            <span className="hidden sm:inline">Вкласти наявну</span>
          </button>
          <CreateCategoryButton
              categories={allOptions}
              defaultParentId={categoryId}
              label={
                <>
                  <span className="sm:hidden">Створити</span>
                  <span className="hidden sm:inline">Нова підкатегорія</span>
                </>
              }
            />
          </div>
        </div>
        <p className="mt-1 text-sm text-neutral-500">Порядок тут — порядок у меню каталогу. Перетягніть рядок, щоб змінити.</p>
      </div>

      {attaching && (
        <div className={cn(inset, "flex items-center gap-2 border-b border-neutral-200 bg-neutral-50 py-3")}>
          <OpenedPicker
            className="min-w-0 flex-1"
            placeholder={`Яку категорію вкласти в «${categoryName}»?`}
            label={`Категорія, яку вкласти в «${categoryName}»`}
            options={attachable.map((option) => ({ value: option.id, label: option.name, hint: option.path || undefined }))}
            onChoose={(value) => {
              setAttaching(false)
              void relocate(value, categoryId)
            }}
            onCancel={() => undefined}
          />
          <button type="button" className={adminButton.ghost} onClick={() => setAttaching(false)}>
            Закрити
          </button>
        </div>
      )}

      {note && (
        <div
          role={note.tone === "error" ? "alert" : "status"}
          className={cn(inset, "flex items-center gap-3 border-b py-2.5 text-sm", note.tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-neutral-200 text-neutral-700")}
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
              className="shrink-0 rounded-md px-2 py-1 font-medium text-black underline underline-offset-2 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              Скасувати
            </button>
          )}
          <button type="button" onClick={() => setNote(null)} aria-label="Закрити повідомлення" className={adminButtonSm.icon}>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {ordered.length === 0 ? (
        <div className="p-4 sm:p-4">
          <EmptyState title="Підкатегорій немає" text={`Створіть нову підкатегорію або вкладіть наявну категорію в «${categoryName}».`} />
        </div>
      ) : (
        <ul onDragLeave={(event) => !event.currentTarget.contains(event.relatedTarget as Node | null) && setDropAt(null)}>
          {ordered.map((item, index) => (
            <li
              key={item.id}
              data-child={item.id}
              draggable={!busy && moving !== item.id}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move"
                event.dataTransfer.setData("text/plain", item.name)
                requestAnimationFrame(() => setDragId(item.id))
              }}
              onDragEnd={() => {
                setDragId(null)
                setDropAt(null)
              }}
              onDragOver={(event) => onDragOver(event, index)}
              onDrop={onDrop}
              className={cn(
                inset,
                "relative flex h-14 items-center gap-2 border-b border-neutral-100 last:border-b-0",
                dragId === item.id ? "opacity-40" : "hover:bg-neutral-50",
              )}
            >
              {dropAt === index && <span aria-hidden="true" className="pointer-events-none absolute inset-x-3 -top-px h-0.5 rounded bg-black" />}
              {dropAt === index + 1 && index === ordered.length - 1 && (
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-3 -bottom-px h-0.5 rounded bg-black" />
              )}
              <GripVertical className="hidden h-4 w-4 shrink-0 cursor-grab text-neutral-400 sm:block" aria-hidden="true" />
              <div className="flex shrink-0">
                <button type="button" className={adminButtonSm.icon} disabled={busy || index === 0} onClick={() => shift(index, -1)} aria-label={`Підняти «${item.name}» вище`}>
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={adminButtonSm.icon}
                  disabled={busy || index === ordered.length - 1}
                  onClick={() => shift(index, 1)}
                  aria-label={`Опустити «${item.name}» нижче`}
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="min-w-0 flex-1 pl-1">
                <Link href={`/admin/categories?id=${item.id}`} draggable={false} className="block truncate text-sm font-medium hover:underline" data-tip={item.name}>
                  {item.name}
                </Link>
                {item.children > 0 && <p className="truncate text-xs text-neutral-500">Підкатегорій: {item.children}</p>}
              </div>
              <span className="shrink-0 text-right text-sm tabular-nums text-neutral-500">
                {item.products}
                <span className="hidden sm:inline"> {productsWord(item.products)}</span>
              </span>
              {moving === item.id ? (
                <OpenedPicker
                  className="w-44 shrink-0 sm:w-56"
                  placeholder="Куди перемістити"
                  label={`Куди перемістити «${item.name}»`}
                  options={moveOptions(item.id)}
                  onChoose={(value) => {
                    setMoving(null)
                    void relocate(item.id, value === "__root" ? null : value)
                  }}
                  onCancel={() => setMoving(null)}
                />
              ) : (
                <button
                  type="button"
                  className={cn(adminButton.ghost, "w-control shrink-0 px-0 sm:w-auto sm:px-3")}
                  onClick={() => setMoving(item.id)}
                  disabled={busy}
                  aria-label={`Перемістити «${item.name}» в іншу категорію`}
                  data-tip="Перемістити в іншу категорію"
                >
                  <FolderInput className="h-4 w-4 sm:hidden" aria-hidden="true" />
                  <span className="hidden sm:inline">Перемістити…</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
