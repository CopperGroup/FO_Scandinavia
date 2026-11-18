"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, ImageOff, Loader2 } from "lucide-react"
import Select, { type SelectOption } from "@/components/admin/Select"
import { Hint, Panel, Pill, SaveBar, adminButton, adminButtonSm, adminInput } from "@/components/admin/ui"
import { cn } from "@/lib/utils"
import { TARGET_LABELS, categoryIndex, categoryPath, firstValue, mapFeed, mappingProblems } from "@/lib/import/mapping"
import { TARGET_FIELDS, type FeedSummary, type FieldMapping, type ImportItem, type ImportOptions, type TargetField } from "@/lib/import/types"

const formatBytes = (bytes: number) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} МБ` : `${Math.max(1, Math.round(bytes / 1024))} КБ`)
const money = (value: number) => `${new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 2 }).format(value)} ₴`
const plain = (text: string) => text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()

/** How a field of the supplier's file is called in the list: its name as written in the file. */
function sourceLabel(key: string): string {
  return key.startsWith("@") ? `${key.slice(1)} (у заголовку товару)` : key
}

const quiet = (text: string) => <span className="text-neutral-400">{text}</span>
const problem = (text: string) => <span className="text-red-700">{text}</span>

/** One line of the table: three columns on a wide screen, stacked on a phone. */
const ROW = "grid gap-x-4 gap-y-2 px-4 py-2 md:grid-cols-[13rem_minmax(0,16rem)_minmax(0,1fr)] md:items-center"

/**
 * Step 2: which field of the file goes into which field of a product.
 *
 * One table, read left to right: the field in the shop, the field of the file
 * it is filled from, and what the shop will get for one product of the file.
 * The last column is the preview: it shows the value the way the shop will
 * store it (a price with the currency, a category by its name, a photo as a
 * picture), and the arrows in the table heading walk through the first
 * products of the file.
 */
export default function MappingStep({
  feed,
  mapping,
  options,
  onMappingChange,
  onOptionsChange,
  onBack,
  onNext,
  busy,
  error,
}: {
  feed: FeedSummary
  mapping: FieldMapping
  options: ImportOptions
  onMappingChange: (mapping: FieldMapping) => void
  onOptionsChange: (options: ImportOptions) => void
  onBack: () => void
  onNext: () => void
  busy: boolean
  error: string | null
}) {
  const problems = mappingProblems(mapping)
  const preview = useMemo(() => mapFeed({ offers: feed.sample, categories: feed.categories }, mapping, options.defaultQuantity).slice(0, 5), [feed, mapping, options.defaultQuantity])
  const index = useMemo(() => categoryIndex(feed.categories), [feed.categories])
  const paramNames = useMemo(() => Array.from(new Set(feed.sample.flatMap((offer) => offer.params.map((param) => param.name)))).slice(0, 8), [feed.sample])
  const [shown, setShown] = useState(0)
  const position = Math.min(shown, Math.max(0, preview.length - 1))
  const item: ImportItem | undefined = preview[position]
  const raw = feed.sample[position] ?? feed.sample[0]

  const sourceOptions = useMemo<SelectOption[]>(
    () => [
      { value: "", label: "Не імпортувати", hint: "У товарах, які вже є в магазині, це поле не зміниться" },
      ...feed.fields.map((source) => {
        const example = plain(source.examples[0] ?? "").slice(0, 60)
        const share = `є у ${Math.round(source.coverage * 100)}% товарів`
        return { value: source.key, label: sourceLabel(source.key), hint: example ? `${example} (${share})` : share }
      }),
    ],
    [feed.fields],
  )

  const set = (field: TargetField, value: string) => onMappingChange({ ...mapping, [field]: value })
  const blocker = problems[0] ?? error

  /** What the shop will store in this field for the product shown. */
  const result = (field: TargetField): React.ReactNode => {
    if (!mapping[field]) return quiet(TARGET_LABELS[field].required ? "Оберіть поле у файлі" : "Не імпортується: у магазині залишиться як є")
    if (!item) return quiet("У файлі немає товарів для прикладу")
    const fromFile = raw ? plain(firstValue(raw, mapping[field])) : ""
    switch (field) {
      case "articleNumber":
        return item.articleNumber || problem("У цьому товарі немає артикула")
      case "name":
        return item.name ? <span className="font-medium text-neutral-900">{item.name}</span> : problem("У цьому товарі немає назви: він не імпортується")
      case "price":
        return item.priceToShow > 0 ? <span className="font-medium tabular-nums text-neutral-900">{money(item.priceToShow)}</span> : problem("У цьому товарі немає ціни")
      case "oldPrice":
        return item.price > item.priceToShow ? (
          <span className="tabular-nums">
            <span className="text-neutral-400 line-through">{money(item.price)}</span>
            <span className="ml-2 text-neutral-600">знижка {Math.round((1 - item.priceToShow / item.price) * 100)}%</span>
          </span>
        ) : (
          quiet("У цього товару знижки немає")
        )
      case "vendor":
        return item.vendor || quiet("У цьому товарі порожньо")
      case "category":
        return item.categoryExternalId ? categoryPath(item.categoryExternalId, index) : quiet("Без категорії")
      case "images":
        return item.images.length > 0 ? (
          <span className="flex items-center gap-2">
            {item.images.slice(0, 4).map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded border border-neutral-200 bg-white object-contain" />
            ))}
            <span className="text-neutral-600">Фото: {item.images.length}</span>
          </span>
        ) : (
          <span className="flex items-center gap-2 text-neutral-400">
            <ImageOff className="h-4 w-4" aria-hidden="true" />У цього товару немає фото
          </span>
        )
      case "description":
        return item.description ? plain(item.description).slice(0, 200) : quiet("У цьому товарі порожньо")
      case "available":
        return <Pill tone={item.isAvailable ? "ok" : "muted"}>{item.isAvailable ? "Є в наявності" : "Немає в наявності"}</Pill>
      case "quantity":
        return <span className="tabular-nums">{item.quantity} шт.</span>
      default:
        return fromFile || quiet("У цьому товарі порожньо")
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-sm">
        <p className="min-w-0 truncate text-neutral-700">
          <span className="font-medium text-neutral-900">{feed.fileName}</span>, {formatBytes(feed.bytes)}
        </p>
        <p className="tabular-nums text-neutral-500">
          Товарів: {feed.offerCount.toLocaleString("uk-UA")}, категорій: {feed.categoryCount.toLocaleString("uk-UA")}
          {feed.date ? `, файл складено ${feed.date}` : ""}
        </p>
      </div>

      {feed.warnings.length > 0 && (
        <div role="status" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            У файлі є неточності
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            {feed.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <Panel
        title="Що з файлу куди записати"
        description="Ми підібрали поля самі. Перевірте останню колонку: там видно, що отримає магазин."
        padded={false}
        action={
          preview.length > 1 ? (
            <div className="flex items-center gap-1 text-sm text-neutral-600">
              <span className="mr-1 tabular-nums">
                Приклад: товар {position + 1} з {preview.length}
              </span>
              <button type="button" className={adminButtonSm.icon} aria-label="Попередній товар із файлу" disabled={position === 0} onClick={() => setShown(position - 1)}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" className={adminButtonSm.icon} aria-label="Наступний товар із файлу" disabled={position >= preview.length - 1} onClick={() => setShown(position + 1)}>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : undefined
        }
      >
        <div className={cn(ROW, "hidden border-b border-neutral-200 text-xs font-medium text-neutral-500 md:grid")}>
          <span>Поле товару в магазині</span>
          <span>Поле у файлі</span>
          <span>Що отримає магазин</span>
        </div>
        <div className="divide-y divide-neutral-100">
          {TARGET_FIELDS.map((field) => {
            const meta = TARGET_LABELS[field]
            const value = mapping[field]
            const id = `map-${field}`
            return (
              <div key={field} className={ROW}>
                <div className="flex items-center gap-1">
                  <label htmlFor={id} className="text-sm font-medium text-neutral-900">
                    {meta.label}
                  </label>
                  <Hint text={meta.hint} label={meta.label} />
                  {meta.required && <span className="ml-1 text-xs text-neutral-500">обов’язково</span>}
                </div>
                <Select id={id} options={sourceOptions} value={value} onChange={(next) => set(field, next)} searchPlaceholder="Назва поля у файлі" invalid={meta.required && !value} />
                <div className="min-w-0 truncate text-sm text-neutral-700">{result(field)}</div>
              </div>
            )
          })}

          <div className={ROW}>
            <div className="flex items-center gap-1">
              <span id="map-params-label" className="text-sm font-medium text-neutral-900">
                Характеристики
              </span>
              <Hint text="Розмір, колір, склад та інші властивості товару. З них складаються фільтри каталогу." label="Характеристики" />
            </div>
            <label className="flex h-control items-center gap-2 text-sm text-neutral-900">
              <input
                type="checkbox"
                aria-labelledby="map-params-label"
                checked={mapping.params}
                onChange={(event) => onMappingChange({ ...mapping, params: event.target.checked })}
                className="check"
              />
              Імпортувати всі
            </label>
            <div className="min-w-0 truncate text-sm text-neutral-700">
              {!mapping.params
                ? quiet("Не імпортуються: у магазині залишаться як є")
                : item && item.params.length > 0
                  ? item.params.map((param) => `${param.name}: ${param.value}`).join(" · ")
                  : paramNames.length > 0
                    ? `У файлі є: ${paramNames.join(", ")}`
                    : quiet("У цьому товарі характеристик немає")}
            </div>
          </div>

          <div className={ROW}>
            <div className="flex items-center gap-1">
              <label htmlFor="default-quantity" className="text-sm font-medium text-neutral-900">
                Кількість без даних
              </label>
              <Hint text="Скільки штук записати товару, для якого у файлі немає кількості. Товар без кількості не можна купити." label="Кількість без даних" />
            </div>
            <input
              id="default-quantity"
              type="number"
              min={0}
              max={100000}
              value={options.defaultQuantity}
              onChange={(event) => onOptionsChange({ ...options, defaultQuantity: Math.max(0, Number(event.target.value) || 0) })}
              className={cn(adminInput, "w-28 tabular-nums")}
            />
            <p className="text-sm text-neutral-600">Стільки отримає товар, який є в наявності. Товар, якого немає, отримає 0.</p>
          </div>
        </div>
      </Panel>

      <SaveBar
        start={
          <button type="button" className={adminButton.secondary} onClick={onBack} disabled={busy} aria-label="Інший файл">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="max-sm:sr-only">Інший файл</span>
          </button>
        }
        note={
          blocker ? (
            <span role="alert" className="text-red-700">
              {blocker}
            </span>
          ) : (
            <span className="max-sm:hidden">Далі магазин порівняє файл зі своїми товарами. Нічого ще не запишеться.</span>
          )
        }
      >
        <button type="button" className={adminButton.primary} onClick={onNext} disabled={busy || problems.length > 0}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {busy ? "Порівнюємо з магазином…" : "Далі: перевірити зміни"}
        </button>
      </SaveBar>
    </>
  )
}
