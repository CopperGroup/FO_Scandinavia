"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import AdminDialog from "@/components/admin-components/modals/AdminDialog"
import Select from "@/components/admin/Select"
import { Field, Panel, SaveBar, adminButton, adminInput, adminTextarea } from "@/components/admin/ui"
import { changeCategoryName, changeCategoryText, deleteCategory, setCategoryDiscount, setCategoryParent } from "@/lib/actions/categories.actions"
import { categoryNameKey, categoryNameProblem, productsWord } from "@/lib/admin/catalog-shared"
import { TEXT_MAX, pageText } from "@/lib/menu"
import { cn } from "@/lib/utils"
import { PaneBody } from "./Pane"

type Option = { id: string; name: string; path?: string }

type Props = {
  category: {
    id: string
    name: string
    parentId: string | null
    products: number
    averageDiscount: number
    children: number
    /** The text under the products on the category's page in the shop. */
    text: string
  }
  /** Possible parents: every category except this one and its subcategories. */
  parentOptions: Option[]
  /** Possible targets for its products when it is deleted. */
  allOptions: Option[]
}

type Status = { tone: "ok" | "error"; text: string } | null

/**
 * «Загальне» tab: name and parent side by side, the text for the category's
 * page in the shop, the discount for the whole category, deletion as a quiet
 * panel at the end. Saving name, parent and text goes through the action bar
 * at the bottom of the pane.
 */
export default function CategoryGeneralForm({ category, parentOptions, allOptions }: Props) {
  const router = useRouter()
  const [name, setName] = useState(category.name)
  const [parentId, setParentId] = useState(category.parentId ?? "")
  const [text, setText] = useState(category.text)
  const [nameError, setNameError] = useState("")
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const [saved, setSaved] = useState(false)

  const [discount, setDiscount] = useState(category.averageDiscount ? String(category.averageDiscount) : "")
  const [discountError, setDiscountError] = useState("")
  const [discountConfirm, setDiscountConfirm] = useState<number | null>(null)
  const [discountBusy, setDiscountBusy] = useState(false)
  const [discountStatus, setDiscountStatus] = useState<Status>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteMode, setDeleteMode] = useState<"keep" | "move" | "remove">("keep")
  const [deleteTarget, setDeleteTarget] = useState("")
  const [confirmName, setConfirmName] = useState("")
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  // The category can change outside this form (a move in the tree, a save):
  // follow it unless the admin has an unsaved edit of that field.
  const last = useRef({ name: category.name, parentId: category.parentId ?? "", text: category.text })
  useEffect(() => {
    if (name === last.current.name) setName(category.name)
    if (parentId === last.current.parentId) setParentId(category.parentId ?? "")
    if (text === last.current.text) setText(category.text)
    last.current = { name: category.name, parentId: category.parentId ?? "", text: category.text }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category.name, category.parentId, category.text])

  const textChanged = pageText(text) !== category.text
  const dirty = name.trim() !== category.name || (parentId || null) !== category.parentId || textChanged

  // Warn before leaving with unsaved changes: closing the tab, or a link inside the admin.
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    const guard = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return
      const link = (event.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null
      if (!link || link.target === "_blank" || link.origin !== window.location.origin) return
      if (!window.confirm("Є незбережені зміни в цій категорії. Піти без збереження?")) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    window.addEventListener("beforeunload", warn)
    document.addEventListener("click", guard, true)
    return () => {
      window.removeEventListener("beforeunload", warn)
      document.removeEventListener("click", guard, true)
    }
  }, [dirty])

  const reset = () => {
    setName(category.name)
    setParentId(category.parentId ?? "")
    setText(category.text)
    setNameError("")
    setStatus(null)
  }

  const save = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!dirty || saving) return
    const problem = categoryNameProblem(name)
    const clash = allOptions.find((option) => option.id !== category.id && categoryNameKey(option.name) === categoryNameKey(name))
    if (problem || clash) {
      setNameError(problem ?? `Категорія «${clash!.name}» уже існує. Оберіть іншу назву.`)
      document.getElementById("category-name")?.focus()
      return
    }
    setNameError("")
    setSaving(true)
    setStatus(null)
    try {
      if (name.trim() !== category.name) {
        const result = await changeCategoryName({ categoryId: category.id, newName: name })
        if (!result.ok) {
          setNameError(result.error)
          return
        }
      }
      if ((parentId || null) !== category.parentId) {
        const result = await setCategoryParent(category.id, parentId || null)
        if (!result.ok) {
          setStatus({ tone: "error", text: result.error })
          return
        }
      }
      if (textChanged) {
        const result = await changeCategoryText({ categoryId: category.id, text })
        if (!result.ok) {
          setStatus({ tone: "error", text: result.error })
          return
        }
        // Show the text as it was stored: single spaces, one empty line between paragraphs.
        setText(pageText(text))
      }
      setSaved(true)
      router.refresh()
    } catch {
      setStatus({ tone: "error", text: "Не вдалося зберегти. Перевірте з’єднання і спробуйте ще раз." })
    } finally {
      setSaving(false)
    }
  }

  const askDiscount = (event: React.FormEvent) => {
    event.preventDefault()
    const value = Number((discount.trim() || "0").replace(",", "."))
    if (!Number.isFinite(value) || value < 0 || value >= 100) return setDiscountError("Вкажіть число від 0 до 99.")
    setDiscountError("")
    setDiscountStatus(null)
    setDiscountConfirm(Math.round(value * 100) / 100)
  }

  const applyDiscount = async () => {
    if (discountConfirm === null) return
    setDiscountBusy(true)
    try {
      const result = await setCategoryDiscount({ categoryId: category.id, percentage: discountConfirm })
      setDiscountStatus(result.ok ? { tone: "ok", text: result.message } : { tone: "error", text: result.error })
      if (result.ok) router.refresh()
    } catch {
      setDiscountStatus({ tone: "error", text: "Не вдалося змінити ціни. Спробуйте ще раз." })
    } finally {
      setDiscountBusy(false)
      setDiscountConfirm(null)
    }
  }

  const remove = async () => {
    if (deleteMode === "move" && !deleteTarget) return setDeleteError("Оберіть категорію, куди перенести товари.")
    setDeleteBusy(true)
    setDeleteError("")
    try {
      const result = await deleteCategory({
        categoryId: category.id,
        removeProducts: deleteMode === "remove",
        moveToCategoryId: deleteMode === "move" ? deleteTarget : undefined,
      })
      if (!result.ok) return setDeleteError(result.error)
      setDeleteOpen(false)
      router.push("/admin/categories")
      router.refresh()
    } catch {
      setDeleteError("Не вдалося видалити. Спробуйте ще раз.")
    } finally {
      setDeleteBusy(false)
    }
  }

  const targets = allOptions.filter((option) => option.id !== category.id)
  const count = `${category.products} ${productsWord(category.products)}`

  const note = status ? (
    <span role={status.tone === "error" ? "alert" : "status"} className={status.tone === "error" ? "text-red-700" : undefined}>
      {status.text}
    </span>
  ) : nameError ? (
    <span className="text-red-700">Виправте назву, щоб зберегти.</span>
  ) : dirty ? (
    "Є незбережені зміни"
  ) : null

  return (
    <>
      <PaneBody>
        <Panel title="Назва і місце в каталозі">
          <form id="category-general" onSubmit={save} className="grid gap-4 md:grid-cols-2">
            <Field label="Назва" htmlFor="category-name" error={nameError} hint="Так категорію бачать покупці в меню каталогу.">
              <input
                id="category-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setNameError("")
                  setStatus(null)
                  setSaved(false)
                }}
                className={cn(adminInput, nameError && "border-red-600")}
                maxLength={80}
                autoComplete="off"
                aria-invalid={Boolean(nameError)}
              />
            </Field>
            <Field label="Батьківська категорія" htmlFor="category-parent" hint="Або перетягніть категорію в дереві ліворуч.">
              <Select
                id="category-parent"
                value={parentId}
                onChange={(value) => {
                  setParentId(value)
                  setStatus(null)
                  setSaved(false)
                }}
                searchable
                searchPlaceholder="Знайти категорію"
                options={[{ value: "", label: "Верхній рівень", hint: "Окремий пункт меню каталогу" }, ...parentOptions.map((option) => ({ value: option.id, label: option.name, hint: option.path || undefined }))]}
              />
            </Field>
            <Field
              label="Текст на сторінці категорії"
              htmlFor="category-text"
              optional
              className="md:col-span-2"
              tip="Кілька речень під товарами на сторінці категорії в магазині: що тут продається, з чого, для кого, які бренди. Його читають покупці та пошукові системи: сторінка з власним текстом частіше з’являється в пошуку. Пишіть своїми словами, не копіюйте з інших сайтів."
              hint={`До ${TEXT_MAX} знаків. Порожній рядок починає новий абзац. Без тексту сторінка працює як і раніше.`}
            >
              <textarea
                id="category-text"
                value={text}
                onChange={(event) => {
                  setText(event.target.value)
                  setStatus(null)
                  setSaved(false)
                }}
                className={cn(adminTextarea, "min-h-32")}
                maxLength={TEXT_MAX}
              />
            </Field>
          </form>
        </Panel>

        {category.products > 0 && (
          <Panel title="Знижка на всі товари категорії" description={`Ціна зі знижкою кожного з ${count} стане звичайною ціною мінус відсоток. 0 прибирає знижку.`}>
            <form onSubmit={askDiscount} className="flex flex-wrap items-start gap-3">
              <div>
                <label htmlFor="category-discount" className="sr-only">
                  Знижка, відсотків
                </label>
                <div className="relative w-28">
                  <input
                    id="category-discount"
                    inputMode="decimal"
                    value={discount}
                    onChange={(event) => {
                      setDiscount(event.target.value)
                      setDiscountError("")
                    }}
                    placeholder="0"
                    className={cn(adminInput, "pr-8 tabular-nums", discountError && "border-red-600")}
                    autoComplete="off"
                    aria-invalid={Boolean(discountError)}
                    aria-describedby="category-discount-hint"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">%</span>
                </div>
              </div>
              <button type="submit" className={adminButton.secondary} disabled={discountBusy || category.products === 0}>
                {discountBusy ? "Змінюємо ціни…" : "Застосувати знижку"}
              </button>
              <p id="category-discount-hint" className={cn("min-w-0 flex-1 basis-56 self-center text-sm", discountError || discountStatus?.tone === "error" ? "text-red-700" : "text-neutral-500")} role={discountError || discountStatus ? "status" : undefined}>
                {discountError ||
                  discountStatus?.text ||
                  (category.averageDiscount ? `Зараз у середньому −${category.averageDiscount}%.` : "Зараз товари без знижки.")}
              </p>
            </form>
          </Panel>
        )}

        <section className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg border border-neutral-200 px-4 py-3">
          <div className="min-w-0 flex-1 basis-64">
            <h2 className="text-sm font-medium text-neutral-900">Видалити категорію</h2>
            <p className="mt-0.5 text-sm text-neutral-500">
              Ви оберете, що буде з {count}
              {category.children ? `; підкатегорії (${category.children}) переїдуть на рівень вище` : ""}.
            </p>
          </div>
          <button type="button" className={adminButton.danger} onClick={() => setDeleteOpen(true)}>
            Видалити категорію…
          </button>
        </section>
      </PaneBody>

      <SaveBar
        flush
        start={
          <button type="button" className={adminButton.ghost} onClick={reset} disabled={!dirty || saving}>
            Скасувати зміни
          </button>
        }
        note={note}
      >
        <button type="submit" form="category-general" className={cn(adminButton.primary, "min-w-[8.25rem]")} disabled={saving || !dirty}>
          <span role={saved && !dirty ? "status" : undefined}>{saving ? "Зберігаємо…" : dirty ? "Зберегти" : saved ? "Збережено" : "Змін немає"}</span>
        </button>
      </SaveBar>

      <AdminDialog
        open={discountConfirm !== null}
        onClose={() => setDiscountConfirm(null)}
        busy={discountBusy}
        title={discountConfirm ? `Знижка ${discountConfirm}% на ${count}?` : `Прибрати знижку з ${count}?`}
        description={
          discountConfirm
            ? `Ціна зі знижкою кожного товару стане звичайною ціною мінус ${discountConfirm}%. Знижки, задані окремим товарам, буде замінено.`
            : "Ціна зі знижкою кожного товару стане рівною звичайній ціні."
        }
        footer={
          <>
            <button type="button" className={adminButton.secondary} onClick={() => setDiscountConfirm(null)} disabled={discountBusy}>
              Скасувати
            </button>
            <button type="button" className={adminButton.primary} onClick={() => void applyDiscount()} disabled={discountBusy}>
              {discountBusy ? "Змінюємо ціни…" : "Змінити ціни"}
            </button>
          </>
        }
      />

      <AdminDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        busy={deleteBusy}
        tone="danger"
        title={`Видалити «${category.name}»?`}
        description={category.children ? `Її підкатегорії (${category.children}) переїдуть на рівень вище.` : undefined}
        footer={
          <>
            <button type="button" className={adminButton.secondary} onClick={() => setDeleteOpen(false)} disabled={deleteBusy}>
              Скасувати
            </button>
            <button type="button" className={adminButton.dangerSolid} disabled={deleteBusy || confirmName.trim() !== category.name.trim()} onClick={() => void remove()}>
              {deleteBusy ? "Видаляємо…" : deleteMode === "remove" ? "Видалити категорію і товари" : "Видалити категорію"}
            </button>
          </>
        }
      >
        <fieldset className="space-y-2 text-sm">
          <legend className="mb-2 font-medium">Що зробити з {count}</legend>
          <label className="flex items-start gap-2">
            <input type="radio" name="delete-mode" checked={deleteMode === "keep"} onChange={() => setDeleteMode("keep")} className="radio mt-0.5" />
            <span>Залишити: вони просто вийдуть з цієї категорії</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="radio" name="delete-mode" checked={deleteMode === "move"} onChange={() => setDeleteMode("move")} className="radio mt-0.5" />
            <span>Перенести в іншу категорію</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="radio" name="delete-mode" checked={deleteMode === "remove"} onChange={() => setDeleteMode("remove")} className="radio check-danger mt-0.5" />
            <span className="text-red-700">Видалити товари назавжди</span>
          </label>
        </fieldset>
        {deleteMode === "move" && (
          <Field label="Куди перенести" htmlFor="delete-target" className="mt-4">
            <Select
              id="delete-target"
              value={deleteTarget}
              onChange={setDeleteTarget}
              searchable
              placeholder="Оберіть категорію"
              searchPlaceholder="Знайти категорію"
              options={targets.map((option) => ({ value: option.id, label: option.name, hint: option.path || undefined }))}
            />
          </Field>
        )}
        <Field label={`Щоб підтвердити, введіть назву: ${category.name}`} htmlFor="confirm-category-name" className="mt-4">
          <input id="confirm-category-name" value={confirmName} onChange={(event) => setConfirmName(event.target.value)} className={adminInput} autoComplete="off" />
        </Field>
        {deleteError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {deleteError}
          </p>
        )}
      </AdminDialog>
    </>
  )
}
