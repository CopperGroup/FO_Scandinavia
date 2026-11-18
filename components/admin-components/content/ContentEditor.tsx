"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as Popover from "@radix-ui/react-popover"
import { ArrowDown, ArrowUp, Braces, Loader2, Plus, Trash2 } from "lucide-react"
import toast from "react-hot-toast"
import Select, { type SelectOption } from "@/components/admin/Select"
import { SaveBar, adminButton, adminButtonSm, adminInput, adminTextarea } from "@/components/admin/ui"
import FactIcon from "@/components/content/FactIcon"
import RichText from "@/components/content/RichText"
import { discardSiteContentDraft, resetSiteContent, saveSiteContent, saveSiteContentDraft } from "@/lib/actions/content.actions"
import { AMOUNT_TOKEN, amountLabel, contentPage, mentionsAmount, sameContent, withAmount, type ContentField, type ContentKey, type ContentValues, type ItemField, type ListField } from "@/lib/content/schema"
import { token, usedNames, type VariableInfo } from "@/lib/content/variables"
import { cn } from "@/lib/utils"
import EditorShell, { type EditorPage, type ShellHandle } from "./EditorShell"

type Errors = Record<string, string>
type Item = Record<string, string>

const fieldId = (path: string) => `content-${path.replace(/\./g, "-")}`

/* ------------------------------------------------------------------ */
/* Variables                                                           */
/* ------------------------------------------------------------------ */

const KIND_TITLES: Record<VariableInfo["kind"], string> = { contact: "Контакти магазину", computed: "Заповнює магазин", custom: "Свої змінні" }

/** The list of variables; choosing one puts its name where the cursor was. */
function VariableMenu({ variables, onPick }: { variables: VariableInfo[]; onPick: (name: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger type="button" className={adminButtonSm.secondary} data-tip="Слово в дужках, замість якого покупець побачить значення: телефон, суму доставки, ваше власне">
        <Braces className="h-3 w-3" aria-hidden="true" />
        Вставити змінну
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={4}
          className="z-[90] flex max-h-[min(26rem,var(--radix-popover-content-available-height))] w-80 flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white text-sm text-neutral-900 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.25)] outline-none"
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1">
            {(["contact", "computed", "custom"] as const).map((kind) => {
              const group = variables.filter((variable) => variable.kind === kind)
              if (group.length === 0) return null
              return (
                <div key={kind}>
                  <p className="px-2 pb-1 pt-2 text-xs font-medium text-neutral-500">{KIND_TITLES[kind]}</p>
                  {group.map((variable) => (
                    <button
                      key={variable.name}
                      type="button"
                      onClick={() => {
                        onPick(variable.name)
                        setOpen(false)
                      }}
                      className="flex min-h-8 w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-neutral-100 focus-visible:bg-neutral-100 focus-visible:outline-none"
                    >
                      <span className="shrink-0 font-medium">{token(variable.name)}</span>
                      <span className={cn("min-w-0 flex-1 truncate text-right text-xs", variable.value ? "text-neutral-500" : "text-red-700")}>{variable.value || "не заповнено"}</span>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
          <div className="shrink-0 border-t border-neutral-200 px-3 py-2 text-xs text-neutral-500">
            Назва стане там, де був курсор.{" "}
            <Link href="/admin/settings#variables" className="font-medium text-neutral-900 underline underline-offset-2">
              Змінити значення або додати свою
            </Link>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

/* ------------------------------------------------------------------ */
/* One field                                                           */
/* ------------------------------------------------------------------ */

/** Label, control, hint or error. `data-field` is how the editor knows which field the cursor is in. */
function Shell({ path, label, hint, error, counter, children }: { path: string; label: string; hint?: React.ReactNode; error?: string; counter?: { length: number; max: number }; children: React.ReactNode }) {
  const over = counter ? counter.length > counter.max : false
  return (
    <div data-field={path}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={fieldId(path)} className="block text-sm font-medium text-neutral-900">
          {label}
        </label>
        {counter && (
          <span className={cn("shrink-0 text-xs tabular-nums", over ? "font-medium text-red-700" : "text-neutral-400")} aria-hidden={!over}>
            {counter.length} / {counter.max}
          </span>
        )}
      </div>
      <div className="mt-1">{children}</div>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs leading-5 text-neutral-500">{hint}</p>
      )}
    </div>
  )
}

const RICH_HELP = "Порожній рядок починає новий абзац. Рядок, що починається з «- », стає пунктом списку. Посилання: [текст](адреса), наприклад [контакти](/info/contacts)."
const DOCUMENT_HELP = `${RICH_HELP} Заголовок розділу: рядок, що починається з «## ».`

function RichInput({ path, field, value, error, onChange }: { path: string; field: Extract<ItemField, { kind: "rich" }>; value: string; error?: string; onChange: (value: string) => void }) {
  return (
    <div>
      <Shell path={path} label={field.label} error={error} counter={{ length: value.length, max: field.max }} hint={field.hint ?? (field.document ? DOCUMENT_HELP : RICH_HELP)}>
        <textarea
          id={fieldId(path)}
          value={value}
          rows={field.rows ?? 5}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          className={cn(adminTextarea, "resize-y", field.document && "min-h-[50vh] leading-6")}
        />
      </Shell>
      {/* On a narrow screen there is no live page beside the field: show the result under it. */}
      {value.trim() && (
        <div className="mt-2 rounded-md border border-neutral-200 bg-white px-3 py-2 lg:hidden">
          <RichText text={value} />
        </div>
      )}
    </div>
  )
}

/** Icons shown as icons: one click picks, all of them in view at once. */
function IconPicker({ path, field, value, onChange }: { path: string; field: Extract<ItemField, { kind: "choice" }>; value: string; onChange: (value: string) => void }) {
  return (
    <div data-field={path}>
      <p id={`${fieldId(path)}-label`} className="text-sm font-medium text-neutral-900">
        {field.label}
      </p>
      <div role="radiogroup" aria-labelledby={`${fieldId(path)}-label`} className="mt-1 flex flex-wrap gap-2">
        {field.options.map((option, index) => {
          const checked = option.value === value
          return (
            <button
              key={option.value}
              id={index === 0 ? fieldId(path) : undefined}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={option.label}
              data-tip={option.label}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-md border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black",
                checked ? "border-black bg-black text-white" : "border-neutral-300 bg-white text-neutral-700 hover:border-black hover:text-black",
              )}
            >
              <FactIcon name={option.value} className="h-5 w-5" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ScalarInput({
  path,
  field,
  value,
  error,
  onChange,
  amount,
  targets = [],
}: {
  path: string
  field: ItemField
  value: string
  error?: string
  onChange: (value: string) => void
  amount: number
  /** The places a "target" field can lead to. */
  targets?: SelectOption[]
}) {
  if (field.kind === "rich") return <RichInput path={path} field={field} value={value} error={error} onChange={onChange} />
  if (field.kind === "target") {
    // A place that was there when the link was made and is not now: a deleted or sold-out category, a renamed column.
    const gone = Boolean(value) && !targets.some((option) => option.value === value)
    return (
      <Shell
        path={path}
        label={field.label}
        error={error}
        hint={gone ? "Цього місця зараз немає в магазині (категорію видалено, у ній закінчилися товари або колонку перейменовано), тому посилання на сайті не показується. Виберіть інше." : field.hint}
      >
        <Select id={fieldId(path)} options={targets} value={value} onChange={onChange} searchable placeholder={gone ? "Місця вже немає" : "Виберіть, куди веде"} searchPlaceholder="Відділ, колонка меню або категорія" />
      </Shell>
    )
  }
  if (field.kind === "choice") {
    if (field.icons) return <IconPicker path={path} field={field} value={value} onChange={onChange} />
    return (
      <Shell path={path} label={field.label} hint={field.hint} error={error}>
        <Select id={fieldId(path)} options={field.options.map((option) => ({ value: option.value, label: option.label }))} value={value} onChange={onChange} searchable={false} />
      </Shell>
    )
  }

  const hint = mentionsAmount(value) ? (amount > 0 ? `${AMOUNT_TOKEN} на сайті стане «${amountLabel(amount)}».` : "Безкоштовну доставку вимкнено, тому цей рядок на сайті не показується.") : field.hint

  return (
    <Shell path={path} label={field.label} hint={hint} error={error} counter={{ length: value.trim().length, max: field.max }}>
      {field.kind === "text" ? (
        <input id={fieldId(path)} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} className={adminInput} />
      ) : (
        <textarea id={fieldId(path)} value={value} rows={field.rows ?? 3} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} className={cn(adminTextarea, "resize-y")} />
      )}
    </Shell>
  )
}

/* ------------------------------------------------------------------ */
/* A list of items                                                     */
/* ------------------------------------------------------------------ */

function ListEditor({
  field,
  items,
  errors,
  amount,
  onChange,
  targets,
  auto,
}: {
  field: ListField
  items: Item[]
  errors: Errors
  amount: number
  onChange: (items: Item[]) => void
  targets: SelectOption[]
  /** What the shop shows here by itself while the list is empty (a list with `auto`). */
  auto?: Item[]
}) {
  const blank = () => Object.fromEntries(field.fields.map((sub) => [sub.key, sub.default])) as Item
  const setItem = (index: number, key: string, value: string) => onChange(items.map((item, at) => (at === index ? { ...item, [key]: value } : item)))
  const move = (index: number, by: number) => {
    const next = [...items]
    const [taken] = next.splice(index, 1)
    next.splice(index + by, 0, taken)
    onChange(next)
  }
  const add = () => {
    onChange([...items, blank()])
    // Put the cursor into the new item's first text field.
    const first = field.fields.find((sub) => sub.kind !== "choice" && sub.kind !== "target") ?? field.fields[0]
    requestAnimationFrame(() => document.getElementById(fieldId(`${field.key}.${items.length}.${first.key}`))?.focus())
  }

  const full = items.length >= field.max
  const atMinimum = items.length <= field.min

  return (
    <div data-field={field.key}>
      {field.auto && <p className="mb-1 text-sm font-medium text-neutral-900">{field.label}</p>}
      {field.hint && <p className="mb-3 text-xs leading-5 text-neutral-500">{field.hint}</p>}
      {items.length === 0 &&
        (field.auto ? (
          <div className="rounded-lg border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-600">
            {auto && auto.length > 0 ? (
              <>
                <p>
                  Зараз магазин ставить сюди посилання сам: <span className="font-medium text-neutral-900">{auto.map((item) => item.label).join(", ")}</span>.
                </p>
                <button type="button" className={cn(adminButtonSm.secondary, "mt-2")} onClick={() => onChange(auto.map((item) => ({ ...item })))} data-tip="Ці посилання з’являться у списку, і ви зможете змінити назву кожного, куди воно веде, порядок або прибрати зайве">
                  Змінити ці посилання
                </button>
              </>
            ) : (
              <p>Зараз під назвою цієї плитки посилань немає. Додайте свої.</p>
            )}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-4 text-center text-sm text-neutral-500">Тут поки порожньо.</p>
        ))}
      <ol className="space-y-3">
        {items.map((item, index) => {
          const name = (item.title || item.label || "").trim()
          return (
            <li key={index} data-field={`${field.key}.${index}`} className="rounded-lg border border-neutral-200 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-neutral-200 py-1 pl-3 pr-1">
                <p className="min-w-0 truncate text-sm font-medium text-neutral-900">
                  <span className="mr-2 tabular-nums text-neutral-400">{index + 1}</span>
                  {name || <span className="font-normal text-neutral-400">Без назви</span>}
                </p>
                <div className="flex shrink-0">
                  <button type="button" className={adminButton.icon} onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Перемістити вище: ${name || index + 1}`} data-tip="Вище">
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" className={adminButton.icon} onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label={`Перемістити нижче: ${name || index + 1}`} data-tip="Нижче">
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={cn(adminButton.icon, "hover:text-red-700")}
                    onClick={() => onChange(items.filter((_, at) => at !== index))}
                    disabled={atMinimum}
                    aria-label={`Прибрати: ${name || index + 1}`}
                    data-tip={atMinimum ? `Має лишитися щонайменше ${field.min}` : "Прибрати"}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="space-y-4 p-3">
                {field.fields.map((sub) => {
                  const path = `${field.key}.${index}.${sub.key}`
                  return <ScalarInput key={sub.key} path={path} field={sub} value={item[sub.key] ?? ""} error={errors[path]} amount={amount} targets={targets} onChange={(value) => setItem(index, sub.key, value)} />
                })}
              </div>
            </li>
          )
        })}
      </ol>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" className={adminButton.secondary} onClick={add} disabled={full}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Додати {field.itemName}
        </button>
        {full && <span className="text-xs text-neutral-500">Більше не вміститься: щонайбільше {field.max}.</span>}
        {errors[field.key] && (
          <span role="alert" className="text-xs text-red-700">
            {errors[field.key]}
          </span>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* The page                                                            */
/* ------------------------------------------------------------------ */

export default function ContentEditor({
  pageKey,
  pages,
  previewPath,
  initial,
  edited,
  changed,
  freeDelivery,
  targets,
  linkTargets,
  autoLinks,
  variables,
  startField,
}: {
  pageKey: ContentKey
  pages: EditorPage[]
  /** Storefront address that shows this page's texts. */
  previewPath: string
  initial: ContentValues
  /** The page has saved changes (so there is something to put back). */
  edited: boolean
  /** "Ім’я, 17 листопада, 12:40" of the last change; empty for a page never edited. */
  changed: string
  /** The free-delivery sum saved now: fills {сума} in the hints. */
  freeDelivery: number
  /** What a block of the storefront can lead to (lib/content/targets.ts). */
  targets: SelectOption[]
  /** The same and the columns of the menu: what a small link under a tile can lead to. */
  linkTargets: SelectOption[]
  /** The links the shop puts under a tile by itself, by where the tile leads. */
  autoLinks: Record<string, Item[]>
  /** Every variable a text may name, with its value now (lib/content/variables.ts). */
  variables: VariableInfo[]
  /** A field to open at once (the admin clicked it in the preview of another page). */
  startField?: string
}) {
  const page = contentPage(pageKey)!
  const router = useRouter()
  const shell = useRef<ShellHandle>(null)
  const fields = useRef<HTMLDivElement>(null)
  // The text field the cursor was in last: a variable chosen from the menu goes there.
  const lastText = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const [saved, setSaved] = useState(initial)
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState<"" | "save" | "reset">("")
  const [confirmReset, setConfirmReset] = useState(false)
  const [isEdited, setIsEdited] = useState(edited)
  const [elsewhere, setElsewhere] = useState<{ page: EditorPage; field: string } | null>(null)

  const dirty = useMemo(() => !sameContent(values, saved), [values, saved])
  // The sum being typed on this very page counts at once in its own hints.
  const amount = pageKey === "delivery" ? Math.max(0, Math.round(Number(values.freeDelivery) || 0)) : freeDelivery

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  // The preview shows what is typed, a moment after the typing stops. Only the
  // preview frame sees this copy; customers see the saved texts.
  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const result = await saveSiteContentDraft(pageKey, values).catch(() => ({ ok: false }))
      if (result.ok) shell.current?.refresh()
    }, 350)
    return () => window.clearTimeout(timer)
  }, [pageKey, values])
  useEffect(
    () => () => {
      void discardSiteContentDraft(pageKey).catch(() => undefined)
    },
    [pageKey],
  )

  /** Marks on the storefront page that can stand for a field, most exact first. */
  const marksOf = (path: string): string[] => {
    const parts = path.split(".")
    const marks: string[] = []
    for (let length = parts.length; length > 0; length--) marks.push(`${pageKey}:${parts.slice(0, length).join(".")}`)
    const marker = page.sections.flatMap((section) => section.fields).find((field) => field.key === parts[0])?.marker
    if (marker) marks.push(`${pageKey}:${marker}`)
    return marks
  }

  const focusField = (path: string) => {
    const root = fields.current
    if (!root) return
    const holder = root.querySelector<HTMLElement>(`[data-field="${path}"]`) ?? root.querySelector<HTMLElement>(`[data-field^="${path}."]`)
    const control = holder?.querySelector<HTMLElement>("input, textarea, button[role=radio], button[role=combobox], button")
    holder?.scrollIntoView({ block: "center", behavior: "smooth" })
    control?.focus({ preventScroll: true })
  }

  useEffect(() => {
    if (startField) focusField(startField)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startField])

  /** A piece of the page was clicked in the preview. */
  const onSelect = (mark: string) => {
    const [markPage, path = ""] = mark.split(":")
    if (markPage === pageKey) {
      setElsewhere(null)
      focusField(path)
      return
    }
    const other = pages.find((entry) => entry.key === markPage)
    if (other) setElsewhere({ page: other, field: path })
  }

  const set = (key: string, value: ContentValues[string]) => {
    setValues((previous) => ({ ...previous, [key]: value }))
    setMessage(null)
    setErrors((previous) => {
      const next = { ...previous }
      for (const path of Object.keys(next)) if (path === key || path.startsWith(`${key}.`)) delete next[path]
      return next
    })
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy("save")
    setMessage(null)
    try {
      const result = await saveSiteContent(pageKey, values)
      if (!result.ok) {
        setErrors(result.errors ?? {})
        setMessage(result.error)
        const first = Object.keys(result.errors ?? {})[0]
        if (first) focusField(first)
        return
      }
      setErrors({})
      setSaved(result.values)
      setValues(result.values)
      setIsEdited(true)
      toast.success("Збережено. На сайті вже новий текст.")
      router.refresh()
    } catch {
      setMessage("Немає зв’язку із сервером. Перевірте інтернет і спробуйте ще раз.")
    } finally {
      setBusy("")
    }
  }

  const reset = async () => {
    setBusy("reset")
    setMessage(null)
    try {
      const result = await resetSiteContent(pageKey)
      if (!result.ok) {
        setMessage(result.error)
        return
      }
      setErrors({})
      setSaved(result.values)
      setValues(result.values)
      setIsEdited(false)
      setConfirmReset(false)
      toast.success("Повернуто початковий текст")
      router.refresh()
    } catch {
      setMessage("Немає зв’язку із сервером. Перевірте інтернет і спробуйте ще раз.")
    } finally {
      setBusy("")
    }
  }

  const renderField = (field: ContentField) => {
    let control: React.ReactNode
    if (field.kind === "list") {
      control = (
        <ListEditor
          field={field}
          items={(values[field.key] as Item[]) ?? []}
          errors={errors}
          amount={amount}
          targets={linkTargets}
          auto={field.auto ? (autoLinks[String(values[field.auto.of] ?? "")] ?? []).slice(0, field.auto.limit) : undefined}
          onChange={(items) => set(field.key, items)}
        />
      )
    } else if (field.kind === "target") {
      control = (
        <Shell path={field.key} label={field.label} hint={field.hint} error={errors[field.key]}>
          <Select id={fieldId(field.key)} options={targets} value={String(values[field.key] ?? field.default)} onChange={(value) => set(field.key, value)} searchable searchPlaceholder="Відділ або категорія" />
        </Shell>
      )
    } else if (field.kind === "number") {
      const raw = values[field.key]
      control = (
        <Shell path={field.key} label={field.label} hint={field.hint} error={errors[field.key]}>
          <div className="flex items-center gap-2">
            <input
              id={fieldId(field.key)}
              type="number"
              inputMode="numeric"
              min={field.min}
              max={field.max}
              step={1}
              value={raw === undefined || raw === null ? "" : String(raw)}
              onChange={(event) => set(field.key, event.target.value === "" ? "" : Number(event.target.value))}
              aria-invalid={Boolean(errors[field.key])}
              className={cn(adminInput, "w-40 tabular-nums")}
            />
            {field.suffix && <span className="text-sm text-neutral-600">{field.suffix}</span>}
          </div>
        </Shell>
      )
    } else {
      control = <ScalarInput path={field.key} field={field} value={String(values[field.key] ?? "")} error={errors[field.key]} amount={amount} onChange={(value) => set(field.key, value)} />
    }
    return (
      <div key={field.key} className={cn(field.heading && "border-t border-neutral-200 pt-4 first:border-t-0 first:pt-0")}>
        {field.heading && <p className="mb-3 text-xs font-semibold text-neutral-900">{field.heading}</p>}
        {control}
      </div>
    )
  }

  const problems = Object.keys(errors).length

  /** Writes {name} where the cursor was; without a field to write into, copies it. */
  const insertVariable = (name: string) => {
    const text = token(name)
    const element = lastText.current
    if (!element || !element.isConnected) {
      void navigator.clipboard?.writeText(text).catch(() => undefined)
      toast(`Скопійовано ${text}. Клацніть у потрібному полі й вставте.`)
      return
    }
    const start = element.selectionStart ?? element.value.length
    const end = element.selectionEnd ?? start
    // React keeps the value of a field: set it the way typing does, so the field's own handler runs.
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(element, element.value.slice(0, start) + text + element.value.slice(end))
    element.dispatchEvent(new Event("input", { bubbles: true }))
    element.focus()
    element.setSelectionRange(start + text.length, start + text.length)
  }

  // Names in the texts that will show nothing, or that no variable has.
  const named = Array.from(usedNames(values))
  const emptyNamed = named.filter((name) => variables.some((variable) => variable.name === name && variable.kind !== "computed" && !variable.value))
  const unknownNamed = named.filter((name) => !variables.some((variable) => variable.name === name))

  return (
    <EditorShell ref={shell} pages={pages} selected={pageKey} previewPath={previewPath} canLeave={!dirty} onSelect={onSelect} onReady={() => startField && shell.current?.focus(marksOf(startField))}>
      <form onSubmit={save} noValidate className="flex min-h-0 flex-1 flex-col">
        <div
          ref={fields}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4"
          // Wherever the cursor goes, the preview shows that place on the page.
          onFocusCapture={(event) => {
            const target = event.target as HTMLElement
            if (target instanceof HTMLTextAreaElement || (target instanceof HTMLInputElement && target.type === "text")) lastText.current = target
            const path = target.closest<HTMLElement>("[data-field]")?.dataset.field
            if (path) shell.current?.focus(marksOf(path))
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 text-xs text-neutral-500">{isEdited ? (changed ? `Змінено: ${changed}.` : "Текст змінено.") : "Тут ще нічого не міняли: сайт показує початковий текст."}</p>
            <VariableMenu variables={variables} onPick={insertVariable} />
          </div>

          {(emptyNamed.length > 0 || unknownNamed.length > 0) && (
            <div role="status" className="space-y-1 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              {unknownNamed.length > 0 && <p>Немає змінної {unknownNamed.map(token).join(", ")}: перевірте назву. З нею сторінку не вдасться зберегти.</p>}
              {emptyNamed.length > 0 && (
                <p>
                  У тексті є {emptyNamed.map(token).join(", ")}, а значення не заповнено: покупець побачить порожнє місце.{" "}
                  <Link href="/admin/settings" className="font-medium underline underline-offset-2">
                    Заповнити в «Налаштуваннях»
                  </Link>
                </p>
              )}
            </div>
          )}

          {elsewhere && (
            <div role="status" className="rounded-lg border border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-900">
              <p>Цей текст належить до іншої сторінки: «{elsewhere.page.title}».</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={adminButton.secondary}
                  disabled={dirty}
                  data-tip={dirty ? "Спочатку збережіть або скасуйте зміни" : undefined}
                  onClick={() => router.push(`/admin/pages?page=${elsewhere.page.key}&field=${encodeURIComponent(elsewhere.field)}`)}
                >
                  Перейти до нього
                </button>
                <button type="button" className={adminButton.ghost} onClick={() => setElsewhere(null)}>
                  Закрити
                </button>
              </div>
              {dirty && <p className="mt-2 text-xs text-neutral-500">Спочатку збережіть або скасуйте зміни на цій сторінці.</p>}
            </div>
          )}

          {page.sections.map((section) => (
            <section key={section.id} aria-labelledby={`section-${section.id}`}>
              <h2 id={`section-${section.id}`} className="text-sm font-semibold text-neutral-900">
                {section.title}
              </h2>
              {section.description && <p className="mt-0.5 text-xs leading-5 text-neutral-500">{section.description}</p>}
              <div className="mt-3 space-y-4 rounded-lg border border-neutral-200 bg-neutral-50/70 p-3">{section.fields.map(renderField)}</div>
            </section>
          ))}
        </div>

        <SaveBar
          flush
          start={
            confirmReset ? (
              <>
                <button type="button" className={adminButton.dangerSolid} onClick={reset} disabled={busy !== ""}>
                  {busy === "reset" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Так, повернути
                </button>
                <button type="button" className={adminButton.secondary} onClick={() => setConfirmReset(false)} disabled={busy !== ""}>
                  Ні
                </button>
              </>
            ) : (
              <>
                <button type="button" className={adminButton.ghost} onClick={() => { setValues(saved); setErrors({}); setMessage(null) }} disabled={busy !== "" || !dirty}>
                  Скасувати
                </button>
                {isEdited && (
                  <button type="button" className={adminButton.ghost} onClick={() => setConfirmReset(true)} disabled={busy !== ""} data-tip="Повернути текст, з яким сайт був спочатку">
                    Початковий текст
                  </button>
                )}
              </>
            )
          }
          note={
            confirmReset ? (
              <span className="text-neutral-900">Повернути текст, з яким сайт був спочатку? Ваші зміни на цій сторінці зникнуть.</span>
            ) : message ? (
              <span role="alert" className="text-red-700">
                {message}
              </span>
            ) : problems > 0 ? (
              <span className="text-red-700">Виправте позначені поля.</span>
            ) : dirty ? (
              "Не збережено."
            ) : null
          }
        >
          <button type="submit" className={adminButton.primary} disabled={busy !== "" || !dirty || confirmReset}>
            {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {busy === "save" ? "Зберігаємо…" : dirty ? "Зберегти" : "Збережено"}
          </button>
        </SaveBar>
      </form>
    </EditorShell>
  )
}
