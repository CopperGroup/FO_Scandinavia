"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Copy, Loader2, Plus, Trash2 } from "lucide-react"
import { AsideCard, Field, FormLayout, Panel, Pill, SaveBar, adminButton, adminInput } from "@/components/admin/ui"
import { saveSiteVariables } from "@/lib/actions/content.actions"
import { CONTACT_VARIABLES, CUSTOM_VALUE_MAX, MAX_CUSTOM_VARIABLES, fillVariables, normaliseName, token, type ContactKey, type VariableInfo, type VariableValues } from "@/lib/content/variables"

const same = (a: VariableValues, b: VariableValues) => JSON.stringify(a) === JSON.stringify(b)

/** The name of a variable as it is written in a text; a click copies it. */
function TokenChip({ name }: { name: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(token(name))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // No clipboard access (an old browser): the name is on the screen and can be typed.
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Скопіювати ${token(name)}`}
      data-tip={copied ? "Скопійовано" : `Скопіювати ${token(name)}, щоб вставити в текст сторінки`}
      className="inline-flex h-control-sm shrink-0 items-center gap-1 rounded-md bg-neutral-100 px-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-200 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
    >
      {token(name)}
      {copied ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
    </button>
  )
}

/**
 * "Налаштування": what the whole shop shares. The contacts of the shop (the
 * header, the footer and the "Контакти" page show them) and the variables:
 * values that any text of the site can name in braces. One form, one save.
 */
export default function StoreSettingsForm({
  initial,
  saved: savedOnce,
  fromLegacy,
  computed,
  changed,
}: {
  initial: VariableValues
  /** False until the settings are saved for the first time: the contacts then come from the old contacts record. */
  saved: boolean
  fromLegacy: ContactKey[]
  /** The variables the shop fills in by itself, with their values now. */
  computed: VariableInfo[]
  /** Who saved last and when, as text. */
  changed: string
}) {
  const router = useRouter()
  const [saved, setSaved] = useState(initial)
  const [values, setValues] = useState(initial)
  const [stored, setStored] = useState(savedOnce)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const dirty = useMemo(() => !same(values, saved), [values, saved])
  // Contacts picked up from the old record are shown but not yet kept here: saving them is a change too.
  const canSave = dirty || !stored
  const missing = CONTACT_VARIABLES.filter((variable) => variable.required && !values.contacts[variable.key].trim())

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const touch = (keys: string[]) => {
    setDone(false)
    setMessage(null)
    if (keys.some((key) => errors[key])) setErrors((previous) => Object.fromEntries(Object.entries(previous).filter(([key]) => !keys.includes(key))))
  }
  const setContact = (key: ContactKey, value: string) => {
    setValues((previous) => ({ ...previous, contacts: { ...previous.contacts, [key]: value } }))
    touch([`contacts.${key}`])
  }
  const setCustom = (index: number, part: "name" | "value", value: string) => {
    setValues((previous) => ({ ...previous, custom: previous.custom.map((row, at) => (at === index ? { ...row, [part]: value } : row)) }))
    touch([`custom.${index}.${part}`])
  }
  const addCustom = () => {
    const index = values.custom.length
    setValues((previous) => ({ ...previous, custom: [...previous.custom, { name: "", value: "" }] }))
    setDone(false)
    window.setTimeout(() => document.getElementById(`variable-name-${index}`)?.focus(), 0)
  }
  const removeCustom = (index: number) => {
    setValues((previous) => ({ ...previous, custom: previous.custom.filter((_, at) => at !== index) }))
    setErrors({})
    setDone(false)
    setMessage(null)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    setDone(false)
    try {
      const result = await saveSiteVariables(values)
      if (!result.ok) {
        setErrors(result.errors ?? {})
        setMessage(result.error)
        const first = Object.keys(result.errors ?? {})[0]
        if (first) document.querySelector<HTMLElement>(`[data-variable="${first}"]`)?.focus()
      } else {
        setErrors({})
        setSaved(result.values)
        setValues(result.values)
        setStored(true)
        setDone(true)
        router.refresh()
      }
    } catch {
      setMessage("Немає зв’язку із сервером. Перевірте інтернет і спробуйте ще раз.")
    } finally {
      setBusy(false)
    }
  }

  const legacyLabels = CONTACT_VARIABLES.filter((variable) => fromLegacy.includes(variable.key)).map((variable) => variable.label.toLocaleLowerCase("uk-UA"))

  // The example in the side column uses the values as they are typed.
  const example = "Питання? Телефонуйте {телефон} або пишіть на {пошта}."
  const exampleMap: Record<string, string> = { телефон: values.contacts.phone || "…", пошта: values.contacts.email || "…" }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {!stored && legacyLabels.length > 0 && (
        <div role="status" className="rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-900">
          Ми перенесли сюди контакти, які магазин мав раніше: {legacyLabels.join(", ")}. Перевірте їх і натисніть «Зберегти».
        </div>
      )}

      <FormLayout
        aside={
          <AsideCard title="Як працюють змінні">
            <p className="text-sm text-neutral-700">
              Змінна — це слово у фігурних дужках. Напишіть його в будь-якому тексті в розділі «Сторінки», і покупець побачить значення.
            </p>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-neutral-500">Ви пишете</p>
                <p className="mt-1 rounded-md bg-neutral-50 px-3 py-2 text-neutral-900">{example}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Покупець бачить</p>
                <p className="mt-1 rounded-md bg-neutral-50 px-3 py-2 text-neutral-900 [overflow-wrap:anywhere]">{fillVariables(example, exampleMap)}</p>
              </div>
            </div>
            <p className="text-sm text-neutral-700">Змінили значення тут — воно змінилося в усіх текстах одразу.</p>
            <p className="text-xs text-neutral-500">
              У редакторі сторінки є кнопка «Вставити змінну»: вона ставить назву туди, де був курсор.{" "}
              <Link href="/admin/pages" className="font-medium text-neutral-900 underline underline-offset-2">
                Відкрити «Сторінки»
              </Link>
            </p>
            {stored && changed && <p className="border-t border-neutral-100 pt-3 text-xs text-neutral-500">Змінено: {changed}.</p>}
          </AsideCard>
        }
      >
        <Panel
          id="contacts"
          title="Контакти магазину"
          description="Стоять на сайті самі: угорі сторінок, унизу сайту, на сторінці «Контакти». Їх також можна писати в текстах як змінні."
          action={
            missing.length > 0 ? (
              <Pill tone="problem" tip={`Не заповнено: ${missing.map((variable) => variable.label.toLocaleLowerCase("uk-UA")).join(", ")}`}>
                Треба заповнити: {missing.length}
              </Pill>
            ) : undefined
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {CONTACT_VARIABLES.map((variable) => {
              const id = `variable-${variable.key}`
              const error = errors[`contacts.${variable.key}`]
              return (
                <Field key={variable.key} label={variable.label} htmlFor={id} tip={`Де це бачать покупці: ${variable.where}`} optional={!variable.required} hint={variable.hint} error={error}>
                  <div className="flex items-center gap-2">
                    <input
                      id={id}
                      data-variable={`contacts.${variable.key}`}
                      type={variable.input === "text" ? "text" : variable.input}
                      inputMode={variable.input}
                      autoComplete="off"
                      maxLength={variable.max}
                      className={adminInput}
                      value={values.contacts[variable.key]}
                      placeholder={variable.placeholder}
                      aria-invalid={error ? true : undefined}
                      onChange={(event) => setContact(variable.key, event.target.value)}
                    />
                    <TokenChip name={variable.name} />
                  </div>
                </Field>
              )
            })}
          </div>
        </Panel>

        <Panel id="variables" title="Свої змінні" description="Те, що повторюється в кількох текстах і може змінитися: розмір знижки, строк доставки, назва акції.">
          <div className="space-y-3">
            {values.custom.length > 0 && (
              <div className="hidden gap-2 text-xs font-medium text-neutral-500 sm:flex">
                <span className="w-48 shrink-0">Назва: одне-два слова</span>
                <span className="flex-1">Значення: що побачить покупець</span>
              </div>
            )}
            {values.custom.length === 0 && <p className="text-sm text-neutral-500">Своїх змінних ще немає. Наприклад: назва «знижка», значення «−20% на все».</p>}
            {values.custom.map((row, index) => {
              const nameError = errors[`custom.${index}.name`]
              const valueError = errors[`custom.${index}.value`]
              const name = normaliseName(row.name)
              return (
                <div key={index}>
                  <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                    <div className="w-full shrink-0 sm:w-48">
                      <label htmlFor={`variable-name-${index}`} className="sr-only">
                        Назва змінної {index + 1}
                      </label>
                      <input
                        id={`variable-name-${index}`}
                        data-variable={`custom.${index}.name`}
                        className={adminInput}
                        value={row.name}
                        maxLength={30}
                        placeholder="знижка"
                        autoComplete="off"
                        aria-invalid={nameError ? true : undefined}
                        onChange={(event) => setCustom(index, "name", event.target.value)}
                      />
                    </div>
                    <div className="min-w-0 flex-1 basis-48">
                      <label htmlFor={`variable-value-${index}`} className="sr-only">
                        Значення змінної {index + 1}
                      </label>
                      <input
                        id={`variable-value-${index}`}
                        data-variable={`custom.${index}.value`}
                        className={adminInput}
                        value={row.value}
                        maxLength={CUSTOM_VALUE_MAX}
                        placeholder="−20% на все"
                        autoComplete="off"
                        aria-invalid={valueError ? true : undefined}
                        onChange={(event) => setCustom(index, "value", event.target.value)}
                      />
                    </div>
                    {name && !nameError ? <TokenChip name={name} /> : null}
                    <button type="button" className={adminButton.icon} onClick={() => removeCustom(index)} aria-label={`Видалити змінну ${name ? token(name) : index + 1}`}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  {(nameError || valueError) && (
                    <p role="alert" className="mt-1 text-xs text-red-700">
                      {nameError ?? valueError}
                    </p>
                  )}
                </div>
              )
            })}
            {errors.custom && (
              <p role="alert" className="text-xs text-red-700">
                {errors.custom}
              </p>
            )}
            <div>
              <button type="button" className={adminButton.secondary} onClick={addCustom} disabled={values.custom.length >= MAX_CUSTOM_VARIABLES}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Додати змінну
              </button>
            </div>
          </div>
        </Panel>

        <Panel title="Змінні, які заповнює магазин" description="Сайт знає ці значення сам. Їх теж можна писати в текстах." padded={false}>
          <ul className="divide-y divide-neutral-100">
            {computed.map((variable) => (
              <li key={variable.name} className="flex items-center gap-3 px-4 py-2">
                <p className="w-56 shrink-0 text-sm font-medium text-neutral-900">{variable.label}</p>
                <p className="min-w-0 flex-1 truncate text-sm text-neutral-600">
                  {variable.value || "Безкоштовну доставку вимкнено"}
                  {variable.name === "сума" && (
                    <>
                      {" · "}
                      <Link href="/admin/pages?page=delivery&field=freeDelivery" className="underline underline-offset-2 hover:text-black">
                        змінити
                      </Link>
                    </>
                  )}
                </p>
                <TokenChip name={variable.name} />
              </li>
            ))}
          </ul>
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
            <span role="status">Збережено. На сайті вже нові значення.</span>
          ) : dirty ? (
            "Не збережено."
          ) : null
        }
      >
        <button type="submit" className={adminButton.primary} disabled={busy || !canSave}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {busy ? "Зберігаємо…" : canSave ? "Зберегти" : "Збережено"}
        </button>
      </SaveBar>
    </form>
  )
}
