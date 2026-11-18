"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"
import Select from "@/components/admin/Select"
import { AsideCard, EmptyState, Field, FormLayout, Panel, Pill, adminButton, adminInput } from "@/components/admin/ui"
import { cn } from "@/lib/utils"
import { createPixel, deletePixel, setPixelActive, updatePixelEvents } from "@/lib/actions/pixel.actions"
import { PIXEL_TYPE_LABEL, SENT_EVENTS, checkPixelId, type AdminPixel, type PixelEvents, type PixelType } from "@/lib/pixels/shared"

const TYPE_OPTIONS = [
  { value: "Meta", label: PIXEL_TYPE_LABEL.Meta, hint: "Реклама у Facebook та Instagram" },
  { value: "TikTok", label: PIXEL_TYPE_LABEL.TikTok, hint: "Реклама у TikTok" },
]

const WHERE_TO_FIND: Record<PixelType, string> = {
  Meta: "Meta Events Manager → «Джерела даних» → ваш піксель. ID — число з 15–16 цифр під назвою пікселя.",
  TikTok: "TikTok Ads Manager → Tools → Events → Web Events → ваш піксель. ID — 20 літер і цифр під назвою.",
}

const date = (value: string | null) => (value ? new Date(value).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" }) : null)

type Note = { tone: "ok" | "problem"; text: string }

export default function PixelsManager({ pixels, initialId }: { pixels: AdminPixel[]; initialId: string | null }) {
  const router = useRouter()
  const [refreshing, startRefresh] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<Note | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // The pixel whose events are open on the page.
  const [selectedId, setSelectedId] = useState<string | null>(initialId && pixels.some((pixel) => pixel._id === initialId) ? initialId : pixels[0]?._id ?? null)
  const selected = pixels.find((pixel) => pixel._id === selectedId) ?? pixels[0] ?? null
  const [events, setEvents] = useState<PixelEvents | null>(selected?.events ?? null)
  useEffect(() => {
    setEvents(selected?.events ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?._id, JSON.stringify(selected?.events)])
  const eventsChanged = useMemo(() => Boolean(selected && events && SENT_EVENTS.some((event) => events[event.key] !== selected.events[event.key])), [selected, events])

  // The form for a new pixel.
  const [type, setType] = useState<PixelType>("Meta")
  const [name, setName] = useState("")
  const [pixelId, setPixelId] = useState("")
  const [formError, setFormError] = useState<{ field: "name" | "id" | "form"; text: string } | null>(null)

  const working = busy !== null || refreshing
  const refresh = () => startRefresh(() => router.refresh())

  const run = async <T extends { ok: boolean; error?: string }>(key: string, action: () => Promise<T>, onDone: (result: T & { ok: true }) => Note | null) => {
    setBusy(key)
    setNote(null)
    try {
      const result = await action()
      if (!result.ok) setNote({ tone: "problem", text: result.error ?? "Не вдалося зберегти зміни. Спробуйте ще раз." })
      else {
        setNote(onDone(result as T & { ok: true }))
        refresh()
      }
    } catch {
      setNote({ tone: "problem", text: "Немає зв’язку із сервером. Перевірте інтернет і спробуйте ще раз." })
    } finally {
      setBusy(null)
    }
  }

  const add = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    if (!name.trim()) return setFormError({ field: "name", text: "Дайте пікселю назву, щоб відрізняти його від інших." })
    const checked = checkPixelId(type, pixelId)
    if (!checked.ok) return setFormError({ field: "id", text: checked.error })

    setBusy("create")
    setNote(null)
    try {
      const result = await createPixel({ type, name, id: checked.id })
      if (!result.ok) setFormError({ field: "form", text: result.error })
      else {
        setName("")
        setPixelId("")
        setSelectedId(result._id)
        setNote({ tone: "ok", text: "Піксель додано. Він ще вимкнений: натисніть «Увімкнути», щоб він почав працювати." })
        refresh()
      }
    } catch {
      setFormError({ field: "form", text: "Немає зв’язку із сервером. Перевірте інтернет і спробуйте ще раз." })
    } finally {
      setBusy(null)
    }
  }

  return (
    <FormLayout
      aside={
        <>
          <form onSubmit={add} noValidate>
            <AsideCard
              title="Додати піксель"
              footer={
                <>
                  {formError?.field === "form" && (
                    <p role="alert" className="text-sm text-red-700">
                      {formError.text}
                    </p>
                  )}
                  <button type="submit" className={cn(adminButton.primary, "w-full")} disabled={working}>
                    {busy === "create" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {busy === "create" ? "Додаємо…" : "Додати піксель"}
                  </button>
                </>
              }
            >
              <Field label="Де ви рекламуєтеся" htmlFor="pixel-type">
                <Select id="pixel-type" options={TYPE_OPTIONS} value={type} onChange={(value) => (setType(value as PixelType), setFormError(null))} />
              </Field>
              <Field label="Назва" htmlFor="pixel-name" hint="Для себе, щоб відрізняти пікселі." error={formError?.field === "name" ? formError.text : undefined}>
                <input
                  id="pixel-name"
                  className={adminInput}
                  value={name}
                  maxLength={80}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Наприклад, Основний кабінет"
                  aria-invalid={formError?.field === "name" || undefined}
                />
              </Field>
              <Field label="ID пікселя" htmlFor="pixel-id" hint={WHERE_TO_FIND[type]} error={formError?.field === "id" ? formError.text : undefined}>
                <input
                  id="pixel-id"
                  className={cn(adminInput, "tabular-nums")}
                  value={pixelId}
                  onChange={(event) => setPixelId(event.target.value)}
                  inputMode={type === "Meta" ? "numeric" : "text"}
                  autoComplete="off"
                  placeholder={type === "Meta" ? "1234567890123456" : "C4ABCDE123456789FGHI"}
                  aria-invalid={formError?.field === "id" || undefined}
                />
              </Field>
            </AsideCard>
          </form>
        </>
      }
    >
      {note && (
        <p
          role={note.tone === "problem" ? "alert" : "status"}
          className={cn("rounded-lg border px-4 py-3 text-sm", note.tone === "problem" ? "border-red-200 bg-red-50 text-red-900" : "border-neutral-200 bg-neutral-50 text-neutral-800")}
        >
          {note.text}
        </p>
      )}

      {pixels.length === 0 ? (
        <EmptyState
          title="Пікселів ще немає"
          text="Якщо ви рекламуєте магазин у Facebook, Instagram чи TikTok, додайте ID пікселя з рекламного кабінету у формі праворуч. Без реклами піксель не потрібен."
        />
      ) : (
        <Panel title="Ваші пікселі" description="Одночасно працює один піксель Meta і один піксель TikTok. Якщо увімкнути інший, попередній вимкнеться сам." padded={false}>
          <ul className="divide-y divide-neutral-100">
            {pixels.map((pixel) => {
              const isSelected = selected?._id === pixel._id
              const since = pixel.active ? date(pixel.activatedAt ?? pixel.createdAt) : date(pixel.deactivatedAt)
              return (
                <li key={pixel._id} className={cn("flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3", isSelected && "bg-neutral-50")}>
                  <div className="min-w-0 flex-1 basis-56">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-neutral-900">{pixel.name}</p>
                      <Pill tone={pixel.active ? "ok" : "muted"}>{pixel.active ? "Працює" : "Вимкнено"}</Pill>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {PIXEL_TYPE_LABEL[pixel.type]}, ID{" "}
                      {pixel.pixelId ? <span className="tabular-nums text-neutral-700">{pixel.pixelId}</span> : <span className="text-red-700">не вдалося прочитати: видаліть цей піксель і додайте його знову</span>}
                      {since ? (pixel.active ? `, працює з ${since}` : `, вимкнено ${since}`) : ""}
                    </p>
                  </div>

                  {confirmDelete === pixel._id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-neutral-700">Видалити назавжди?</span>
                      <button
                        type="button"
                        className={adminButton.dangerSolid}
                        disabled={working}
                        onClick={() =>
                          run(`delete-${pixel._id}`, () => deletePixel({ _id: pixel._id }), () => {
                            setConfirmDelete(null)
                            if (selectedId === pixel._id) setSelectedId(null)
                            return { tone: "ok", text: `Піксель «${pixel.name}» видалено.` }
                          })
                        }
                      >
                        {busy === `delete-${pixel._id}` && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        Так, видалити
                      </button>
                      <button type="button" className={adminButton.ghost} onClick={() => setConfirmDelete(null)} disabled={working}>
                        Скасувати
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className={pixel.active ? adminButton.secondary : adminButton.primary}
                        disabled={working || (!pixel.active && !pixel.pixelId)}
                        onClick={() =>
                          run(`toggle-${pixel._id}`, () => setPixelActive({ _id: pixel._id, active: !pixel.active }), (result) => ({
                            tone: "ok",
                            text: pixel.active
                              ? `Піксель «${pixel.name}» вимкнено. Магазин більше нічого йому не передає.`
                              : `Піксель «${pixel.name}» увімкнено.${result.replaced ? ` «${result.replaced}» вимкнено, бо одночасно працює лише один піксель цього типу.` : ""} Покупці почнуть передавати дані протягом кількох хвилин.`,
                          }))
                        }
                      >
                        {busy === `toggle-${pixel._id}` && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        {pixel.active ? "Вимкнути" : "Увімкнути"}
                      </button>
                      <button type="button" className={adminButton.ghost} aria-pressed={isSelected} onClick={() => setSelectedId(pixel._id)}>
                        Події
                      </button>
                      <button type="button" className={adminButton.icon} aria-label={`Видалити піксель «${pixel.name}»`} data-tip="Видалити" onClick={() => setConfirmDelete(pixel._id)} disabled={working}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </Panel>
      )}

      {selected && events && (
        <Panel
          title={`Що передавати: ${selected.name}`}
          description="Позначені дії покупців магазин передає цьому пікселю."
          action={
            <button
              type="button"
              className={adminButton.primary}
              disabled={working || !eventsChanged}
              onClick={() => run("events", () => updatePixelEvents({ _id: selected._id, events }), () => ({ tone: "ok", text: `Події пікселя «${selected.name}» збережено.` }))}
            >
              {busy === "events" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {eventsChanged ? "Зберегти події" : "Збережено"}
            </button>
          }
        >
          <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {SENT_EVENTS.map((event) => (
              <li key={event.key}>
                <label className={cn("flex items-start gap-3", event.locked ? "cursor-not-allowed" : "cursor-pointer")}>
                  <input
                    type="checkbox"
                    className="check mt-0.5"
                    checked={event.locked ? true : events[event.key]}
                    disabled={event.locked || working}
                    onChange={(change) => setEvents({ ...events, [event.key]: change.target.checked })}
                  />
                  <span>
                    <span className="block text-sm font-medium text-neutral-900">{event.label}</span>
                    <span className="block text-xs text-neutral-500">{event.hint}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </FormLayout>
  )
}
