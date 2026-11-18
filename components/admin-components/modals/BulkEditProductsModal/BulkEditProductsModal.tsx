"use client"

import { useState } from "react"
import AdminDialog from "../AdminDialog"
import Select from "@/components/admin/Select"
import { Field, adminButton, adminInput } from "@/components/admin/ui"
import { bulkAdjustProductPrices, bulkDeleteProducts, bulkSetProductCategory, type BulkResult, type BulkTarget } from "@/lib/actions/product.actions"
import { categoryNameKey, categoryNameProblem, productsWord } from "@/lib/admin/catalog-shared"
import { cn } from "@/lib/utils"

export type BulkMode = "category" | "price" | "delete"

type Props = {
  mode: BulkMode | null
  target: BulkTarget
  count: number
  categories: { id: string; name: string; path?: string }[]
  /** A few names of the selected products, for the delete confirmation. */
  sampleNames: string[]
  onClose: () => void
  onDone: (message: string) => void
}


/**
 * Bulk actions on the products list. Each one is a single server action
 * (one updateMany/deleteMany and one cache invalidation on the server).
 */
export default function BulkEditProductsModal(props: Props) {
  if (props.mode === "category") return <CategoryDialog {...props} />
  if (props.mode === "price") return <PriceDialog {...props} />
  if (props.mode === "delete") return <DeleteDialog {...props} />
  return null
}

function useRunner(onDone: (message: string) => void) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const run = async (action: () => Promise<BulkResult>) => {
    setBusy(true)
    setError("")
    try {
      const result = await action()
      if (result.ok) onDone(result.message)
      else setError(result.error)
    } catch {
      setError("Не вдалося виконати дію. Перевірте з’єднання і спробуйте ще раз.")
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, run }
}

function CategoryDialog({ target, count, categories, onClose, onDone }: Props) {
  const [choice, setChoice] = useState<"existing" | "new">("existing")
  const [categoryId, setCategoryId] = useState("")
  const [name, setName] = useState("")
  const [mode, setMode] = useState<"add" | "replace">("add")
  const [fieldError, setFieldError] = useState("")
  const { busy, error, run } = useRunner(onDone)

  const sameName = choice === "new" ? categories.find((category) => categoryNameKey(category.name) === categoryNameKey(name)) : undefined

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (choice === "existing" && !categoryId) return setFieldError("Оберіть категорію.")
    if (choice === "new") {
      const problem = categoryNameProblem(name)
      if (problem) return setFieldError(problem)
    }
    setFieldError("")
    void run(() =>
      bulkSetProductCategory(target, {
        categoryId: choice === "existing" ? categoryId : sameName?.id,
        newCategoryName: choice === "new" && !sameName ? name : undefined,
        mode,
      }),
    )
  }

  return (
    <AdminDialog
      open
      onClose={onClose}
      busy={busy}
      title="Змінити категорію"
      description={`Для ${count} ${productsWord(count)}.`}
      footer={
        <>
          <button type="button" className={adminButton.secondary} onClick={onClose} disabled={busy}>
            Скасувати
          </button>
          <button type="submit" form="bulk-category" className={adminButton.primary} disabled={busy}>
            {busy ? "Зберігаємо…" : mode === "add" ? "Додати до категорії" : "Перенести в категорію"}
          </button>
        </>
      }
    >
      <form id="bulk-category" onSubmit={submit} className="space-y-4">
        <fieldset>
          <legend className="text-sm font-medium">Категорія</legend>
          <div className="mt-2 flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="choice" checked={choice === "existing"} onChange={() => setChoice("existing")} className="radio" />
              Наявна
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="choice" checked={choice === "new"} onChange={() => setChoice("new")} className="radio" />
              Нова
            </label>
          </div>
        </fieldset>

        {choice === "existing" ? (
          <Field label="Оберіть категорію" htmlFor="bulk-category-id" error={fieldError}>
            <Select
              id="bulk-category-id"
              value={categoryId}
              onChange={setCategoryId}
              searchable
              placeholder="Оберіть зі списку"
              searchPlaceholder="Знайти категорію"
              invalid={Boolean(fieldError)}
              options={categories.map((category) => ({ value: category.id, label: category.name, hint: category.path || undefined }))}
            />
          </Field>
        ) : (
          <Field
            label="Назва нової категорії"
            htmlFor="bulk-category-name"
            error={fieldError}
            hint={sameName ? `Така категорія вже є: товари потраплять у «${sameName.name}».` : undefined}
          >
            <input id="bulk-category-name" value={name} onChange={(event) => setName(event.target.value)} className={adminInput} maxLength={80} autoComplete="off" />
          </Field>
        )}

        <fieldset>
          <legend className="text-sm font-medium">Що зробити з поточними категоріями</legend>
          <div className="mt-2 space-y-2 text-sm">
            <label className="flex items-start gap-2">
              <input type="radio" name="mode" checked={mode === "add"} onChange={() => setMode("add")} className="radio mt-0.5" />
              <span>Залишити, а цю додати</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="radio" name="mode" checked={mode === "replace"} onChange={() => setMode("replace")} className="radio mt-0.5" />
              <span>Прибрати всі інші: товари будуть лише в цій категорії</span>
            </label>
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </form>
    </AdminDialog>
  )
}

function PriceDialog({ target, count, onClose, onDone }: Props) {
  const [direction, setDirection] = useState<"decrease" | "increase">("decrease")
  const [percent, setPercent] = useState("")
  const [fieldError, setFieldError] = useState("")
  const { busy, error, run } = useRunner(onDone)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const value = Number(percent.replace(",", "."))
    if (!Number.isFinite(value) || value <= 0) return setFieldError("Вкажіть відсоток більше нуля.")
    if (direction === "decrease" && value >= 100) return setFieldError("Зменшити можна менше ніж на 100%.")
    setFieldError("")
    void run(() => bulkAdjustProductPrices(target, { percent: value, direction }))
  }

  return (
    <AdminDialog
      open
      onClose={onClose}
      busy={busy}
      title="Змінити ціну"
      description={`Звичайна ціна і ціна зі знижкою зміняться на однаковий відсоток для ${count} ${productsWord(count)}. Ціни округлюються до гривні.`}
      footer={
        <>
          <button type="button" className={adminButton.secondary} onClick={onClose} disabled={busy}>
            Скасувати
          </button>
          <button type="submit" form="bulk-price" className={adminButton.primary} disabled={busy}>
            {busy ? "Зберігаємо…" : "Змінити ціни"}
          </button>
        </>
      }
    >
      <form id="bulk-price" onSubmit={submit} className="space-y-4">
        <fieldset>
          <legend className="text-sm font-medium">Напрям</legend>
          <div className="mt-2 flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="direction" checked={direction === "decrease"} onChange={() => setDirection("decrease")} className="radio" />
              Зменшити
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="direction" checked={direction === "increase"} onChange={() => setDirection("increase")} className="radio" />
              Збільшити
            </label>
          </div>
        </fieldset>
        <Field label="Відсоток" htmlFor="bulk-percent" error={fieldError} hint="Наприклад, 10">
          <div className="relative w-40">
            <input id="bulk-percent" inputMode="decimal" value={percent} onChange={(event) => setPercent(event.target.value)} className={cn(adminInput, "pr-8 tabular-nums")} autoComplete="off" />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">%</span>
          </div>
        </Field>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </form>
    </AdminDialog>
  )
}

function DeleteDialog({ target, count, sampleNames, onClose, onDone }: Props) {
  const [confirm, setConfirm] = useState("")
  const { busy, error, run } = useRunner(onDone)
  const needsTyping = count > 10
  const ready = !needsTyping || confirm.trim() === String(count)

  return (
    <AdminDialog
      open
      onClose={onClose}
      busy={busy}
      tone="danger"
      title={`Видалити ${count} ${productsWord(count)}?`}
      description="Товари зникнуть з магазину й адмінки назавжди. У старих замовленнях їх буде позначено як видалені."
      footer={
        <>
          <button type="button" className={adminButton.secondary} onClick={onClose} disabled={busy}>
            Скасувати
          </button>
          <button
            type="button"
            className={adminButton.dangerSolid}
            disabled={busy || !ready}
            onClick={() => void run(() => bulkDeleteProducts(target))}
          >
            {busy ? "Видаляємо…" : `Видалити ${count} ${productsWord(count)}`}
          </button>
        </>
      }
    >
      {sampleNames.length > 0 && (
        <ul className="list-disc space-y-1 pl-4 text-sm text-neutral-700">
          {sampleNames.slice(0, 5).map((name, index) => (
            <li key={index} className="break-words">
              {name}
            </li>
          ))}
          {count > Math.min(5, sampleNames.length) && <li className="text-neutral-500">і ще {count - Math.min(5, sampleNames.length)}</li>}
        </ul>
      )}
      {needsTyping && (
        <Field label={`Щоб підтвердити, введіть кількість: ${count}`} htmlFor="bulk-delete-confirm" className="mt-4">
          <input id="bulk-delete-confirm" inputMode="numeric" value={confirm} onChange={(event) => setConfirm(event.target.value)} className={cn(adminInput, "w-32 tabular-nums")} autoComplete="off" />
        </Field>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </AdminDialog>
  )
}
