"use client"

import { useMemo, useRef, useState } from "react"
import { ArrowLeft, ImageOff, Loader2, Search } from "lucide-react"
import Select, { type SelectOption } from "@/components/admin/Select"
import { EmptyState, Field, Pagination, Panel, Pill, SaveBar, adminButton, adminInput, adminTable, type PillTone } from "@/components/admin/ui"
import { cn } from "@/lib/utils"
import type { CategoryMode, CategoryNode, ImportOptions, MissingMode, ReviewRow, RowStatus } from "@/lib/import/types"
import type { Review } from "./ImportWizard"

const PAGE_SIZES = [25, 50, 100]

type Filter = "all" | "new" | "update" | "same" | "problems" | "excluded"

const STATUS: Record<RowStatus | "excluded", { label: string; tone: PillTone }> = {
  new: { label: "Новий", tone: "strong" },
  update: { label: "Оновиться", tone: "neutral" },
  same: { label: "Без змін", tone: "muted" },
  skip: { label: "Пропущено", tone: "problem" },
  excluded: { label: "Ви виключили", tone: "muted" },
}

const money = (value: number) => `${new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 2 }).format(value)} ₴`
const number = (value: number) => value.toLocaleString("uk-UA")

const CATEGORY_CHOICES: (SelectOption & { value: CategoryMode; text: string })[] = [
  { value: "keep", label: "Залишити у їхніх категоріях", text: "Товари, які вже є в магазині, не переїжджають. Нові потраплять у категорію з файлу." },
  { value: "feed", label: "Перенести, як у файлі", text: "Товари, які вже є в магазині, переїдуть у категорію, вказану у файлі постачальника." },
]

const MISSING_CHOICES: (SelectOption & { value: MissingMode; text: string })[] = [
  { value: "keep", label: "Залишити як є", text: "Ці товари не зміняться." },
  { value: "unavailable", label: "Зняти з продажу", text: "Отримають позначку «немає в наявності». Лишаться в магазині й у старих замовленнях." },
  { value: "delete", label: "Видалити назавжди", text: "Зникнуть із магазину. У старих замовленнях замість них буде «Видалений товар»." },
]

function CategoryTree({ nodes }: { nodes: CategoryNode[] }) {
  return (
    <ul className="space-y-2">
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="flex items-center gap-2 text-sm">
            <span className={node.isNew ? "font-medium text-neutral-900" : "text-neutral-500"}>{node.name}</span>
            {!node.isNew && <span className="text-xs text-neutral-400">вже є</span>}
          </div>
          {node.children.length > 0 && (
            <div className="ml-1 mt-1 border-l border-neutral-200 pl-3">
              <CategoryTree nodes={node.children} />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

function Thumb({ src }: { src: string }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-white">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" className="h-full w-full object-contain" />
      ) : (
        <ImageOff className="h-4 w-4 text-neutral-300" aria-label="Немає фото" />
      )}
    </span>
  )
}

function Explanation({ row }: { row: ReviewRow }) {
  if (row.status === "update" && row.changes.length > 0) return <p className="mt-1 text-xs text-neutral-500">Зміниться: {row.changes.join(", ")}</p>
  if (row.reasons.length > 0) return <p className={cn("mt-1 text-xs", row.status === "skip" ? "text-red-700" : "text-neutral-500")}>{row.reasons.join("; ")}</p>
  return null
}

export default function ReviewStep({
  review,
  options,
  excluded,
  busy,
  onToggle,
  onExcludeMany,
  onOptionsChange,
  onBack,
  onImport,
}: {
  review: Review
  options: ImportOptions
  excluded: Set<number>
  busy: boolean
  onToggle: (line: number) => void
  onExcludeMany: (lines: number[], exclude: boolean) => void
  onOptionsChange: (options: ImportOptions) => void
  onBack: () => void
  onImport: (confirmDeleteCount: number) => void
}) {
  const { summary, rows } = review
  const [filter, setFilter] = useState<Filter>("all")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const tableTop = useRef<HTMLDivElement>(null)

  const effective = (row: ReviewRow): RowStatus | "excluded" => (row.status !== "skip" && excluded.has(row.line) ? "excluded" : row.status)

  const counts = useMemo(() => {
    const result = { all: rows.length, new: 0, update: 0, same: 0, problems: 0, excluded: 0 }
    for (const row of rows) {
      const status = effective(row)
      if (status === "skip") result.problems += 1
      else if (status === "excluded") result.excluded += 1
      else result[status] += 1
    }
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, excluded])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return rows.filter((row) => {
      const status = effective(row)
      if (filter === "problems" && status !== "skip") return false
      if (filter === "excluded" && status !== "excluded") return false
      if ((filter === "new" || filter === "update" || filter === "same") && status !== filter) return false
      return !term || row.name.toLowerCase().includes(term) || row.articleNumber.toLowerCase().includes(term)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, excluded, filter, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const selectable = visible.filter((row) => row.status !== "skip")

  const willWrite = counts.new + counts.update
  const missingCount = summary.missing.count
  const missingActs = options.missing !== "keep" && missingCount > 0
  const deleting = options.missing === "delete" && missingCount > 0
  const deleteBlocked = deleting && !confirmDelete
  const nothingToDo = willWrite === 0 && !missingActs

  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "Усі", count: counts.all },
    { key: "new", label: "Нові", count: counts.new },
    { key: "update", label: "Оновляться", count: counts.update },
    { key: "same", label: "Без змін", count: counts.same },
    { key: "problems", label: "З помилками", count: counts.problems },
    { key: "excluded", label: "Виключені", count: counts.excluded },
  ]
  // The two rare groups appear only when there is something in them.
  const shownTabs = tabs.filter((tab) => (tab.key !== "problems" && tab.key !== "excluded") || tab.count > 0 || filter === tab.key)

  const show = (next: Filter) => {
    setFilter(next)
    setPage(1)
  }

  /** A new page starts at the top of the table, not somewhere in the middle of it. */
  const toPage = (next: number) => {
    setPage(next)
    tableTop.current?.scrollIntoView({ block: "start", behavior: "auto" })
  }

  const outcome: { label: string; value: number; target: Filter | null }[] = [
    { label: "Нових товарів", value: counts.new, target: "new" },
    { label: "Оновиться", value: counts.update, target: "update" },
    { label: "Без змін", value: counts.same, target: "same" },
    { label: "Не імпортується", value: counts.problems + counts.excluded, target: counts.problems > 0 ? "problems" : counts.excluded > 0 ? "excluded" : null },
  ]

  const categoryChoice = CATEGORY_CHOICES.find((choice) => choice.value === options.categories)!
  const missingChoice = MISSING_CHOICES.find((choice) => choice.value === options.missing)!
  const from = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const to = Math.min(filtered.length, currentPage * pageSize)

  /** One line that says what pressing the button will do. */
  const plan = nothingToDo
    ? "Записувати нічого: у магазині вже все так, як у файлі."
    : [
        counts.new > 0 && `нових: ${number(counts.new)}`,
        counts.update > 0 && `оновиться: ${number(counts.update)}`,
        summary.newCategoryCount > 0 && `нових категорій: ${number(summary.newCategoryCount)}`,
        missingActs && `${deleting ? "буде видалено" : "знімуться з продажу"}: ${number(missingCount)}`,
      ]
        .filter(Boolean)
        .join(", ")

  return (
    <>
      {/* What will happen, as numbers. Each one shows its products in the table below. */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200 sm:grid-cols-3 lg:grid-cols-5">
        {outcome.map(({ label, value, target }) => {
          const active = target !== null && filter === target
          const body = (
            <>
              <span className="block text-xs text-neutral-500">{label}</span>
              <span className="mt-0.5 block font-display text-xl font-semibold tabular-nums text-neutral-900">{number(value)}</span>
            </>
          )
          return target && value > 0 ? (
            <button
              key={label}
              type="button"
              onClick={() => {
                show(active ? "all" : target)
                tableTop.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
              }}
              aria-pressed={active}
              data-tip="Показати ці товари в таблиці"
              className={cn("px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-black", active ? "bg-neutral-100" : "bg-white hover:bg-neutral-50")}
            >
              {body}
            </button>
          ) : (
            <div key={label} className="bg-white px-4 py-3">
              {body}
            </div>
          )
        })}
        <div className="bg-white px-4 py-3 col-span-2 sm:col-span-2 lg:col-span-1">
          <span className="block text-xs text-neutral-500">Нових категорій</span>
          <span className="mt-0.5 flex items-baseline gap-3">
            <span className="font-display text-xl font-semibold tabular-nums text-neutral-900">{number(summary.newCategoryCount)}</span>
            {summary.newCategoryCount > 0 && (
              <button
                type="button"
                onClick={() => setShowCategories(!showCategories)}
                aria-expanded={showCategories}
                className="rounded text-sm font-medium text-neutral-700 underline decoration-neutral-300 underline-offset-4 hover:decoration-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
              >
                {showCategories ? "сховати" : "показати"}
              </button>
            )}
          </span>
        </div>
      </div>

      {showCategories && summary.newCategoryCount > 0 && (
        <Panel title="Категорії, які з’являться в магазині" description="Сірим позначені ті, що вже є: нові будуть створені всередині них.">
          <div className="max-h-64 overflow-y-auto overscroll-contain">
            <CategoryTree nodes={summary.newCategories} />
          </div>
        </Panel>
      )}

      <Panel title="Параметри імпорту" description="Два рішення, які магазин не приймає за вас. Щоб не імпортувати окремий товар, зніміть із нього позначку в таблиці нижче.">
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
          <Field label="Категорії товарів, які вже є в магазині" htmlFor="review-categories" hint={categoryChoice.text}>
            <Select
              id="review-categories"
              options={CATEGORY_CHOICES}
              value={options.categories}
              onChange={(value) => onOptionsChange({ ...options, categories: value as CategoryMode })}
              disabled={busy}
            />
          </Field>

          <Field
            label={`Товари з минулих імпортів, яких немає в цьому файлі: ${number(missingCount)}`}
            htmlFor="review-missing"
            hint={
              missingCount === 0 ? (
                "Таких товарів немає, тож вибирати нічого не треба."
              ) : (
                <>
                  {missingChoice.text} Наприклад: {summary.missing.examples.slice(0, 2).map((example) => `${example.name || "без назви"} (${example.articleNumber})`).join("; ")}
                  {missingCount > 2 ? "…" : ""}
                </>
              )
            }
          >
            <Select
              id="review-missing"
              options={MISSING_CHOICES}
              value={missingCount === 0 ? "keep" : options.missing}
              onChange={(value) => {
                setConfirmDelete(false)
                onOptionsChange({ ...options, missing: value as MissingMode })
              }}
              disabled={busy || missingCount === 0}
            />
          </Field>
        </div>

        {deleting && (
          <label id="confirm-delete" className="mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            <input type="checkbox" className="check check-danger mt-0.5" checked={confirmDelete} onChange={(event) => setConfirmDelete(event.target.checked)} />
            <span>
              Я розумію, що товарів буде видалено назавжди: <strong className="tabular-nums">{number(missingCount)}</strong>, разом із фото, описами й відгуками. Повернути їх не можна.
            </span>
          </label>
        )}
      </Panel>

      <Panel padded={false}>
        <div ref={tableTop} className="scroll-mt-20 space-y-3 px-4 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav aria-label="Які товари показати" className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {shownTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  aria-pressed={filter === tab.key}
                  onClick={() => show(tab.key)}
                  className={cn(
                    "flex h-9 items-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black",
                    filter === tab.key ? "bg-black text-white" : "text-neutral-600 hover:bg-neutral-100 hover:text-black",
                  )}
                >
                  {tab.label}
                  <span className={cn("rounded-full px-1.5 text-xs tabular-nums", filter === tab.key ? "bg-white/20" : "bg-neutral-100")}>{number(tab.count)}</span>
                </button>
              ))}
            </nav>
            <div className="relative w-full sm:w-64">
              <label htmlFor="review-search" className="sr-only">
                Пошук серед товарів із файлу
              </label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
              <input
                id="review-search"
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(1)
                }}
                placeholder="Назва або артикул"
                className={cn(adminInput, "pl-9")}
              />
            </div>
          </div>

          {filter === "problems" && summary.skipReasons.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <p className="font-medium">Ці товари не потраплять у магазин. Виправте їх у файлі постачальника і завантажте файл ще раз.</p>
              <ul className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
                {summary.skipReasons.map((entry) => (
                  <li key={entry.reason}>
                    {entry.reason}: <span className="font-medium tabular-nums">{number(entry.count)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {visible.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-neutral-500">
              <span className="tabular-nums">
                {number(from)}–{number(to)} з {number(filtered.length)}
                {pageCount > 1 ? `, сторінка ${currentPage} з ${pageCount}` : ""}
              </span>
              {selectable.length > 0 && (
                <span className="flex gap-1">
                  <button type="button" className="rounded px-2 py-1 font-medium text-neutral-700 hover:bg-neutral-100" onClick={() => onExcludeMany(selectable.map((row) => row.line), false)}>
                    Позначити всі<span className="max-sm:hidden"> на сторінці</span>
                  </button>
                  <button type="button" className="rounded px-2 py-1 font-medium text-neutral-700 hover:bg-neutral-100" onClick={() => onExcludeMany(selectable.map((row) => row.line), true)}>
                    Зняти позначки<span className="max-sm:hidden"> на сторінці</span>
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {visible.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="Таких товарів немає"
              text={query ? "За цим запитом нічого не знайдено. Перевірте назву чи артикул або покажіть усі товари." : "У цій групі порожньо. Покажіть усі товари."}
              action={
                <button
                  type="button"
                  className={adminButton.secondary}
                  onClick={() => {
                    setQuery("")
                    show("all")
                  }}
                >
                  Показати всі товари
                </button>
              }
            />
          </div>
        ) : (
          <>
            <div className={cn(adminTable.wrap, "hidden px-4 md:block")}>
              <table className={cn(adminTable.table, "min-w-[40rem]")}>
                <thead>
                  <tr className={adminTable.headRow}>
                    <th scope="col" className={cn(adminTable.th, "w-10")}>
                      <span className="sr-only">Імпортувати</span>
                    </th>
                    <th scope="col" className={adminTable.th}>Товар</th>
                    <th scope="col" className={cn(adminTable.th, "max-lg:hidden")}>Категорія</th>
                    <th scope="col" className={cn(adminTable.th, "text-right")}>Ціна</th>
                    <th scope="col" className={adminTable.th}>Що буде</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => {
                    const status = effective(row)
                    return (
                      <tr key={row.line} className={cn(adminTable.row, status === "excluded" && "opacity-60")}>
                        <td className={adminTable.td}>
                          <input
                            type="checkbox"
                            className="check"
                            checked={row.status !== "skip" && !excluded.has(row.line)}
                            disabled={row.status === "skip"}
                            onChange={() => onToggle(row.line)}
                            aria-label={`Імпортувати «${row.name || row.articleNumber}»`}
                          />
                        </td>
                        <td className={adminTable.td}>
                          <div className="flex items-center gap-3">
                            <Thumb src={row.image} />
                            <div className="min-w-0">
                              <p className="line-clamp-2 font-medium text-neutral-900">{row.name || <span className="text-red-700">Немає назви</span>}</p>
                              <p className="text-xs text-neutral-500">
                                {row.articleNumber ? `Артикул ${row.articleNumber}` : "Без артикула"}, запис № {row.line}
                              </p>
                              <p className="truncate text-xs text-neutral-500 lg:hidden">{row.category || "Без категорії"}</p>
                            </div>
                          </div>
                        </td>
                        <td className={cn(adminTable.td, "max-w-[13.75rem] text-neutral-600 max-lg:hidden")}>
                          <span className="line-clamp-2">{row.category || "Без категорії"}</span>
                        </td>
                        <td className={cn(adminTable.td, "whitespace-nowrap text-right tabular-nums")}>
                          {row.priceToShow > 0 ? <span className="font-medium">{money(row.priceToShow)}</span> : <span className="text-red-700">немає</span>}
                          {row.price > row.priceToShow && <p className="text-xs text-neutral-400 line-through">{money(row.price)}</p>}
                        </td>
                        <td className={cn(adminTable.td, "w-[15rem] max-w-[15rem] pr-0")}>
                          <Pill tone={STATUS[status].tone}>{STATUS[status].label}</Pill>
                          <Explanation row={row} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-neutral-100 px-4 md:hidden">
              {visible.map((row) => {
                const status = effective(row)
                return (
                  <li key={row.line} className={cn("flex gap-3 py-4", status === "excluded" && "opacity-60")}>
                    <input
                      type="checkbox"
                      className="check mt-4"
                      checked={row.status !== "skip" && !excluded.has(row.line)}
                      disabled={row.status === "skip"}
                      onChange={() => onToggle(row.line)}
                      aria-label={`Імпортувати «${row.name || row.articleNumber}»`}
                    />
                    <Thumb src={row.image} />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium">{row.name || <span className="text-red-700">Немає назви</span>}</p>
                      <p className="text-xs text-neutral-500">{row.articleNumber ? `Артикул ${row.articleNumber}` : "Без артикула"}</p>
                      <p className="mt-1 text-sm tabular-nums">
                        {row.priceToShow > 0 ? money(row.priceToShow) : "Немає ціни"}
                        {row.price > row.priceToShow && <span className="ml-2 text-xs text-neutral-400 line-through">{money(row.price)}</span>}
                      </p>
                      <div className="mt-1">
                        <Pill tone={STATUS[status].tone}>{STATUS[status].label}</Pill>
                      </div>
                      <Explanation row={row} />
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="border-t border-neutral-100 px-4 py-3">
              <Pagination
                page={currentPage}
                pageCount={pageCount}
                onPage={toPage}
                total={filtered.length}
                pageSize={pageSize}
                jump
                sizes={{
                  options: PAGE_SIZES,
                  onChange: (size) => {
                    setPageSize(size)
                    setPage(1)
                  },
                }}
              />
            </div>
          </>
        )}
      </Panel>

      <SaveBar
        start={
          <button type="button" className={adminButton.secondary} onClick={onBack} disabled={busy}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="max-sm:sr-only">Назад до полів</span>
          </button>
        }
        note={
          deleteBlocked ? (
            <span role="alert" className="text-red-700">
              Щоб видалити товари, поставте позначку згоди у «Параметрах імпорту».{" "}
              <a href="#confirm-delete" className="font-medium underline underline-offset-4">
                Показати
              </a>
            </span>
          ) : (
            <span>
              {!nothingToDo && <span className="max-sm:hidden">Буде записано: </span>}
              <span className="font-medium text-neutral-900">{plan}</span>
            </span>
          )
        }
      >
        <button type="button" className={deleting ? adminButton.dangerSolid : adminButton.primary} disabled={busy || nothingToDo || deleteBlocked} onClick={() => onImport(deleting ? missingCount : 0)}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {busy ? "Перевіряємо ще раз…" : deleting ? "Імпортувати й видалити" : "Імпортувати"}
        </button>
      </SaveBar>
    </>
  )
}
