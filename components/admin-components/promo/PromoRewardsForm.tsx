"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Field, Panel, SaveBar, adminButton, adminInput } from "@/components/admin/ui"
import { savePromoRewards } from "@/lib/actions/promo-admin.actions"
import { DEFAULT_PROMO_REWARDS, PROMO_PERCENT_MAX, PROMO_PERCENT_MIN, cleanPromoRewards, type PromoRewardErrors, type PromoRewards } from "@/lib/promo/rules"
import { plural } from "@/lib/storefront/format"
import { cn } from "@/lib/utils"
import { Switch } from "./Switch"

type Kind = "welcome" | "review"
type Draft = Record<Kind, { enabled: boolean; percent: string; days: string }>

const toDraft = (rewards: PromoRewards): Draft => ({
  welcome: { enabled: rewards.welcome.enabled, percent: String(rewards.welcome.percent), days: String(rewards.welcome.days) },
  review: { enabled: rewards.review.enabled, percent: String(rewards.review.percent), days: String(rewards.review.days) },
})

/** What the server is sent: numbers where the text is a number, so a wrong value is refused with its own message. */
const toInput = (draft: Draft) => {
  const number = (text: string) => (text.trim() === "" ? NaN : Number(text.trim().replace(",", ".")))
  return {
    welcome: { enabled: draft.welcome.enabled, percent: number(draft.welcome.percent), days: number(draft.welcome.days) },
    review: { enabled: draft.review.enabled, percent: number(draft.review.percent), days: number(draft.review.days) },
  }
}

const BLOCKS: { kind: Kind; title: string; when: string; off: string }[] = [
  {
    kind: "welcome",
    title: "За реєстрацію",
    when: "Покупець отримує код листом, щойно підтвердить свою адресу e-mail під час реєстрації. Код особистий: діє лише в його акаунті.",
    off: "Нові покупці не отримуватимуть коду за реєстрацію. Ті, що вже отримали, діють як раніше.",
  },
  {
    kind: "review",
    title: "За відгук про куплений товар",
    when: "Покупець отримує код, коли залишає відгук про товар, який купив у магазині. Код особистий: діє лише в його акаунті.",
    off: "За нові відгуки код не даватиметься. Видані раніше діють як раніше.",
  },
]

/**
 * "Автоматичні промокоди": the codes the shop gives by itself, for registering
 * and for a review. Changing them affects only codes given from now on.
 */
export function PromoRewardsForm({ initial, changed }: { initial: PromoRewards; changed: string }) {
  const router = useRouter()
  const [saved, setSaved] = useState(() => toDraft(initial))
  const [values, setValues] = useState(saved)
  const [errors, setErrors] = useState<PromoRewardErrors>({})
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(saved), [values, saved])
  const isDefault = JSON.stringify(values) === JSON.stringify(toDraft(DEFAULT_PROMO_REWARDS))

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const set = (kind: Kind, key: "enabled" | "percent" | "days", value: boolean | string) => {
    setValues((previous) => ({ ...previous, [kind]: { ...previous[kind], [key]: value } }))
    setErrors((previous) => {
      const next = { ...previous }
      delete next[`${kind}.${key}` as keyof PromoRewardErrors]
      return next
    })
    setMessage("")
    setDone(false)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy || !dirty) return
    const input = toInput(values)
    const checked = cleanPromoRewards(input)
    const count = Object.keys(checked.errors).length
    if (count > 0) {
      setErrors(checked.errors)
      setMessage(count === 1 ? "Виправте позначене поле." : `Виправте позначені поля: їх ${count}.`)
      return
    }
    setBusy(true)
    setMessage("")
    try {
      const result = await savePromoRewards(input)
      if (!result.ok) {
        setErrors(result.errors ?? {})
        setMessage(result.error)
      } else {
        const next = toDraft(result.rewards)
        setSaved(next)
        setValues(next)
        setErrors({})
        setDone(true)
        router.refresh()
      }
    } catch {
      setMessage("Немає зв’язку із сервером. Перевірте інтернет і спробуйте ще раз.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="text-sm text-neutral-600">
        Ці коди магазин видає сам, без вашої участі. Зміни стосуються лише кодів, виданих після збереження: уже видані діють на тих умовах, з якими їх видали.
      </p>

      {BLOCKS.map((block) => {
        const draft = values[block.kind]
        const percentError = errors[`${block.kind}.percent`]
        const daysError = errors[`${block.kind}.days`]
        const days = Number(draft.days)
        return (
          <Panel key={block.kind} title={block.title} description={block.when}>
            <div className="space-y-4">
              <Switch
                id={`reward-${block.kind}-enabled`}
                checked={draft.enabled}
                onChange={(next) => set(block.kind, "enabled", next)}
                label="Видавати цей код"
                hint={draft.enabled ? "Увімкнено: кожен такий покупець отримає код." : block.off}
              />
              <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
                <Field
                  label="Знижка, %"
                  htmlFor={`reward-${block.kind}-percent`}
                  error={percentError}
                  hint={`Ціле число від ${PROMO_PERCENT_MIN} до ${PROMO_PERCENT_MAX}.`}
                  tip="Знижка рахується від вартості товарів у замовленні, без доставки."
                >
                  <div className="flex items-center gap-2">
                    <input
                      id={`reward-${block.kind}-percent`}
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={2}
                      disabled={!draft.enabled}
                      value={draft.percent}
                      aria-invalid={percentError ? true : undefined}
                      onChange={(event) => set(block.kind, "percent", event.target.value)}
                      className={cn(adminInput, "w-20 text-right tabular-nums", percentError && "border-red-600")}
                    />
                    <span className="text-sm text-neutral-600">%</span>
                  </div>
                </Field>
                <Field
                  label="Скільки днів діє код"
                  htmlFor={`reward-${block.kind}-days`}
                  error={daysError}
                  hint={Number.isInteger(days) && days > 0 ? `Від дня видачі, включно з ним: ${days} ${plural(days, ["день", "дні", "днів"])}.` : "Від 1 до 365 днів."}
                  tip="Рахуються календарні дні за київським часом. День, коли код видано, — перший."
                >
                  <div className="flex items-center gap-2">
                    <input
                      id={`reward-${block.kind}-days`}
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={3}
                      disabled={!draft.enabled}
                      value={draft.days}
                      aria-invalid={daysError ? true : undefined}
                      onChange={(event) => set(block.kind, "days", event.target.value)}
                      className={cn(adminInput, "w-20 text-right tabular-nums", daysError && "border-red-600")}
                    />
                    <span className="text-sm text-neutral-600">{Number.isInteger(days) && days > 0 ? plural(days, ["день", "дні", "днів"]) : "днів"}</span>
                  </div>
                </Field>
              </div>
            </div>
          </Panel>
        )
      })}

      {changed && <p className="text-xs text-neutral-500">Змінено: {changed}.</p>}

      <SaveBar
        start={
          <>
            <button
              type="button"
              className={adminButton.ghost}
              disabled={busy || !dirty}
              onClick={() => {
                setValues(saved)
                setErrors({})
                setMessage("")
                setDone(false)
              }}
            >
              Скасувати зміни
            </button>
            <button
              type="button"
              className={adminButton.ghost}
              disabled={busy || isDefault}
              data-tip={`Реєстрація: −${DEFAULT_PROMO_REWARDS.welcome.percent}%, ${DEFAULT_PROMO_REWARDS.welcome.days} днів. Відгук: −${DEFAULT_PROMO_REWARDS.review.percent}%, ${DEFAULT_PROMO_REWARDS.review.days} днів. Обидва ввімкнені. Після цього натисніть «Зберегти».`}
              onClick={() => {
                setValues(toDraft(DEFAULT_PROMO_REWARDS))
                setErrors({})
                setMessage("")
                setDone(false)
              }}
            >
              Як було спочатку
            </button>
          </>
        }
        note={
          message ? (
            <span role="alert" className="text-red-700">
              {message}
            </span>
          ) : done && !dirty ? (
            <span role="status">Збережено. Нові коди видаватимуться на цих умовах.</span>
          ) : dirty ? (
            <span className="inline-flex items-center gap-2 text-neutral-700">
              <span className="h-2 w-2 shrink-0 rounded-full bg-neutral-900" aria-hidden="true" />
              Є незбережені зміни
            </span>
          ) : null
        }
      >
        <button type="submit" className={adminButton.primary} disabled={busy || !dirty}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {busy ? "Зберігаємо…" : dirty ? "Зберегти" : done ? "Збережено" : "Змін немає"}
        </button>
      </SaveBar>
    </form>
  )
}
