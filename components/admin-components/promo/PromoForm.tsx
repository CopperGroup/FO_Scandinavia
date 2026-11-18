"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Copy, Loader2, Mail, Shuffle, Trash2 } from "lucide-react"
import { AdminPage, AsideCard, Field, FormLayout, Panel, Pill, SaveBar, adminButton, adminButtonSm, adminInput } from "@/components/admin/ui"
import AdminDialog from "@/components/admin-components/modals/AdminDialog"
import Select, { type SelectOption } from "@/components/admin/Select"
import { deletePromoCode, emailPromoCode, savePromoCode, setPromoCodeActive } from "@/lib/actions/promo-admin.actions"
import type { PromoOwner, PromoOwnerOption } from "@/lib/promo/admin"
import {
  PROMO_NOTE_MAX,
  PROMO_PERCENT_MAX,
  PROMO_PERCENT_MIN,
  PROMO_STATUS_LABEL,
  addDays,
  cleanPromoInput,
  formatPromoDay,
  kyivDay,
  normalizePromoCode,
  randomPromoCode,
  type PromoErrors,
  type PromoInput,
  type PromoRecord,
  type PromoStatus,
} from "@/lib/promo/rules"
import { formatPrice, plural } from "@/lib/storefront/format"
import { cn } from "@/lib/utils"
import { SOURCE_LABEL, STATUS_TONE, describePromo, statusTip, usageText } from "./format"
import { Switch } from "./Switch"

/** The form keeps what is typed, as text: an empty field means "no limit". */
type Draft = {
  personal: boolean
  owner: PromoOwner | null
  code: string
  percent: string
  startDay: string
  endDay: string
  maxUses: string
  perCustomer: string
  minOrder: string
  note: string
  active: boolean
}

type FieldKey = keyof PromoInput

const EMPTY: Draft = { personal: false, owner: null, code: "", percent: "", startDay: "", endDay: "", maxUses: "", perCustomer: "1", minOrder: "", note: "", active: true }

const fromValues = (value: Omit<PromoInput, "ownerId"> & { ownerId: string | null }, owner: PromoOwner | null): Draft => ({
  personal: Boolean(value.ownerId),
  owner: value.ownerId ? owner : null,
  code: value.code,
  percent: String(value.percent),
  startDay: value.startDay ?? "",
  endDay: value.endDay ?? "",
  maxUses: value.ownerId || value.maxUses === null ? "" : String(value.maxUses),
  perCustomer: String(value.perCustomer),
  minOrder: value.minOrder > 0 ? String(value.minOrder) : "",
  note: value.note,
  active: value.active,
})

/** What the server is sent. A personal code with nobody chosen sends "" and is stopped by the form first. */
const toInput = (draft: Draft) => ({
  code: draft.code,
  percent: draft.percent,
  ownerId: draft.personal ? draft.owner?.id ?? "" : null,
  startDay: draft.startDay,
  endDay: draft.endDay,
  maxUses: draft.personal ? "" : draft.maxUses,
  perCustomer: draft.perCustomer,
  minOrder: draft.minOrder,
  active: draft.active,
  note: draft.note,
})

/** The order of the fields on the page, for "go to the first problem". */
const FIELD_ORDER: FieldKey[] = ["ownerId", "code", "percent", "startDay", "endDay", "minOrder", "maxUses", "perCustomer", "note"]
const FIELD_ID: Partial<Record<FieldKey, string>> = {
  ownerId: "promo-owner",
  code: "promo-code",
  percent: "promo-percent",
  startDay: "promo-start",
  endDay: "promo-end",
  maxUses: "promo-max",
  perCustomer: "promo-per",
  minOrder: "promo-min",
  note: "promo-note",
}

/** Field names for the list of what to fix in the side column. */
const FIELD_LABEL: Record<FieldKey, string> = {
  ownerId: "Покупець",
  code: "Код",
  percent: "Знижка",
  startDay: "Діє з",
  endDay: "Діє по",
  minOrder: "Мінімальна сума",
  maxUses: "Скільки замовлень загалом",
  perCustomer: "Замовлень на одного покупця",
  note: "Нотатка",
  active: "Код діє",
}

const CYRILLIC =/[Ѐ-ӿ]/
const QUICK_DAYS = [7, 14, 30]
const OFFLINE = "Немає зв’язку із сервером. Перевірте інтернет і спробуйте ще раз."
const timeFormat = new Intl.DateTimeFormat("uk-UA", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Kiev" })
/** "18 листопада 2026", the Kyiv calendar day of a moment. */
const dateFormat = { format: (date: Date) => formatPromoDay(kyivDay(date)) }

const ownerText = (owner: PromoOwner | null) => (owner ? [owner.name, owner.email].filter(Boolean).join(", ") || "покупець без імені" : "")

export type PromoFormDetail = {
  status: PromoStatus
  left: number | null
  createdAt: string | null
  createdBy: string
}

const KIND_OPTIONS: SelectOption[] = [
  { value: "shared", label: "Усі покупці", hint: "Будь-хто, хто знає код" },
  { value: "personal", label: "Один покупець", hint: "Лише в акаунті цього покупця" },
]

/** A number field with its unit inside it, like the price of a product: "15 %", "1000 ₴". */
function UnitInput({
  id,
  value,
  onChange,
  unit,
  invalid,
  maxLength,
  placeholder,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  unit?: string
  invalid?: boolean
  maxLength: number
  placeholder?: string
}) {
  return (
    <div className="relative">
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(adminInput, "tabular-nums", unit && "pr-8", invalid && "border-red-600")}
      />
      {unit && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500" aria-hidden="true">
          {unit}
        </span>
      )}
    </div>
  )
}

/**
 * Creating and changing a promo code ("Промокоди" → a code). One form for both:
 * without `record` it creates, with it it edits. The side column says in plain
 * words what the code will do, from the values as they are typed.
 */
export function PromoForm({
  record,
  owner: initialOwner,
  ownerMissing = false,
  today,
  detail,
  justCreated = false,
  stats,
  uses,
  customers,
}: {
  record: PromoRecord | null
  owner: PromoOwner | null
  /** Everybody the code can be given to, for the searchable «Покупець» select. */
  customers: PromoOwnerOption[]
  /** The page was opened for a customer (?owner=) that is not in the database. */
  ownerMissing?: boolean
  /** Today in Kyiv, "YYYY-MM-DD", from the server. */
  today: string
  detail?: PromoFormDetail
  justCreated?: boolean
  /** Server-rendered blocks of the edit page: the numbers above the form and the list of uses under it. */
  stats?: React.ReactNode
  uses?: React.ReactNode
}) {
  const router = useRouter()
  const editing = Boolean(record)
  const usedCount = record?.usedCount ?? 0
  const locked = usedCount > 0

  const [saved, setSaved] = useState<Draft>(() =>
    record ? fromValues(record, initialOwner) : initialOwner || ownerMissing ? { ...EMPTY, personal: true, owner: initialOwner } : EMPTY,
  )
  const [values, setValues] = useState<Draft>(saved)
  const [showErrors, setShowErrors] = useState(false)
  const [serverErrors, setServerErrors] = useState<PromoErrors>({})
  const [formError, setFormError] = useState("")
  const [saving, setSaving] = useState(false)
  // The new code is stored and its page is loading.
  const [opening, setOpening] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [created, setCreated] = useState(justCreated)
  const [notice, setNotice] = useState<{ tone: "ok" | "problem"; text: string } | null>(
    ownerMissing ? { tone: "problem", text: "Покупця з посилання не знайдено: можливо, його видалили. Оберіть покупця нижче." } : null,
  )
  const [switching, setSwitching] = useState(false)
  const [mailing, setMailing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const formRef = useRef<HTMLFormElement>(null)
  const leaving = useRef(false)

  const input = useMemo(() => toInput(values), [values])
  const dirty = useMemo(() => JSON.stringify(input) !== JSON.stringify(toInput(saved)), [input, saved])

  // The rules of lib/promo/rules.ts, as the server will apply them, plus "somebody must be chosen".
  const live = useMemo(() => {
    const checked = cleanPromoInput(input)
    const errors: PromoErrors = { ...checked.errors }
    if (values.personal && !values.owner) errors.ownerId = "Оберіть покупця зі списку."
    return { value: checked.value, errors }
  }, [input, values.personal, values.owner])

  const shown: PromoErrors = { ...(showErrors ? live.errors : {}), ...serverErrors }
  // A Cyrillic letter in the code is a mistake worth saying at once: the keyboard is on the wrong language.
  if (!serverErrors.code && CYRILLIC.test(values.code)) shown.code ="Схоже, увімкнено українську розкладку. Код пишеться латинськими літерами: ZYMA15, а не ЗИМА15."
  const firstShown = FIELD_ORDER.find((key) => shown[key])

  // The "created" note is a one-off: drop ?created=1 so a reload does not show it again.
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

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setValues((previous) => ({ ...previous, [key]: value }))
    const field: FieldKey | null = key === "owner" || key === "personal" ? "ownerId" : key in FIELD_ID ? (key as FieldKey) : null
    if (field) {
      setServerErrors((previous) => {
        if (!previous[field] && !(field === "startDay" && previous.endDay)) return previous
        const next = { ...previous }
        delete next[field]
        if (field === "startDay") delete next.endDay
        return next
      })
    }
    setFormError("")
    setCreated(false)
  }

  const goTo = useCallback((field: FieldKey) => {
    requestAnimationFrame(() => {
      const target = document.getElementById(FIELD_ID[field] ?? "") ?? (field === "ownerId" ? document.getElementById("promo-kind-personal") : null)
      target?.scrollIntoView({ block: "center", behavior: "smooth" })
      target?.focus({ preventScroll: true })
    })
  }, [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (saving || opening || (editing && !dirty)) return
    setShowErrors(true)
    setFormError("")
    setNotice(null)
    const problem = FIELD_ORDER.find((key) => live.errors[key])
    if (problem) {
      goTo(problem)
      return
    }
    setSaving(true)
    const sent = values
    try {
      const result = await savePromoCode(toInput(sent), record?.id)
      if (!result.ok) {
        setServerErrors(result.errors ?? {})
        setFormError(result.error)
        const first = FIELD_ORDER.find((key) => result.errors?.[key])
        if (first) goTo(first)
        return
      }
      if (!editing) {
        leaving.current = true
        setOpening(true)
        router.push(`/admin/promocodes/${result.id}?created=1`)
        return
      }
      // What was stored, as the form shows it: capitals, no spaces, empty for "no limit".
      const next = fromValues(cleanPromoInput(toInput(sent)).value, sent.owner)
      setSaved(next)
      setValues(next)
      setServerErrors({})
      setShowErrors(false)
      setSavedAt(new Date())
      router.refresh()
    } catch {
      setFormError(OFFLINE)
    } finally {
      setSaving(false)
    }
  }

  /** «Вимкнути код» / «Увімкнути код» in the header: takes effect at once, without the save button. */
  const switchActive = async () => {
    if (!record) return
    const next = !saved.active
    setSwitching(true)
    setNotice(null)
    try {
      const result = await setPromoCodeActive(record.id, next)
      if (!result.ok) {
        setNotice({ tone: "problem", text: result.error })
        return
      }
      const wasActive = saved.active
      setSaved((previous) => ({ ...previous, active: next }))
      // An unsaved change of the switch below stays as the admin left it.
      setValues((previous) => (previous.active === wasActive ? { ...previous, active: next } : previous))
      setNotice({ tone: "ok", text: next ? "Код увімкнено: ним знову можна скористатися." : "Код вимкнено: ним більше не можна скористатися, доки ви його не ввімкнете." })
      router.refresh()
    } catch {
      setNotice({ tone: "problem", text: OFFLINE })
    } finally {
      setSwitching(false)
    }
  }

  const sendLetter = async () => {
    if (!record) return
    setMailing(true)
    setNotice(null)
    try {
      const result = await emailPromoCode(record.id)
      setNotice(result.ok ? { tone: "ok", text: `Лист із кодом надіслано на ${saved.owner?.email || "адресу покупця"}.` } : { tone: "problem", text: result.error })
    } catch {
      setNotice({ tone: "problem", text: OFFLINE })
    } finally {
      setMailing(false)
    }
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(saved.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setNotice({ tone: "problem", text: `Не вдалося скопіювати. Виділіть код ${saved.code} і скопіюйте його вручну.` })
    }
  }

  const remove = async () => {
    if (!record) return
    setDeleting(true)
    setDeleteError("")
    try {
      const result = await deletePromoCode(record.id)
      if (!result.ok) {
        setDeleteError(result.error)
        setDeleting(false)
        return
      }
      // The dialog stays busy until the list opens; "replace", so Back does not lead to a page that is gone.
      leaving.current = true
      router.replace("/admin/promocodes")
    } catch {
      setDeleteError(OFFLINE)
      setDeleting(false)
    }
  }

  /* --------------------------------- words -------------------------------- */

  const summary = describePromo({ value: live.value, errors: live.errors, personal: values.personal, ownerText: ownerText(values.owner), usedCount, today })
  const todo = FIELD_ORDER.flatMap((key) => {
    const text = live.errors[key]
    if (!text) return []
    const label = FIELD_LABEL[key]
    // Some messages already start with the field's name ("Код: …", "Знижка: …").
    return [text.startsWith(`${label}:`) || key === "ownerId" ? text : `${label}: ${text.charAt(0).toLowerCase()}${text.slice(1)}`]
  })
  const quickBase = values.startDay && values.startDay > today ? values.startDay : today
  const perCustomer = Number(values.perCustomer)

  let note: React.ReactNode = null
  if (opening) note = <span className="text-neutral-700">Промокод створено. Відкриваємо його сторінку…</span>
  else if (saving) note = <span className="text-neutral-700">Зберігаємо…</span>
  else if (formError || (firstShown && showErrors))
    note = (
      <span role="alert" className="text-red-700">
        {formError || "Виправте позначені поля."}{" "}
        {firstShown && (
          <button type="button" className="font-medium underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600" onClick={() => goTo(firstShown)}>
            Перейти до поля
          </button>
        )}
      </span>
    )
  else if (dirty)
    note = (
      <span className="inline-flex items-center gap-2 text-neutral-700">
        <span className="h-2 w-2 shrink-0 rounded-full bg-neutral-900" aria-hidden="true" />
        {editing ? "Є незбережені зміни" : "Промокод ще не створено"}
      </span>
    )
  else if (savedAt) note = <span className="text-neutral-700">Зміни збережено о {timeFormat.format(savedAt)}.</span>
  else if (created) note = <span className="text-neutral-700">Промокод створено. Скопіюйте код і поширте його{saved.personal ? " або надішліть покупцю листом" : ""}.</span>

  const saveLabel = saving ? "Зберігаємо…" : opening ? "Створено" : !editing ? "Створити промокод" : dirty ? "Зберегти" : savedAt ? "Збережено" : "Змін немає"

  /* -------------------------------- header -------------------------------- */

  const headerActions = record ? (
    <>
      <button type="button" className={adminButton.icon} onClick={() => void copyCode()} aria-label={copied ? "Код скопійовано" : "Скопіювати код"} data-tip={copied ? "Скопійовано" : "Скопіювати код"}>
        {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      </button>
      {saved.personal && (
        <button
          type="button"
          className={adminButton.secondary}
          onClick={() => void sendLetter()}
          disabled={mailing || dirty || !saved.owner?.email}
          data-tip={
            dirty
              ? "Спершу збережіть зміни: у листі будуть умови, які збережено."
              : !saved.owner?.email
                ? "У покупця немає адреси e-mail."
                : `Лист із кодом і його умовами піде на ${saved.owner.email}.`
          }
        >
          {mailing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}
          {mailing ? "Надсилаємо…" : "Надіслати покупцю листом"}
        </button>
      )}
      <button
        type="button"
        className={adminButton.secondary}
        onClick={() => void switchActive()}
        disabled={switching}
        data-tip={saved.active ? "Код перестане діяти одразу, без натискання «Зберегти». Увімкнути знову можна будь-коли." : "Код знову діятиме одразу: у межах своїх дат і кількості замовлень."}
      >
        {switching && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {saved.active ? "Вимкнути код" : "Увімкнути код"}
      </button>
    </>
  ) : undefined

  const description = record && detail ? (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <Pill tone={STATUS_TONE[detail.status]} tip={statusTip(detail.status, record)}>
        {PROMO_STATUS_LABEL[detail.status]}
      </Pill>
      <span>
        {record.source !== "admin" && SOURCE_LABEL[record.source]
          ? `${SOURCE_LABEL[record.source]}${detail.createdAt ? `${record.source === "legacy" ? " " : ", "}${dateFormat.format(new Date(detail.createdAt))}` : ""}`
          : `Створено${detail.createdAt ? ` ${dateFormat.format(new Date(detail.createdAt))}` : ""}${detail.createdBy ? `, ${detail.createdBy}` : ""}`}
      </span>
    </span>
  ) : (
    "Оберіть, для кого код і яку знижку він дає. Решту можна залишити як є: тоді код діє без обмежень у часі."
  )

  // The chosen customer is always in the list, even one past the list's limit.
  const ownerOptions: SelectOption[] = useMemo(() => {
    const rows = values.owner && !customers.some((customer) => customer.id === values.owner?.id) ? [{ ...values.owner, phone: "" }, ...customers] : customers
    return rows.map((customer) => ({
      value: customer.id,
      label: customer.name || customer.email || "Покупець без імені",
      hint: [customer.name ? customer.email : "", customer.phone].filter(Boolean).join(", ") || undefined,
      // "+380 67 430 1588" is also found by "0674301588".
      keywords: customer.phone.replace(/\D/g, "") || undefined,
    }))
  }, [customers, values.owner])

  const chooseOwner = (id: string) => {
    const found = customers.find((customer) => customer.id === id)
    set("owner", found ? { id: found.id, name: found.name, email: found.email } : null)
  }

  const nothingYet = !values.code && !values.percent

  return (
    <AdminPage
      title={record ? saved.code : "Новий промокод"}
      description={record && detail ? description : "Вкажіть код і знижку. Решту можна залишити як є: тоді код діє для всіх і без обмежень у часі."}
      back={{ href: "/admin/promocodes", label: "Промокоди" }}
      actions={headerActions}
    >
      <form ref={formRef} onSubmit={submit} noValidate className="space-y-4">
        {notice && (
          <p
            role={notice.tone === "problem" ? "alert" : "status"}
            className={cn("rounded-lg border px-4 py-3 text-sm", notice.tone === "problem" ? "border-red-200 bg-red-50 text-red-900" : "border-neutral-200 bg-white text-neutral-900")}
          >
            {notice.text}
          </p>
        )}

        {stats}

        <FormLayout
          aside={
            <AsideCard title="Як діятиме код">
              {nothingYet ? (
                <p className="text-sm text-neutral-500">Тут буде видно, як діятиме код: для кого, яка знижка і до якого дня.</p>
              ) : (
                <>
                  <div className="rounded-md border border-dashed border-neutral-300 px-3 py-3 text-center">
                    <p className="break-all font-mono text-base font-semibold tracking-wide text-neutral-900">{values.code || "Код ще не вказано"}</p>
                    <p className="mt-0.5 text-sm text-neutral-600">{live.errors.percent ? "Знижку ще не вказано" : `Знижка ${live.value.percent}%`}</p>
                  </div>
                  <div aria-live="polite" className="space-y-2 text-sm text-neutral-900">
                    {summary.map((sentence) => (
                      <p key={sentence}>{sentence}</p>
                    ))}
                  </div>
                </>
              )}
              {todo.length > 0 && (showErrors || !nothingYet) && (
                <div className="border-t border-neutral-100 pt-3 text-sm">
                  <p className="font-medium text-neutral-900">{editing ? "Щоб зберегти, виправте:" : "Щоб створити код, ще потрібно:"}</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-neutral-700">
                    {todo.map((text) => (
                      <li key={text}>{text}</li>
                    ))}
                  </ul>
                </div>
              )}
              {record && detail && (
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-t border-neutral-100 pt-3 text-sm">
                  <dt className="text-neutral-500">Використано</dt>
                  <dd className="tabular-nums text-neutral-900">{usageText(record)}</dd>
                  <dt className="text-neutral-500">Залишилось</dt>
                  <dd className="tabular-nums text-neutral-900">{detail.left === null ? "без обмеження" : `${formatPrice(detail.left)} ${plural(detail.left, ["замовлення", "замовлення", "замовлень"])}`}</dd>
                </dl>
              )}
            </AsideCard>
          }
        >
          <Panel title="Основне">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Код"
                htmlFor="promo-code"
                error={shown.code}
                hint={locked ? "Кодом уже скористалися, тому його текст не змінити: він записаний у замовленнях." : "Латинські літери, цифри й дефіс. Наприклад: ZYMA15."}
                tip="Покупець вводить код під час оформлення замовлення. Великі й малі літери не розрізняються, пробіли не враховуються. Від 3 до 32 символів."
              >
                <div className="flex gap-2">
                  <input
                    id="promo-code"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={32}
                    placeholder="ZYMA15"
                    disabled={locked}
                    value={values.code}
                    aria-invalid={shown.code ? true : undefined}
                    onChange={(event) => set("code", normalizePromoCode(event.target.value))}
                    className={cn(adminInput, "min-w-0 flex-1 font-mono uppercase tracking-wide", shown.code && "border-red-600")}
                  />
                  {!locked && (
                    <button
                      type="button"
                      className={adminButton.secondary}
                      onClick={() => set("code", randomPromoCode())}
                      data-tip="Випадковий код, який важко вгадати. Без літер, які легко сплутати: O і 0, I і 1."
                    >
                      <Shuffle className="h-4 w-4" aria-hidden="true" />
                      Згенерувати
                    </button>
                  )}
                </div>
              </Field>
              <Field label="Знижка" htmlFor="promo-percent" error={shown.percent} hint={`Від ${PROMO_PERCENT_MIN} до ${PROMO_PERCENT_MAX} %.`} tip="Знижка рахується від вартості товарів у замовленні, без доставки.">
                <UnitInput id="promo-percent" value={values.percent} onChange={(value) => set("percent", value)} unit="%" maxLength={3} placeholder="15" invalid={Boolean(shown.percent)} />
              </Field>
              <Field
                label="Для кого"
                htmlFor="promo-kind"
                hint={locked ? "Кодом уже скористалися, тому це не змінити." : undefined}
                tip="Код для всіх підходить кожному, хто його знає: для акцій, соцмереж і розсилок. Код для одного покупця діє лише в його акаунті, і покупець бачить його на сторінці «Мої промокоди»."
              >
                <Select id="promo-kind" options={KIND_OPTIONS} value={values.personal ? "personal" : "shared"} onChange={(value) => set("personal", value === "personal")} searchable={false} disabled={locked} />
              </Field>
              {values.personal && (
                <Field
                  label="Покупець"
                  htmlFor="promo-owner"
                  error={shown.ownerId}
                  hint={
                    values.owner ? (
                      <Link href={`/admin/clients/${values.owner.id}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-black">
                        Відкрити картку покупця
                      </Link>
                    ) : (
                      "Шукайте за ім’ям, e-mail або телефоном."
                    )
                  }
                  tip="Скористатися кодом можна, лише увійшовши в акаунт цього покупця."
                >
                  <Select
                    id="promo-owner"
                    options={ownerOptions}
                    value={values.owner?.id ?? ""}
                    onChange={chooseOwner}
                    searchable
                    placeholder="Оберіть покупця"
                    searchPlaceholder="Ім’я, e-mail або телефон"
                    emptyText="Нікого не знайдено"
                    disabled={locked}
                    invalid={Boolean(shown.ownerId)}
                  />
                </Field>
              )}
              <Field
                label="Нотатка для себе"
                htmlFor="promo-note"
                optional
                error={shown.note}
                className="sm:col-span-2"
                hint="Покупці її не бачать."
                tip={`Навіщо цей код і де ви його поширили. Видно лише в адмінці, у списку промокодів. До ${PROMO_NOTE_MAX} символів.`}
              >
                <input
                  id="promo-note"
                  autoComplete="off"
                  maxLength={PROMO_NOTE_MAX}
                  placeholder="Наприклад: розіграш в Instagram, листопад"
                  value={values.note}
                  aria-invalid={shown.note ? true : undefined}
                  onChange={(event) => set("note", event.target.value)}
                  className={cn(adminInput, shown.note && "border-red-600")}
                />
              </Field>
              {!editing && (
                <div className="sm:col-span-2">
                  <Switch
                    id="promo-active"
                    checked={values.active}
                    onChange={(next) => set("active", next)}
                    label="Код діє"
                    hint={values.active ? "Покупці зможуть застосувати код одразу після створення, у межах дат і обмежень." : "Код буде вимкнено: ним не можна скористатися, доки ви його не ввімкнете."}
                  />
                </div>
              )}
            </div>
          </Panel>

          <Panel title="Строк дії" description="Обидва дні включно, за київським часом.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Діє з" htmlFor="promo-start" optional error={shown.startDay} hint="Порожньо — діє одразу.">
                <input
                  id="promo-start"
                  type="date"
                  value={values.startDay}
                  aria-invalid={shown.startDay ? true : undefined}
                  onChange={(event) => set("startDay", event.target.value)}
                  className={cn(adminInput, "tabular-nums", shown.startDay && "border-red-600")}
                />
              </Field>
              <Field label="Діє по" htmlFor="promo-end" optional error={shown.endDay} hint="Порожньо — без кінцевої дати.">
                <input
                  id="promo-end"
                  type="date"
                  value={values.endDay}
                  min={values.startDay || undefined}
                  aria-invalid={shown.endDay ? true : undefined}
                  onChange={(event) => set("endDay", event.target.value)}
                  className={cn(adminInput, "tabular-nums", shown.endDay && "border-red-600")}
                />
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-neutral-600">Діє протягом:</span>
              {QUICK_DAYS.map((days) => {
                const end = addDays(quickBase, days - 1)
                const chosen = values.endDay === end
                return (
                  <button
                    key={days}
                    type="button"
                    aria-pressed={chosen}
                    className={cn(adminButtonSm.secondary, chosen && "border-black bg-neutral-100")}
                    onClick={() => set("endDay", end)}
                    data-tip={`Останній день — ${formatPromoDay(end)}: ${days} днів ${quickBase === today ? "від сьогодні" : "від першого дня"}, обидва включно.`}
                  >
                    {days} днів
                  </button>
                )
              })}
              {values.endDay && (
                <button type="button" className={adminButtonSm.ghost} onClick={() => set("endDay", "")}>
                  Без кінцевої дати
                </button>
              )}
            </div>
          </Panel>

          <Panel title="Обмеження" description="Порожнє поле — без обмеження.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Мінімальна сума"
                htmlFor="promo-min"
                optional
                error={shown.minOrder}
                hint="Товарів у кошику, до знижки."
                tip="Рахується вартість товарів у кошику до знижки, без доставки. Якщо менше — покупець побачить, що код діє від цієї суми."
              >
                <UnitInput id="promo-min" value={values.minOrder} onChange={(value) => set("minOrder", value)} unit="₴" maxLength={9} placeholder="1000" invalid={Boolean(shown.minOrder)} />
              </Field>
              {!values.personal && (
                <Field
                  label="Замовлень загалом"
                  htmlFor="promo-max"
                  optional
                  error={shown.maxUses}
                  hint="Від усіх покупців разом."
                  tip="Коли стільки замовлень оформлять з кодом, він перестане діяти для всіх. Скасоване замовлення повертає використання."
                >
                  <UnitInput id="promo-max" value={values.maxUses} onChange={(value) => set("maxUses", value)} maxLength={7} placeholder="500" invalid={Boolean(shown.maxUses)} />
                </Field>
              )}
              <Field
                label={values.personal ? "Скільки разів" : "Разів на одного покупця"}
                htmlFor="promo-per"
                error={shown.perCustomer}
                hint={
                  values.personal
                    ? "Скільки замовлень покупець може оформити з кодом."
                    : Number.isInteger(perCustomer) && perCustomer > 1
                      ? `Кожен покупець — ${perCustomer} ${plural(perCustomer, ["раз", "рази", "разів"])}.`
                      : "Зазвичай 1: кожен покупець — один раз."
                }
                tip="Покупця впізнають за акаунтом, а під час оформлення без входу — за адресою e-mail."
              >
                <UnitInput id="promo-per" value={values.perCustomer} onChange={(value) => set("perCustomer", value)} maxLength={3} invalid={Boolean(shown.perCustomer)} />
              </Field>
            </div>
          </Panel>
        </FormLayout>

        {uses}

        {record &&
          (usedCount === 0 ? (
            <section aria-labelledby="promo-delete-heading" className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg border border-neutral-200 bg-white px-4 py-3">
              <div className="min-w-0">
                <h2 id="promo-delete-heading" className="text-sm font-semibold text-neutral-900">
                  Видалити промокод
                </h2>
                <p className="mt-0.5 text-sm text-neutral-500">Ним ще ніхто не скористався, тож його можна видалити назавжди.</p>
              </div>
              <button type="button" className={adminButton.danger} onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Видалити промокод…
              </button>
            </section>
          ) : (
            <p className="text-sm text-neutral-500">
              Видалити цей код не можна: ним уже скористалися, і він записаний у замовленнях. Якщо він більше не потрібен, вимкніть його кнопкою «Вимкнути код» угорі.
            </p>
          ))}

        <SaveBar
          note={<div aria-live="polite">{note}</div>}
          start={
            editing ? (
              <button
                type="button"
                className={adminButton.ghost}
                disabled={!dirty || saving}
                onClick={() => {
                  setValues(saved)
                  setShowErrors(false)
                  setServerErrors({})
                  setFormError("")
                }}
              >
                Скасувати зміни
              </button>
            ) : (
              <Link href="/admin/promocodes" className={adminButton.ghost}>
                Скасувати
              </Link>
            )
          }
        >
          <button type="submit" className={cn(adminButton.primary, "min-w-36")} disabled={saving || opening || (editing && !dirty)} aria-keyshortcuts="Control+S">
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {saveLabel}
          </button>
        </SaveBar>
      </form>

      {record && (
        <AdminDialog
          open={confirmDelete}
          onClose={() => {
            setConfirmDelete(false)
            setDeleteError("")
          }}
          busy={deleting}
          tone="danger"
          title="Видалити промокод?"
          description={
            <>
              Код <span className="font-mono font-semibold text-neutral-900">{saved.code}</span> зникне назавжди. Ним ще ніхто не скористався, тож жодне замовлення не зміниться.
            </>
          }
          footer={
            <>
              <button type="button" className={adminButton.secondary} onClick={() => setConfirmDelete(false)} disabled={deleting}>
                Скасувати
              </button>
              <button type="button" className={adminButton.dangerSolid} onClick={() => void remove()} disabled={deleting}>
                {deleting ? "Видаляємо…" : "Видалити код"}
              </button>
            </>
          }
        >
          {deleteError && (
            <p role="alert" className="text-sm text-red-700">
              {deleteError}
            </p>
          )}
        </AdminDialog>
      )}
    </AdminPage>
  )
}
