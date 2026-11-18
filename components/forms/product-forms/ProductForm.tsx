"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, ExternalLink, Loader2, Trash2 } from "lucide-react"
import { AdminPage, Field, FormLayout, Panel, Pill, SaveBar, SectionNav, adminButton, adminInput } from "@/components/admin/ui"
import AdminDialog from "@/components/admin-components/modals/AdminDialog"
import Select from "@/components/admin/Select"
import { cleanBrandName } from "@/lib/brands"
import { deleteProduct, saveProduct } from "@/lib/actions/product.actions"
import { discountPercent, pluralUk } from "@/lib/admin/catalog-shared"
import type { ParamSuggestion, ProductFormValues, ProductVariantsView } from "@/lib/admin/products"
import { cn } from "@/lib/utils"
import { CategoryPicker } from "./CategoryPicker"
import { firstProblem, hiddenReasons, toNumber, validateProductDraft, type ProductField } from "./form-logic"
import { ParamsTable } from "./ParamsTable"
import { PhotosField } from "./PhotosField"
import { ProductPreview } from "./ProductPreview"
import { RichTextEditor } from "./rich-text-editor"
import { VariantsTable } from "./VariantsTable"

const dateFormat = new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Kiev" })
const timeFormat = new Intl.DateTimeFormat("uk-UA", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Kiev" })

type Values = {
  name: string
  articleNumber: string
  vendor: string
  description: string
  url: string
  images: string[]
  price: string
  salePrice: string
  quantity: string
  isAvailable: boolean
  category: { selected: string[]; newNames: string[] }
  params: { name: string; value: string }[]
}

function initialValues(product: ProductFormValues | null): Values {
  return {
    name: product?.name ?? "",
    articleNumber: product?.articleNumber ?? "",
    vendor: product?.vendor ?? "",
    description: product?.description ?? "",
    // Supplier files bring links with spaces around them.
    url: product?.url?.trim() ?? "",
    images: product?.images ?? [],
    price: product ? String(product.price) : "",
    salePrice: product && product.priceToShow < product.price ? String(product.priceToShow) : "",
    quantity: product ? String(product.quantity) : "1",
    isAvailable: product?.isAvailable ?? true,
    category: { selected: product?.category ?? [], newNames: [] },
    params: product?.params ?? [],
  }
}

/** Where each validated field lives on the page (the element that takes the focus). */
const FIELD_TARGET: Record<ProductField, string> = {
  name: "product-name",
  description: "product-description",
  url: "product-url",
  price: "product-price",
  priceToShow: "product-priceToShow",
  quantity: "product-quantity",
  category: "product-category",
  params: "product-params-add",
}

/** Price field with the currency inside it. */
function MoneyInput({ id, value, onChange, invalid, describedBy }: { id: string; value: string; onChange: (value: string) => void; invalid?: boolean; describedBy?: string }) {
  return (
    <div className="relative">
      <input
        id={id}
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(adminInput, "pr-8 tabular-nums", invalid && "border-red-600")}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500" aria-hidden="true">
        ₴
      </span>
    </div>
  )
}

/**
 * Create and edit form of a product.
 *
 * Layout: sections on the left (Основне, Фото, Ціна і наявність, Категорії,
 * Характеристики, Варіанти), a column on the right that only informs (how the
 * card looks in the catalog, whether shoppers see it and why not, ids and
 * dates), and the bottom bar with the actions: cancel the changes, what is
 * going on, save. Saving is one server action that answers with a result.
 */
export default function ProductForm({
  product,
  categories,
  newId,
  paramSuggestions = [],
  brands = [],
  variants = null,
  justCreated = false,
}: {
  product: ProductFormValues | null
  categories: { id: string; name: string; path?: string }[]
  /** A fresh ID for a new product. */
  newId?: string
  /** Characteristic names and values used in the catalog. */
  paramSuggestions?: ParamSuggestion[]
  /** The shop's brand list ("Бренди") the product's brand is chosen from. */
  brands?: string[]
  variants?: ProductVariantsView | null
  /** The product was created a moment ago (the create page sends the admin here). */
  justCreated?: boolean
}) {
  const router = useRouter()
  const editing = Boolean(product)

  const [values, setValues] = useState<Values>(() => initialValues(product))
  /** The values as they are stored: what "dirty" and the header status compare against. */
  const [saved, setSaved] = useState<Values>(() => initialValues(product))
  const [showErrors, setShowErrors] = useState(false)
  const [formError, setFormError] = useState("")
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [created, setCreated] = useState(justCreated)
  const [moreOpen, setMoreOpen] = useState(Boolean(product?.url))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const leaving = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setFormError("")
  }

  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(saved), [values, saved])

  // The shop's brands, plus this product's own brand when it is a new one (typed here, not saved yet).
  const brandOptions = useMemo(() => {
    const names = values.vendor && !brands.includes(values.vendor) ? [values.vendor, ...brands] : brands
    return names.map((name) => ({ value: name, label: name }))
  }, [brands, values.vendor])

  // The "created" banner is a one-off: drop ?created=1 so a reload does not show it again.
  useEffect(() => {
    if (justCreated) window.history.replaceState(window.history.state, "", window.location.pathname)
  }, [justCreated])

  // Unsaved changes: warn before closing the tab, reloading, or following a link inside the admin.
  useEffect(() => {
    if (!dirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (leaving.current) return
      event.preventDefault()
      event.returnValue = ""
    }
    const onClick = (event: MouseEvent) => {
      if (leaving.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.hash)) return
      if (window.confirm("Є незбережені зміни. Піти зі сторінки й втратити їх?")) {
        leaving.current = true
        return
      }
      event.preventDefault()
      event.stopPropagation()
    }
    window.addEventListener("beforeunload", beforeUnload)
    document.addEventListener("click", onClick, true)
    return () => {
      window.removeEventListener("beforeunload", beforeUnload)
      document.removeEventListener("click", onClick, true)
    }
  }, [dirty])

  // Ctrl+S / Cmd+S saves.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        formRef.current?.requestSubmit()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const categoryCount = values.category.selected.length + values.category.newNames.length
  const problems = validateProductDraft({ ...values, categoryCount })
  const shown = showErrors ? problems : {}
  const first = showErrors ? firstProblem(problems) : null

  const price = toNumber(values.price)
  const sale = values.salePrice.trim() ? toNumber(values.salePrice) : NaN
  const priceToShow = Number.isFinite(sale) && sale > 0 && !(sale > price) ? sale : price
  const discount = Number.isFinite(sale) ? discountPercent(price, sale) : 0
  const quantity = toNumber(values.quantity)

  const liveHidden = hiddenReasons({ isAvailable: values.isAvailable, quantity, categoryCount, imageCount: values.images.length })
  const savedHidden = hiddenReasons({
    isAvailable: saved.isAvailable,
    quantity: toNumber(saved.quantity),
    categoryCount: saved.category.selected.length + saved.category.newNames.length,
    imageCount: saved.images.length,
  })

  const goTo = useCallback((field: ProductField) => {
    if (field === "url") setMoreOpen(true)
    // Let the "Додатково" block open before focusing inside it.
    requestAnimationFrame(() => {
      let target = document.getElementById(FIELD_TARGET[field])
      if (field === "params") target = document.querySelector<HTMLElement>('#params input[aria-invalid="true"]') ?? target
      target?.scrollIntoView({ block: "center", behavior: "smooth" })
      target?.focus({ preventScroll: true })
    })
  }, [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (saving || (editing && !dirty)) return
    setShowErrors(true)
    setFormError("")
    const problem = firstProblem(problems)
    if (problem) {
      goTo(problem.field)
      return
    }
    setSaving(true)
    const sent = values
    try {
      const result = await saveProduct({
        _id: product?._id,
        id: product?.id ?? newId ?? "",
        name: sent.name.trim(),
        description: sent.description,
        images: sent.images,
        price,
        priceToShow,
        quantity,
        isAvailable: sent.isAvailable,
        articleNumber: sent.articleNumber.trim(),
        vendor: sent.vendor.trim(),
        url: sent.url.trim(),
        category: sent.category.selected,
        newCategories: sent.category.newNames,
        customParams: sent.params.filter((param) => param.name.trim() && param.value.trim()),
      })
      if (!result.ok) {
        setFormError(result.error)
        return
      }
      if (editing) {
        setSaved(sent)
        setSavedAt(new Date())
        setCreated(false)
        setShowErrors(false)
        // New categories now exist: reload the page data so they become ordinary chips.
        router.refresh()
      } else {
        leaving.current = true
        router.push(`/admin/createProduct/list/${result._id}?created=1`)
      }
    } catch {
      setFormError("Не вдалося зберегти: немає зв’язку з сервером. Перевірте інтернет і натисніть «Зберегти» ще раз.")
    } finally {
      setSaving(false)
    }
  }

  // After a save that created categories, the refreshed page knows them by id: swap the names for ids.
  useEffect(() => {
    if (!product || values.category.newNames.length === 0 || dirty) return
    const known = product.category.filter((id) => !values.category.selected.includes(id))
    if (known.length === 0) return
    const next = { selected: [...values.category.selected, ...known], newNames: [] }
    setValues((current) => ({ ...current, category: next }))
    setSaved((current) => ({ ...current, category: next }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product])

  /** «Скасувати зміни»: back to what is stored. */
  const discard = () => {
    setValues(saved)
    setShowErrors(false)
    setFormError("")
  }

  const remove = async () => {
    if (!product) return
    setDeleting(true)
    try {
      await deleteProduct({ product_id: product._id })
      leaving.current = true
      router.push("/admin/products")
      router.refresh()
    } catch {
      setFormError("Не вдалося видалити товар. Оновіть сторінку і спробуйте ще раз.")
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  const sections = [
    { id: "basics", label: "Основне" },
    { id: "photos", label: "Фото", count: values.images.length },
    { id: "price", label: "Ціна і наявність" },
    { id: "categories", label: "Категорії", count: categoryCount },
    { id: "params", label: "Характеристики", count: values.params.length },
    ...(variants ? [{ id: "variants", label: "Варіанти", count: variants.total }] : []),
  ]

  /* ------------------------------ bottom bar ------------------------------ */

  let note: React.ReactNode = null
  if (saving) note = <span className="text-neutral-700">Зберігаємо…</span>
  else if (formError)
    note = (
      <span role="alert" className="text-red-700">
        {formError}
      </span>
    )
  else if (first)
    note = (
      <span role="alert" className="text-red-700">
        {first.message}{" "}
        <button type="button" className="font-medium underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600" onClick={() => goTo(first.field)}>
          Перейти до поля
        </button>
      </span>
    )
  else if (dirty)
    note = (
      <span className="inline-flex items-center gap-2 text-neutral-700">
        <span className="h-2 w-2 shrink-0 rounded-full bg-neutral-900" aria-hidden="true" />
        Є незбережені зміни
      </span>
    )
  else if (savedAt) note = <span className="text-neutral-700">Зміни збережено о {timeFormat.format(savedAt)}.</span>
  else if (created) note = <span className="text-neutral-700">Товар створено. Можна додати ще фото чи характеристики.</span>

  const saveLabel = saving ? "Зберігаємо…" : !editing ? "Створити товар" : dirty ? "Зберегти" : savedAt ? "Збережено" : "Змін немає"

  /* -------------------------------- header -------------------------------- */

  const headerActions = product ? (
    <>
      {savedHidden.length === 0 ? <Pill tone="ok">Видно покупцям</Pill> : <Pill tone="problem">Не видно покупцям</Pill>}
      <a href={`/catalog/${product._id}`} target="_blank" rel="noopener noreferrer" className={adminButton.secondary}>
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
        Переглянути в магазині
      </a>
    </>
  ) : undefined

  return (
    <AdminPage
      title={product ? saved.name.trim() || "Без назви" : "Новий товар"}
      description={product ? undefined : "Заповніть назву, опис, ціну й категорію. Решту можна додати пізніше."}
      back={{ href: "/admin/products", label: "Товари" }}
      actions={headerActions}
    >
      <form ref={formRef} onSubmit={submit} noValidate className="space-y-4">
        <SectionNav items={sections} />

        {/* The side column sticks below the section tabs: top bar 56 + tabs 40 + 16. */}
        <FormLayout
          asideTop={112}
          aside={
            <section aria-labelledby="product-shop-heading" className="rounded-lg border border-neutral-200 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
                <h2 id="product-shop-heading" className="text-sm font-semibold text-neutral-900">
                  {dirty ? "Після збереження" : "У магазині"}
                </h2>
                {liveHidden.length === 0 ? <Pill tone="ok">Видно покупцям</Pill> : <Pill tone="problem">Не видно</Pill>}
              </div>
              <div className="space-y-4 p-4">
                {liveHidden.length > 0 && <p className="text-sm text-neutral-700">Не видно: {liveHidden.join(", ")}.</p>}
                <ProductPreview
                  image={values.images[0] ?? null}
                  name={values.name.trim()}
                  vendor={values.vendor.trim()}
                  price={price}
                  priceToShow={priceToShow}
                  discount={discount}
                  quantity={Number.isFinite(quantity) ? quantity : 0}
                  sellable={values.isAvailable}
                />
              </div>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-t border-neutral-200 px-4 py-3 text-xs">
                <dt className="text-neutral-500">ID</dt>
                <dd className="tabular-nums text-neutral-900">
                  {product?.id ?? newId ?? "—"}
                  {!product && <span className="text-neutral-500"> · призначено автоматично</span>}
                </dd>
                {product?.createdAt && (
                  <>
                    <dt className="text-neutral-500">Створено</dt>
                    <dd className="tabular-nums text-neutral-900">{dateFormat.format(new Date(product.createdAt))}</dd>
                  </>
                )}
                {product?.updatedAt && (
                  <>
                    <dt className="text-neutral-500">Змінено</dt>
                    <dd className="tabular-nums text-neutral-900">{dateFormat.format(savedAt ?? new Date(product.updatedAt))}</dd>
                  </>
                )}
              </dl>
              {product?.isFetched && (
                <p className="border-t border-neutral-200 px-4 py-3 text-xs leading-5 text-neutral-600">
                  <span className="font-medium text-neutral-900">З файлу постачальника.</span> Наступне завантаження файлу може змінити ціну й наявність.
                </p>
              )}
            </section>
          }
        >
          {product && product.danglingCategories > 0 && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              Товар посилався на категорію, якої вже немає. Після збереження це посилання буде прибрано.
            </p>
          )}

          <Panel id="basics" title="Основне">
            <div className="space-y-4">
              <Field label="Назва" htmlFor="product-name" error={shown.name}>
                <input
                  id="product-name"
                  value={values.name}
                  onChange={(event) => set("name", event.target.value)}
                  className={cn(adminInput, shown.name && "border-red-600")}
                  aria-invalid={Boolean(shown.name) || undefined}
                  maxLength={300}
                  autoComplete="off"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Артикул" htmlFor="product-article" optional>
                  <input id="product-article" value={values.articleNumber} onChange={(event) => set("articleNumber", event.target.value)} className={adminInput} autoComplete="off" maxLength={120} />
                </Field>
                <Field
                  label="Бренд"
                  htmlFor="product-vendor"
                  optional
                  tip="Виберіть бренд зі списку. Якщо його там немає, почніть писати назву і натисніть «Додати»: після збереження товару бренд з’явиться в розділі «Бренди». Покупці бачать бренд на сторінці товару й у фільтрі каталогу."
                >
                  <Select
                    id="product-vendor"
                    options={brandOptions}
                    value={values.vendor}
                    onChange={(value) => set("vendor", value)}
                    onCreate={(text) => set("vendor", cleanBrandName(text))}
                    placeholder="Без бренду"
                    searchPlaceholder="Знайдіть бренд або введіть новий"
                    emptyText="Брендів ще немає. Введіть назву, щоб додати."
                    clearable
                  />
                </Field>
              </div>
              <Field label="Опис" htmlFor="product-description" error={shown.description}>
                <RichTextEditor id="product-description" label="Опис" value={values.description} onChange={(value) => set("description", value)} invalid={Boolean(shown.description)} />
              </Field>

              <div className="border-t border-neutral-200 pt-2">
                <button
                  type="button"
                  aria-expanded={moreOpen}
                  aria-controls="product-more"
                  onClick={() => setMoreOpen(!moreOpen)}
                  className="-ml-2 inline-flex h-9 items-center gap-2 rounded-md px-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                >
                  <ChevronDown className={cn("h-4 w-4 transition-transform", !moreOpen && "-rotate-90")} aria-hidden="true" />
                  Додатково
                  {!moreOpen && values.url && <span className="font-normal text-neutral-500">· є посилання на постачальника</span>}
                </button>
                {moreOpen && (
                  <div id="product-more" className="pt-2">
                    <Field label="Сторінка товару в постачальника" htmlFor="product-url" optional error={shown.url} hint="Для вас, щоб швидко знайти товар у постачальника.">
                      <input
                        id="product-url"
                        value={values.url}
                        onChange={(event) => set("url", event.target.value)}
                        className={cn(adminInput, shown.url && "border-red-600")}
                        aria-invalid={Boolean(shown.url) || undefined}
                        inputMode="url"
                        placeholder="https://…"
                        autoComplete="off"
                      />
                    </Field>
                  </div>
                )}
              </div>
            </div>
          </Panel>

          <Panel id="photos" title="Фото" description="Перше фото — головне: його видно в каталозі. Перетягніть фото, щоб змінити порядок.">
            <PhotosField images={values.images} onChange={(images) => set("images", images)} inputId="product-photos" />
          </Panel>

          <Panel id="price" title="Ціна і наявність">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Ціна" htmlFor="product-price" error={shown.price}>
                <MoneyInput id="product-price" value={values.price} onChange={(value) => set("price", value)} invalid={Boolean(shown.price)} />
              </Field>
              <Field
                label="Ціна зі знижкою"
                htmlFor="product-priceToShow"
                optional
                error={shown.priceToShow}
                hint={discount > 0 ? <span className="font-medium text-neutral-900">Знижка {discount}%</span> : "Порожньо — без знижки"}
              >
                <MoneyInput id="product-priceToShow" value={values.salePrice} onChange={(value) => set("salePrice", value)} invalid={Boolean(shown.priceToShow)} />
              </Field>
              <Field label="На складі, шт." htmlFor="product-quantity" error={shown.quantity}>
                <input
                  id="product-quantity"
                  inputMode="numeric"
                  value={values.quantity}
                  onChange={(event) => set("quantity", event.target.value)}
                  className={cn(adminInput, "tabular-nums", shown.quantity && "border-red-600")}
                  aria-invalid={Boolean(shown.quantity) || undefined}
                  autoComplete="off"
                />
              </Field>
            </div>
            <div className="mt-4 flex items-start gap-3 border-t border-neutral-200 pt-4">
              <button
                type="button"
                role="switch"
                id="product-available"
                aria-checked={values.isAvailable}
                aria-labelledby="product-available-label"
                aria-describedby="product-available-hint"
                onClick={() => set("isAvailable", !values.isAvailable)}
                className={cn(
                  "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2",
                  values.isAvailable ? "bg-black" : "bg-neutral-300",
                )}
              >
                <span className={cn("inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform", values.isAvailable ? "translate-x-[1.125rem]" : "translate-x-0.5")} />
              </button>
              <div className="min-w-0">
                <label id="product-available-label" htmlFor="product-available" className="cursor-pointer text-sm font-medium text-neutral-900">
                  Продається в магазині
                </label>
                <p id="product-available-hint" className="mt-0.5 text-xs text-neutral-500">
                  {values.isAvailable ? "Покупці бачать товар, якщо він є на складі." : "Товар сховано з каталогу, але він залишається в базі й у старих замовленнях."}
                </p>
              </div>
            </div>
          </Panel>

          <Panel id="categories" title="Категорії" description="Де товар буде в меню каталогу. Можна кілька.">
            <CategoryPicker
              options={categories}
              selected={values.category.selected}
              newNames={values.category.newNames}
              onChange={(next) => set("category", next)}
              inputId="product-category"
              invalid={Boolean(shown.category)}
              describedBy={shown.category ? "product-category-error" : undefined}
            />
            {shown.category && (
              <p id="product-category-error" role="alert" className="mt-2 text-xs text-red-700">
                {shown.category}
              </p>
            )}
          </Panel>

          <Panel id="params" title="Характеристики" description="Розмір, колір, склад тощо. Їх видно на сторінці товару і у фільтрі каталогу.">
            <ParamsTable params={values.params} onChange={(next) => set("params", next)} suggestions={paramSuggestions} showErrors={Boolean(shown.params)} idPrefix="product-params" />
            {shown.params && (
              <p role="alert" className="mt-1 text-xs text-red-700">
                {shown.params}
              </p>
            )}
          </Panel>

          {variants && (
            <Panel
              id="variants"
              title="Варіанти цієї моделі"
              description="У каталозі це одна картка з вибором розміру й кольору. Кожен варіант редагується окремо."
              padded={false}
              action={
                <span className="text-sm tabular-nums text-neutral-500">
                  {variants.total} {pluralUk(variants.total, "варіант", "варіанти", "варіантів")} · {variants.purchasable} в наявності
                </span>
              }
            >
              <VariantsTable variants={variants} />
            </Panel>
          )}
        </FormLayout>

        {/* Last on the page on every screen (after the side column on phones), as wide as the sections. */}
        {product && (
          <section aria-labelledby="product-delete-heading" className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 lg:mr-[21.5rem]">
            <div className="min-w-0">
              <h2 id="product-delete-heading" className="text-sm font-semibold text-neutral-900">
                Видалити товар
              </h2>
              <p className="mt-0.5 text-sm text-neutral-500">Товар зникне з магазину назавжди. У старих замовленнях його буде позначено як видалений.</p>
            </div>
            <button type="button" className={adminButton.danger} onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Видалити товар…
            </button>
          </section>
        )}

        <SaveBar
          note={<div aria-live="polite">{note}</div>}
          start={
            editing ? (
              <button type="button" className={adminButton.ghost} disabled={!dirty || saving} onClick={discard}>
                Скасувати зміни
              </button>
            ) : (
              <Link href="/admin/products" className={adminButton.ghost}>
                Скасувати
              </Link>
            )
          }
        >
          <button type="submit" className={cn(adminButton.primary, "min-w-[8.25rem]")} disabled={saving || (editing && !dirty)} aria-keyshortcuts="Control+S">
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {saveLabel}
          </button>
        </SaveBar>
      </form>

      {product && (
        <AdminDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          busy={deleting}
          tone="danger"
          title="Видалити товар?"
          description={<>«{product.name}» зникне з магазину назавжди. У старих замовленнях його буде позначено як видалений.</>}
          footer={
            <>
              <button type="button" className={adminButton.secondary} onClick={() => setConfirmDelete(false)} disabled={deleting}>
                Скасувати
              </button>
              <button type="button" className={adminButton.dangerSolid} onClick={() => void remove()} disabled={deleting}>
                {deleting ? "Видаляємо…" : "Видалити товар"}
              </button>
            </>
          }
        />
      )}
    </AdminPage>
  )
}
