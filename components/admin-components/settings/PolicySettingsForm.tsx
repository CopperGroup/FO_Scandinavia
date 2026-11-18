"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import Select from "@/components/admin/Select"
import { AsideCard, Field, FormLayout, Panel, SaveBar, adminButton, adminInput } from "@/components/admin/ui"
import { savePolicies } from "@/lib/actions/policy.actions"
import { DELIVERY_DAYS_MAX, RETURN_DAYS_MAX, cleanPolicies, type PolicyErrors, type ReturnFees, type StorePolicies } from "@/lib/policies"
import { cn } from "@/lib/utils"

/** The form keeps what is typed, as text: an empty field means "not stated". */
type Draft = {
  returnDays: string
  returnFees: ReturnFees
  handlingMin: string
  handlingMax: string
  transitMin: string
  transitMax: string
  shippingCost: string
}

const text = (value: number | null) => (value === null ? "" : String(value))

const toDraft = (policies: StorePolicies): Draft => ({
  returnDays: policies.returnDays > 0 ? String(policies.returnDays) : "",
  returnFees: policies.returnFees,
  handlingMin: text(policies.handlingMin),
  handlingMax: text(policies.handlingMax),
  transitMin: text(policies.transitMin),
  transitMax: text(policies.transitMax),
  shippingCost: text(policies.shippingCost),
})

const dayWord = (count: number) => {
  const tens = count % 100
  const ones = count % 10
  if (tens >= 11 && tens <= 14) return "днів"
  if (ones === 1) return "день"
  if (ones >= 2 && ones <= 4) return "дні"
  return "днів"
}
const daysLabel = (min: number, max: number) => (min === max ? `${min} ${dayWord(min)}` : `${min}–${max} ${dayWord(max)}`)

const FEES_OPTIONS: { value: ReturnFees; label: string; hint?: string }[] = [
  { value: "", label: "Не вказувати" },
  { value: "buyer", label: "Покупець", hint: "Покупець платить за пересилання назад" },
  { value: "free", label: "Магазин", hint: "Повернення для покупця безкоштовне" },
]

/** Two short number fields: "від … до … днів". */
function DaysRange({
  id,
  min,
  max,
  invalid,
  onMin,
  onMax,
}: {
  id: string
  min: string
  max: string
  invalid: boolean
  onMin: (value: string) => void
  onMax: (value: string) => void
}) {
  const input = cn(adminInput, "w-20 text-center tabular-nums", invalid && "border-red-600")
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-700">
      <span>від</span>
      <input id={id} inputMode="numeric" autoComplete="off" maxLength={2} className={input} value={min} aria-invalid={invalid || undefined} onChange={(event) => onMin(event.target.value)} />
      <label htmlFor={`${id}-max`}>до</label>
      <input id={`${id}-max`} inputMode="numeric" autoComplete="off" maxLength={2} className={input} value={max} aria-invalid={invalid || undefined} onChange={(event) => onMax(event.target.value)} />
      <span>днів</span>
    </div>
  )
}

/**
 * "Налаштування" → "Доставка і повернення": the terms search engines are told
 * about every product (return window, who pays for a return, delivery time
 * and cost). The side column shows what they will read; the texts customers
 * read stay on their own pages.
 */
export default function PolicySettingsForm({
  initial,
  freeDeliveryLabel,
  changed,
}: {
  initial: StorePolicies
  /** The free-delivery sum as text ("3 000 ₴"), or "" when free delivery is off. */
  freeDeliveryLabel: string
  /** Who saved last and when, as text. */
  changed: string
}) {
  const router = useRouter()
  const [saved, setSaved] = useState(() => toDraft(initial))
  const [values, setValues] = useState(saved)
  const [errors, setErrors] = useState<PolicyErrors>({})
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(saved), [values, saved])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setValues((previous) => ({ ...previous, [key]: value }))
    setErrors({})
    setMessage(null)
    setDone(false)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const checked = cleanPolicies(values)
    if (Object.keys(checked.errors).length > 0) {
      setErrors(checked.errors)
      setMessage("Виправте позначені поля.")
      return
    }
    setBusy(true)
    setMessage(null)
    setDone(false)
    try {
      const result = await savePolicies(values)
      if (!result.ok) {
        setErrors(result.errors ?? {})
        setMessage(result.error)
      } else {
        const next = toDraft(result.policies)
        setErrors({})
        setSaved(next)
        setValues(next)
        setDone(true)
        router.refresh()
      }
    } catch {
      setMessage("Немає зв’язку із сервером. Перевірте інтернет і спробуйте ще раз.")
    } finally {
      setBusy(false)
    }
  }

  // What search engines will read, from the values as they are typed.
  const preview = cleanPolicies(values).policies
  const returnsLine =
    preview.returnDays > 0
      ? `Повернення протягом ${preview.returnDays} ${dayWord(preview.returnDays)}${preview.returnFees === "free" ? ", безкоштовне" : preview.returnFees === "buyer" ? ", пересилання за рахунок покупця" : ""}.`
      : "Про повернення нічого не повідомляється."
  const handling = preview.handlingMin !== null && preview.handlingMax !== null ? daysLabel(preview.handlingMin, preview.handlingMax) : ""
  const transit = preview.transitMin !== null && preview.transitMax !== null ? daysLabel(preview.transitMin, preview.transitMax) : ""
  const timeLine = handling || transit ? [handling && `відправлення за ${handling}`, transit && `у дорозі ${transit}`].filter(Boolean).join(", ") : ""
  const deliveryLine =
    preview.shippingCost !== null
      ? `Доставка ${preview.shippingCost} ₴${freeDeliveryLabel ? `, для товарів від ${freeDeliveryLabel} — 0 ₴` : ""}${timeLine ? `; ${timeLine}` : ""}.`
      : freeDeliveryLabel
        ? `Доставка 0 ₴ лише для товарів від ${freeDeliveryLabel}${timeLine ? `; ${timeLine}` : ""}. Для дешевших про доставку нічого не повідомляється.`
        : "Про доставку нічого не повідомляється: не вказано її вартість."

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormLayout
        asideTop={112}
        aside={
          <AsideCard title="Що прочитають пошукові системи" top={112}>
            <ul className="space-y-2 text-sm text-neutral-900">
              <li className="rounded-md bg-neutral-50 px-3 py-2">{returnsLine}</li>
              <li className="rounded-md bg-neutral-50 px-3 py-2">{deliveryLine}</li>
            </ul>
            <p className="text-sm text-neutral-700">
              Ці умови стоять у коді кожної сторінки товару. Google може показати їх у пошуку поруч із ціною: «повернення 14 днів», «доставка 2–4 дні».
            </p>
            <p className="text-xs text-neutral-500">
              Покупці читають умови на сторінках{" "}
              <Link href="/admin/pages?page=delivery" className="font-medium text-neutral-900 underline underline-offset-2">
                «Доставка та оплата»
              </Link>{" "}
              і{" "}
              <Link href="/admin/pages?page=returns" className="font-medium text-neutral-900 underline underline-offset-2">
                «Обмін і повернення»
              </Link>
              . Тут має бути те саме, що написано там.
            </p>
            {changed && <p className="border-t border-neutral-100 pt-3 text-xs text-neutral-500">Змінено: {changed}.</p>}
          </AsideCard>
        }
      >
        <Panel title="Повернення" description="Скільки часу покупець має, щоб повернути товар, і хто платить за пересилання назад.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Строк повернення, днів"
              htmlFor="policy-return-days"
              error={errors.returnDays}
              hint="Порожнє поле: про повернення не повідомляти."
              tip={`За законом про захист прав споживачів покупець має щонайменше 14 днів. Більший строк можна вказати, якщо ви справді його даєте. Найбільше ${RETURN_DAYS_MAX}.`}
            >
              <input
                id="policy-return-days"
                inputMode="numeric"
                autoComplete="off"
                maxLength={3}
                className={cn(adminInput, "w-28 tabular-nums", errors.returnDays && "border-red-600")}
                value={values.returnDays}
                aria-invalid={errors.returnDays ? true : undefined}
                onChange={(event) => set("returnDays", event.target.value)}
              />
            </Field>
            <Field
              label="Хто платить за пересилання повернення"
              htmlFor="policy-return-fees"
              tip="Якщо умови різні для різних випадків (наприклад, брак — за рахунок магазину, не підійшов розмір — за рахунок покупця), виберіть «Не вказувати»."
            >
              <Select id="policy-return-fees" options={FEES_OPTIONS} value={values.returnFees} onChange={(value) => set("returnFees", value as ReturnFees)} />
            </Field>
          </div>
        </Panel>

        <Panel title="Доставка" description="Скільки днів минає від замовлення до отримання і скільки доставка коштує покупцеві.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Відправляємо замовлення за"
              htmlFor="policy-handling"
              optional
              error={errors.handling}
              hint="Від оплати чи підтвердження до передачі посилки перевізнику. 0 — того ж дня."
              tip={`Одне число в будь-якому з двох полів означає точний строк. Найбільше ${DELIVERY_DAYS_MAX} днів.`}
            >
              <DaysRange id="policy-handling" min={values.handlingMin} max={values.handlingMax} invalid={Boolean(errors.handling)} onMin={(value) => set("handlingMin", value)} onMax={(value) => set("handlingMax", value)} />
            </Field>
            <Field label="Посилка в дорозі" htmlFor="policy-transit" optional error={errors.transit} hint="Скільки днів везе перевізник по Україні.">
              <DaysRange id="policy-transit" min={values.transitMin} max={values.transitMax} invalid={Boolean(errors.transit)} onMin={(value) => set("transitMin", value)} onMax={(value) => set("transitMax", value)} />
            </Field>
            <Field
              label="Вартість доставки одного замовлення, грн"
              htmlFor="policy-shipping-cost"
              optional
              error={errors.shippingCost}
              className="sm:col-span-2"
              hint={
                freeDeliveryLabel
                  ? `Порожнє поле: вартість не повідомляється. Для товарів від ${freeDeliveryLabel} пошукові системи завжди бачать 0 ₴.`
                  : "Порожнє поле: вартість не повідомляється."
              }
              tip="Пошуковим системам потрібне одне число, а не «за тарифами перевізника». Вкажіть, скільки зазвичай платить покупець за звичайну посилку, або залиште порожнім, якщо не хочете називати суму. Суму безкоштовної доставки змінюють на сторінці «Доставка та оплата»."
            >
              <input
                id="policy-shipping-cost"
                inputMode="decimal"
                autoComplete="off"
                maxLength={8}
                className={cn(adminInput, "w-28 tabular-nums", errors.shippingCost && "border-red-600")}
                value={values.shippingCost}
                aria-invalid={errors.shippingCost ? true : undefined}
                onChange={(event) => set("shippingCost", event.target.value)}
              />
            </Field>
          </div>
        </Panel>
      </FormLayout>

      <SaveBar
        start={
          <button
            type="button"
            className={adminButton.ghost}
            onClick={() => {
              setValues(saved)
              setErrors({})
              setMessage(null)
              setDone(false)
            }}
            disabled={busy || !dirty}
          >
            Скасувати
          </button>
        }
        note={
          message ? (
            <span role="alert" className="text-red-700">
              {message}
            </span>
          ) : done && !dirty ? (
            <span role="status">Збережено. На сайті вже нові умови.</span>
          ) : dirty ? (
            "Не збережено."
          ) : null
        }
      >
        <button type="submit" className={adminButton.primary} disabled={busy || !dirty}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {busy ? "Зберігаємо…" : dirty ? "Зберегти" : "Збережено"}
        </button>
      </SaveBar>
    </form>
  )
}
