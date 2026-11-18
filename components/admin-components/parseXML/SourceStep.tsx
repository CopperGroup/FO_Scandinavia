"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Download, FileUp, Link2, Loader2 } from "lucide-react"
import { Field, Panel, adminButton, adminInput } from "@/components/admin/ui"
import { cn } from "@/lib/utils"
import { removeSampleImport } from "@/lib/import/actions"
import type { FeedSummary } from "@/lib/import/types"

const SAMPLE_URL = "/samples/nordiva-sample-feed.xml"
const MAX_BYTES = 50 * 1024 * 1024

async function send(body: BodyInit, headers: Record<string, string>): Promise<FeedSummary> {
  const response = await fetch("/admin/fetchUrl/source", { method: "POST", body, headers })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.token) throw new Error(data?.error || "Не вдалося прочитати файл. Спробуйте ще раз.")
  return data as FeedSummary
}

/**
 * Step 1: where the products come from. Everything the admin can do here is in
 * the main column, in the order they would reach for it: the file, a link,
 * the sample. Choosing any of them moves on to the next step by itself.
 */
export default function SourceStep({ onLoaded, sample }: { onLoaded: (summary: FeedSummary) => void; sample: { products: number; categories: number } }) {
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [busy, setBusy] = useState<null | "file" | "url" | "sample" | "remove">(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [sampleNote, setSampleNote] = useState<{ tone: "ok" | "problem"; text: string } | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const uploadFile = async (file: File | Blob, name: string, kind: "file" | "sample" = "file") => {
    setFileError(null)
    setUrlError(null)
    if (file.size > MAX_BYTES) {
      setFileError("Файл більший за 50 МБ. Попросіть у постачальника менший файл або розділіть його на частини.")
      return
    }
    if (name && !/\.(xml|yml)$/i.test(name) && !/xml/.test(file.type)) {
      setFileError("Цей файл не підходить. Потрібен файл із товарами, назва якого закінчується на .xml або .yml.")
      return
    }
    setBusy(kind)
    try {
      onLoaded(await send(file, { "content-type": "application/xml", "x-file-name": encodeURIComponent(name || "tovary.xml") }))
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Не вдалося прочитати файл. Спробуйте ще раз.")
    } finally {
      setBusy(null)
    }
  }

  const loadUrl = async (event: React.FormEvent) => {
    event.preventDefault()
    setFileError(null)
    setUrlError(null)
    if (!/^https?:\/\/\S+$/i.test(url.trim())) {
      setUrlError("Вставте посилання повністю: воно починається з https://")
      return
    }
    setBusy("url")
    try {
      onLoaded(await send(JSON.stringify({ url: url.trim() }), { "content-type": "application/json" }))
    } catch (error) {
      setUrlError(error instanceof Error ? error.message : "Не вдалося завантажити файл за цим посиланням.")
    } finally {
      setBusy(null)
    }
  }

  const loadSample = async () => {
    setFileError(null)
    setSampleNote(null)
    try {
      setBusy("sample")
      const response = await fetch(SAMPLE_URL)
      if (!response.ok) throw new Error()
      await uploadFile(await response.blob(), "nordiva-sample-feed.xml", "sample")
    } catch {
      setSampleNote({ tone: "problem", text: "Не вдалося відкрити зразок. Оновіть сторінку і спробуйте ще раз." })
      setBusy(null)
    }
  }

  const removeSample = async () => {
    setBusy("remove")
    setSampleNote(null)
    const result = await removeSampleImport()
    setBusy(null)
    setConfirmRemove(false)
    if (!result.ok) {
      setSampleNote({ tone: "problem", text: result.error })
      return
    }
    setSampleNote({ tone: "ok", text: `Прибрано товарів: ${result.removed.products}, категорій: ${result.removed.categories}.` })
    router.refresh()
  }

  const hasSample = sample.products > 0 || sample.categories > 0

  return (
    <div className="space-y-4">
      {(hasSample || sampleNote) && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
          <p className={cn("min-w-0 flex-1 basis-72 text-sm", sampleNote?.tone === "problem" ? "text-red-700" : "text-neutral-700")}>
            {sampleNote ? (
              sampleNote.text
            ) : (
              <>
                У магазині зараз є товари зі зразка: <span className="font-medium tabular-nums text-neutral-900">{sample.products}</span>, категорій:{" "}
                <span className="font-medium tabular-nums text-neutral-900">{sample.categories}</span>. Покупці їх бачать.
              </>
            )}
          </p>
          {hasSample &&
            (confirmRemove ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-neutral-700">Прибрати їх із магазину?</span>
                <button type="button" className={adminButton.dangerSolid} onClick={removeSample} disabled={busy !== null}>
                  {busy === "remove" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  {busy === "remove" ? "Прибираємо…" : "Так, прибрати"}
                </button>
                <button type="button" className={adminButton.secondary} onClick={() => setConfirmRemove(false)} disabled={busy !== null}>
                  Залишити
                </button>
              </div>
            ) : (
              <button type="button" className={adminButton.danger} onClick={() => setConfirmRemove(true)} disabled={busy !== null}>
                Прибрати товари зі зразка
              </button>
            ))}
        </div>
      )}

      <Panel title="Файл із товарами" description="Його дає постачальник: це той самий файл, який готують для Rozetka, Prom чи Hotline. Завантажте його з комп’ютера або вставте посилання.">
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-0">
          <div className="lg:pr-6">
            <div
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragging(false)
                const file = event.dataTransfer.files?.[0]
                if (file) void uploadFile(file, file.name)
              }}
              className={cn(
                "flex min-h-[12.5rem] flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-6 text-center transition-colors",
                dragging ? "border-black bg-neutral-50" : "border-neutral-300",
              )}
            >
              <FileUp className="h-7 w-7 text-neutral-400" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-neutral-900">Перетягніть файл сюди</p>
              <p className="mt-1 text-xs text-neutral-500">Файл .xml або .yml, до 50 МБ</p>
              <button type="button" className={cn(adminButton.primary, "mt-4")} onClick={() => input.current?.click()} disabled={busy !== null}>
                {busy === "file" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {busy === "file" ? "Читаємо файл…" : "Вибрати файл на комп’ютері"}
              </button>
              <input
                ref={input}
                type="file"
                accept=".xml,.yml,application/xml,text/xml"
                className="sr-only"
                tabIndex={-1}
                aria-label="Файл із товарами"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void uploadFile(file, file.name)
                  event.target.value = ""
                }}
              />
            </div>
            {fileError && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {fileError}
              </p>
            )}
          </div>

          <form onSubmit={loadUrl} className="flex flex-col justify-center gap-4 border-t border-neutral-200 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <Field
              label="Або посилання на файл"
              htmlFor="source-url"
              error={urlError}
              hint="Якщо постачальник дав посилання замість файлу. Воно має відкриватися в браузері без входу в кабінет."
            >
              <input
                id="source-url"
                type="url"
                inputMode="url"
                placeholder="https://postachalnyk.ua/price.xml"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                className={adminInput}
                aria-invalid={urlError ? true : undefined}
              />
            </Field>
            <div>
              <button type="submit" className={adminButton.secondary} disabled={busy !== null || !url.trim()}>
                {busy === "url" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
                {busy === "url" ? "Завантажуємо…" : "Завантажити за посиланням"}
              </button>
            </div>
          </form>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg border border-neutral-200 bg-white px-4 py-3">
        <div className="min-w-0 flex-1 basis-80">
          <p className="text-sm font-semibold text-neutral-900">Немає файлу під рукою? Спробуйте на зразку</p>
          <p className="mt-0.5 text-sm text-neutral-600">
            40 вигаданих товарів у кількох категоріях, зі знижками, розмірами і трьома записами з помилками. Перед записом ви пройдете всі кроки імпорту.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={adminButton.secondary} onClick={loadSample} disabled={busy !== null}>
            {busy === "sample" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Відкрити зразок
          </button>
          <a href={SAMPLE_URL} download className={adminButton.ghost}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Завантажити файл зразка
          </a>
        </div>
      </div>

      <details className="group rounded-lg border border-neutral-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black [&::-webkit-details-marker]:hidden">
          Що сказати постачальнику, щоб отримати такий файл
          <span aria-hidden="true" className="text-neutral-400 transition-transform group-open:rotate-45">
            +
          </span>
        </summary>
        <div className="grid gap-x-8 gap-y-3 border-t border-neutral-200 px-4 py-3 text-sm leading-6 text-neutral-700 lg:grid-cols-2">
          <div className="space-y-3">
            <p>
              Попросіть «файл із товарами у форматі YML» (його ще називають прайс-листом для маркетплейсів). Для кожного товару в ньому мають бути назва, ціна й артикул; бажано також фото, категорія,
              наявність і характеристики.
            </p>
            <p className="text-xs text-neutral-500">Підійде й інший файл XML, де кожен товар записаний як &lt;offer&gt;, &lt;item&gt; або &lt;product&gt;.</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Для технічного спеціаліста постачальника: будова файлу</p>
            <pre className="mt-2 overflow-x-auto rounded-md bg-neutral-50 p-3 text-xs leading-5 text-neutral-700">
              {`<shop>
  <categories>
    <category id="" parentId="">
  <offers>
    <offer id="" available="">
      <name> <price> <oldprice>
      <vendor> <vendorCode>
      <categoryId> <picture>
      <stock_quantity>
      <description>
      <param name="Розмір">`}
            </pre>
          </div>
        </div>
      </details>
    </div>
  )
}
