"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import toast from "react-hot-toast"
import { Field, FormLayout, Panel, Pill, SaveBar, adminButton, adminInput } from "@/components/admin/ui"
import { checkNovaPoshtaKey, deleteNovaPoshtaKey, saveNovaPoshtaKey, saveSenderDetails } from "@/lib/actions/store.actions"

type Source = "saved" | "env" | "missing"
type Values = { counterpartyRef: string; contactRef: string; phone: string; name: string }
type Suggestion = Values

export type ApiKeyView = {
  source: Source
  /** Dots and the last four characters; never the key. */
  mask: string
  unreadable: boolean
  canSeal: boolean
  envFallback: boolean
  /** "Ім’я, 17 листопада, 12:40" for a key saved here; empty otherwise. */
  changed: string
}

const WITHOUT_KEY = "Без ключа не працюють вибір міста й відділення під час оформлення замовлення, створення накладних і відстеження посилок."

/**
 * The "Відправник" tab: the Nova Poshta key and the sender data that go into
 * every waybill. The key is pasted here, sealed on the server and never shown
 * again; this component only ever receives its last four characters.
 */
export function SenderForm({
  saved,
  effective,
  sources,
  apiKey,
  problems,
}: {
  saved: Values
  effective: Values
  sources: { counterpartyRef: Source; contactRef: Source; phone: Source }
  apiKey: ApiKeyView
  problems: string[]
}) {
  const router = useRouter()
  const [values, setValues] = useState<Values>(saved)
  const [errors, setErrors] = useState<Partial<Record<keyof Values | "form", string>>>({})
  const [pending, startTransition] = useTransition()
  const dirty = JSON.stringify(values) !== JSON.stringify(saved)

  // After a save the server sends the stored values back: show those.
  const savedKey = JSON.stringify(saved)
  useEffect(() => {
    setValues(JSON.parse(savedKey))
  }, [savedKey])

  const set = (key: keyof Values) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues({ ...values, [key]: event.target.value })
    setErrors({ ...errors, [key]: undefined, form: undefined })
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setErrors({})
    startTransition(async () => {
      try {
        const result = await saveSenderDetails(values)
        if (!result.ok) {
          setErrors({ [result.field ?? "form"]: result.error })
          return
        }
        toast.success("Дані відправника збережено")
        router.refresh()
      } catch {
        setErrors({ form: "Не вдалося зберегти. Спробуйте ще раз." })
      }
    })
  }

  const sourceNote = (key: "counterpartyRef" | "contactRef" | "phone") => {
    if (values[key].trim()) return values[key] === saved[key] ? "Збережено тут." : "Нове значення: буде збережено тут."
    if (sources[key] === "env") return `Поле порожнє, тому береться значення з налаштувань сервера: ${effective[key]}`
    return "Не задано."
  }

  const firstError = errors.form ?? errors.phone ?? errors.counterpartyRef ?? errors.contactRef

  return (
    <div>
      <FormLayout
        aside={
          <Panel title="Готовність">
            {problems.length === 0 ? (
              <div className="text-sm text-neutral-700">
                <Pill tone="ok">Усе готово</Pill>
                <p className="mt-2">Накладні можна створювати з цієї панелі.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-neutral-600">Щоб створювати накладні, залишилося:</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-neutral-900">
                  {problems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
              </>
            )}
          </Panel>
        }
      >
        <ApiKeyPanel
          apiKey={apiKey}
          current={values}
          onSuggestion={(suggestion) => {
            setValues(suggestion)
            setErrors({})
            document.getElementById("sender")?.scrollIntoView({ behavior: "smooth", block: "start" })
          }}
        />

        <form id="sender-form" onSubmit={submit} noValidate>
          <Panel
            id="sender"
            title="Відправник"
            description="Від кого йдуть посилки. Ці дані магазин підставляє в кожну накладну. Найпростіше заповнити їх кнопкою «Перевірити ключ» вище: магазин сам прочитає їх з вашого кабінету Нової пошти."
          >
            <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
              <Field label="Назва або ім’я відправника" htmlFor="sender-name" optional hint="Лише для вас: щоб знати, чий це кабінет.">
                <input id="sender-name" value={values.name} onChange={set("name")} disabled={pending} className={adminInput} />
              </Field>
              <Field label="Телефон відправника" htmlFor="sender-phone" error={errors.phone} hint={sourceNote("phone")}>
                <input id="sender-phone" type="tel" inputMode="tel" value={values.phone} onChange={set("phone")} placeholder="380501234567" disabled={pending} aria-invalid={Boolean(errors.phone)} className={adminInput} />
              </Field>
              <Field label="Код відправника" htmlFor="sender-ref" error={errors.counterpartyRef} hint={sourceNote("counterpartyRef")}>
                <input id="sender-ref" value={values.counterpartyRef} onChange={set("counterpartyRef")} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" spellCheck={false} disabled={pending} aria-invalid={Boolean(errors.counterpartyRef)} className={`${adminInput} font-mono`} />
              </Field>
              <Field label="Код контактної особи" htmlFor="sender-contact" error={errors.contactRef} hint={sourceNote("contactRef")}>
                <input id="sender-contact" value={values.contactRef} onChange={set("contactRef")} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" spellCheck={false} disabled={pending} aria-invalid={Boolean(errors.contactRef)} className={`${adminInput} font-mono`} />
              </Field>
            </div>
            <p className="mt-4 text-xs leading-5 text-neutral-500">
              Коди відправника і контактної особи – це довгі рядки з літер і цифр, якими Нова пошта позначає вашу компанію та людину, що здає посилки. У кабінеті їх не показують, тому їх зручніше
              підставити кнопкою «Перевірити ключ». Якщо коди вам передав менеджер Нової пошти, вставте їх сюди як є.
            </p>
          </Panel>
        </form>
      </FormLayout>

      <div className="h-6" aria-hidden />
      <SaveBar
          start={
            <button type="button" onClick={() => { setValues(saved); setErrors({}) }} disabled={pending || !dirty} className={adminButton.ghost}>
              Скасувати зміни
            </button>
          }
          note={
            firstError ? (
              <span role="alert" className="text-red-700">{firstError}</span>
            ) : dirty ? (
              "Є незбережені зміни."
            ) : (
              "Змін немає."
            )
          }
        >
          <button type="submit" form="sender-form" disabled={pending || !dirty} className={adminButton.primary}>
            {pending ? "Зберігаємо…" : "Зберегти дані відправника"}
          </button>
      </SaveBar>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* The key                                                             */
/* ------------------------------------------------------------------ */

type Check = { state: "idle" } | { state: "ok"; sender: Suggestion | null } | { state: "failed"; error: string }

function ApiKeyPanel({ apiKey, current, onSuggestion }: { apiKey: ApiKeyView; current: Values; onSuggestion: (suggestion: Suggestion) => void }) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState("")
  const [visible, setVisible] = useState(false)
  // With a key saved here the field is hidden until the admin asks to replace it.
  const [replacing, setReplacing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState("")
  const [check, setCheck] = useState<Check>({ state: "idle" })
  const [busy, setBusy] = useState<"" | "save" | "delete" | "check">("")
  const [, startTransition] = useTransition()

  const savedHere = apiKey.source === "saved"
  const showField = apiKey.canSeal && (!savedHere || replacing)

  useEffect(() => {
    if (replacing) input.current?.focus()
  }, [replacing])

  const run = (kind: "save" | "delete" | "check", work: () => Promise<void>) => {
    setBusy(kind)
    setError("")
    startTransition(async () => {
      try {
        await work()
      } catch {
        setError("Не вдалося виконати дію. Спробуйте ще раз.")
      } finally {
        setBusy("")
      }
    })
  }

  const save = (event: React.FormEvent) => {
    event.preventDefault()
    run("save", async () => {
      const result = await saveNovaPoshtaKey(value)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setValue("")
      setVisible(false)
      setReplacing(false)
      setCheck({ state: "idle" })
      toast.success("Ключ збережено")
      router.refresh()
    })
  }

  const remove = () =>
    run("delete", async () => {
      const result = await deleteNovaPoshtaKey()
      if (!result.ok) {
        setError(result.error)
        return
      }
      setConfirmingDelete(false)
      setCheck({ state: "idle" })
      toast.success("Ключ видалено")
      router.refresh()
    })

  const verify = () =>
    run("check", async () => {
      const result = await checkNovaPoshtaKey()
      setCheck(result.ok ? { state: "ok", sender: result.sender ? { name: result.sender.name, counterpartyRef: result.sender.counterpartyRef, contactRef: result.sender.contactRef, phone: result.sender.phone } : null } : { state: "failed", error: result.error })
    })

  const suggestion = check.state === "ok" ? check.sender : null
  const suggestionIsNew = suggestion && (suggestion.counterpartyRef !== current.counterpartyRef || (suggestion.contactRef && suggestion.contactRef !== current.contactRef) || (suggestion.phone && suggestion.phone !== current.phone))

  return (
    <Panel title="Ключ Нової пошти" description="З цим ключем магазин показує покупцям міста й відділення, створює накладні та стежить за посилками.">
      {/* What is there now */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {savedHere && <Pill tone="ok">Ключ збережено</Pill>}
        {apiKey.source === "env" && <Pill>Ключ із налаштувань сервера</Pill>}
        {apiKey.source === "missing" && <Pill tone="problem">{apiKey.unreadable ? "Ключ треба вставити ще раз" : "Ключа немає"}</Pill>}
        {apiKey.mask && (
          <span className="font-mono text-sm tracking-wide text-neutral-900" aria-label={`Закінчується на ${apiKey.mask.replace(/•/g, "")}`}>
            {apiKey.mask}
          </span>
        )}
        {savedHere && apiKey.changed && <span className="text-sm text-neutral-500">Змінено: {apiKey.changed}</span>}
      </div>

      {apiKey.source === "missing" && <p className="mt-3 text-sm text-neutral-700">{WITHOUT_KEY}</p>}
      {apiKey.source === "env" && (
        <p className="mt-3 text-sm text-neutral-700">Магазин працює з ключем, який розробник задав на сервері. Якщо вставити ключ тут, магазин перейде на нього, і ви зможете міняти його самі.</p>
      )}
      {apiKey.unreadable && (
        <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          Збережений раніше ключ не вдається прочитати: на сервері змінився секрет, яким він був зашифрований. Вставте ключ ще раз.
        </p>
      )}

      {/* Actions on the current key */}
      {apiKey.source !== "missing" && !confirmingDelete && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={verify} disabled={busy !== ""} className={adminButton.secondary}>
            {busy === "check" ? "Перевіряємо…" : "Перевірити ключ"}
          </button>
          {savedHere && apiKey.canSeal && !replacing && (
            <button type="button" onClick={() => { setReplacing(true); setError("") }} disabled={busy !== ""} className={adminButton.secondary}>
              Замінити ключ
            </button>
          )}
          {savedHere && (
            <button type="button" onClick={() => { setConfirmingDelete(true); setReplacing(false); setError("") }} disabled={busy !== ""} className={adminButton.danger}>
              Видалити ключ
            </button>
          )}
        </div>
      )}

      {confirmingDelete && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-900">Видалити ключ Нової пошти?</p>
          <p className="mt-1 text-sm text-red-900">{apiKey.envFallback ? "Магазин повернеться до ключа, який задано на сервері." : WITHOUT_KEY}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={remove} disabled={busy !== ""} className={adminButton.dangerSolid}>
              {busy === "delete" ? "Видаляємо…" : "Так, видалити ключ"}
            </button>
            <button type="button" onClick={() => setConfirmingDelete(false)} disabled={busy !== ""} className={adminButton.secondary}>
              Залишити
            </button>
          </div>
        </div>
      )}

      {/* Result of the check */}
      {check.state === "failed" && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {check.error}
        </p>
      )}
      {check.state === "ok" && (
        <div role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
          <p className="font-medium">Ключ працює: Нова пошта його прийняла.</p>
          {suggestion ? (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span>
                Відправник у цьому кабінеті{suggestion.name ? `: ${suggestion.name}` : " знайдено"}.
                {!suggestionIsNew && " Його коди вже стоять у формі нижче."}
              </span>
              {suggestionIsNew && (
                <button type="button" onClick={() => onSuggestion({ ...suggestion, name: current.name || suggestion.name, contactRef: suggestion.contactRef || current.contactRef, phone: suggestion.phone || current.phone })} className={adminButton.secondary}>
                  Підставити його дані у форму
                </button>
              )}
            </div>
          ) : (
            <p className="mt-1">Відправника в кабінеті не знайдено: заповніть його дані нижче вручну.</p>
          )}
        </div>
      )}

      {/* Pasting a key */}
      {!apiKey.canSeal && (
        <p className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-700">
          Вставити ключ тут поки не можна: серверу нічим його зашифрувати. Попросіть розробника задати на сервері змінну <span className="font-mono">SETTINGS_SECRET</span> (довгий випадковий рядок), після
          цього поле з’явиться.
        </p>
      )}
      {showField && (
        <form onSubmit={save} className="mt-4 border-t border-neutral-200 pt-4" autoComplete="off">
          <Field label={savedHere ? "Новий ключ" : "Вставте ключ"} htmlFor="np-key" error={error || undefined} hint="Ключ зберігається зашифрованим. Після збереження його не можна переглянути, лише замінити або видалити.">
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-0 flex-1 basis-64">
                <input
                  ref={input}
                  id="np-key"
                  name="np-key"
                  type={visible ? "text" : "password"}
                  value={value}
                  onChange={(event) => { setValue(event.target.value); setError("") }}
                  placeholder="Ключ із кабінету Нової пошти"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-1p-ignore
                  data-lpignore="true"
                  disabled={busy !== ""}
                  aria-invalid={Boolean(error)}
                  className={`${adminInput} pr-11 font-mono`}
                />
                <button
                  type="button"
                  onClick={() => setVisible(!visible)}
                  aria-label={visible ? "Сховати ключ" : "Показати ключ"}
                  aria-pressed={visible}
                  className="absolute right-1 top-1 flex h-control-sm w-control-sm items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
                >
                  {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                </button>
              </div>
              <button type="submit" disabled={busy !== "" || !value.trim()} className={adminButton.primary}>
                {busy === "save" ? "Зберігаємо…" : "Зберегти ключ"}
              </button>
              {replacing && (
                <button type="button" onClick={() => { setReplacing(false); setValue(""); setError("") }} disabled={busy !== ""} className={adminButton.ghost}>
                  Скасувати
                </button>
              )}
            </div>
          </Field>
        </form>
      )}
      {!showField && error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <details className="group mt-4 border-t border-neutral-200 pt-4 text-sm">
        <summary className="cursor-pointer font-medium text-neutral-900 marker:text-neutral-400">Де взяти ключ</summary>
        <ol className="mt-3 list-decimal space-y-2 pl-4 text-neutral-700">
          <li>Увійдіть у бізнес-кабінет Нової пошти (new.novaposhta.ua).</li>
          <li>Відкрийте «Налаштування», потім «Безпека».</li>
          <li>Натисніть «Створити ключ» і скопіюйте його.</li>
          <li>Вставте ключ у поле на цій сторінці й натисніть «Зберегти ключ», потім «Перевірити ключ».</li>
        </ol>
        <p className="mt-3 text-neutral-600">Ключ діє обмежений час: дату видно в кабінеті поруч із ключем. Коли термін мине, створіть новий і замініть його тут.</p>
      </details>
    </Panel>
  )
}
