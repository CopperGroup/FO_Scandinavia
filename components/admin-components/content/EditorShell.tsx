"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ExternalLink, Monitor, RotateCw, Smartphone } from "lucide-react"
import Select from "@/components/admin/Select"
import { adminButton } from "@/components/admin/ui"
import { cn } from "@/lib/utils"

export type EditorPage = { key: string; title: string; group: string; edited?: boolean }

export type ShellHandle = {
  /** Tells the page in the preview that the texts changed. */
  refresh: () => void
  /** Loads the page in the preview from scratch. */
  reload: () => void
  /** Shows where a field is on the page; the first mark that exists there wins. */
  focus: (fields: string[]) => void
}

/** Width the page is drawn at for the "computer" view, then scaled down to fit the pane. */
const DESKTOP_WIDTH = 1280
const PHONE = { width: 390, height: 780 }

/**
 * The frame of the page editor: on the left the page picker and the fields
 * (`children`), on the right the storefront page itself, as customers see it.
 * The preview is the real page in a frame; components/content/PreviewBridge.tsx
 * runs inside it and talks to this component.
 */
const EditorShell = forwardRef<
  ShellHandle,
  {
    pages: EditorPage[]
    selected: string
    /** Storefront address of the chosen page. */
    previewPath: string
    /** False while there are unsaved changes: choosing another page then asks first. */
    canLeave: boolean
    /** A piece of the page was clicked in the preview: "<page>:<field>". */
    onSelect?: (field: string) => void
    onReady?: () => void
    /** Shown under the preview toolbar, e.g. "the view updates after saving". */
    previewNote?: string
    children: React.ReactNode
  }
>(function EditorShell({ pages, selected, previewPath, canLeave, onSelect, onReady, previewNote, children }, ref) {
  const router = useRouter()
  const frame = useRef<HTMLIFrameElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const [device, setDevice] = useState<"desktop" | "phone">("desktop")
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [pendingPage, setPendingPage] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const send = (message: Record<string, unknown>) => frame.current?.contentWindow?.postMessage({ source: "nordiva-editor", ...message }, window.location.origin)

  useImperativeHandle(ref, () => ({
    refresh: () => send({ type: "refresh" }),
    reload: () => setVersion((current) => current + 1),
    focus: (fields) => send({ type: "focus", fields }),
  }))

  // Latest callbacks without re-subscribing the listener.
  const handlers = useRef({ onSelect, onReady })
  handlers.current = { onSelect, onReady }
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.source !== "nordiva-preview") return
      if (event.data.type === "select") handlers.current.onSelect?.(String(event.data.field ?? ""))
      if (event.data.type === "ready") handlers.current.onReady?.()
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  useEffect(() => {
    const element = stage.current
    if (!element) return
    const measure = () => setSize({ width: element.clientWidth, height: element.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const go = (key: string) => {
    if (key === selected) return
    if (canLeave) router.push(`/admin/pages?page=${key}`)
    else setPendingPage(key)
  }

  const gutter = 16
  const desktopScale = size.width > 0 ? Math.min(1, (size.width - gutter * 2) / DESKTOP_WIDTH) : 1
  const phoneScale = size.height > 0 ? Math.min(1, (size.height - gutter * 2) / PHONE.height) : 1
  const scale = device === "desktop" ? desktopScale : phoneScale
  const frameWidth = device === "desktop" ? DESKTOP_WIDTH : PHONE.width
  const frameHeight = device === "desktop" ? Math.max(200, (size.height - gutter * 2) / scale) : PHONE.height
  // `draft` names whose unsaved texts the preview shows: this page's and nobody else's.
  const src = `${previewPath}${previewPath.includes("?") ? "&" : "?"}preview=1&draft=${selected}`

  return (
    <div className="lg:flex lg:h-[calc(100dvh-3.5rem)]">
      <section aria-label="Що змінити" className="flex min-h-0 w-full flex-col border-neutral-200 lg:w-[30rem] lg:shrink-0 lg:border-r">
        <div className="shrink-0 space-y-3 border-b border-neutral-200 px-4 py-4">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <label htmlFor="editor-page" className="block text-xs font-medium text-neutral-500">
                Сторінка
              </label>
              <div className="mt-1">
                <Select
                  id="editor-page"
                  value={selected}
                  onChange={go}
                  searchable={false}
                  options={pages.map((page) => ({ value: page.key, label: page.title, group: page.group, hint: page.edited ? "змінено" : undefined }))}
                />
              </div>
            </div>
            <a href={previewPath} target="_blank" rel="noopener noreferrer" className={adminButton.icon} aria-label="Відкрити цю сторінку на сайті" data-tip="Відкрити на сайті">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
          {pendingPage && (
            <div role="alert" className="rounded-lg border border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-900">
              <p>На цій сторінці є незбережені зміни. Якщо перейти, вони зникнуть.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className={adminButton.secondary} onClick={() => setPendingPage(null)}>
                  Залишитися
                </button>
                <button type="button" className={adminButton.danger} onClick={() => router.push(`/admin/pages?page=${pendingPage}`)}>
                  Перейти без збереження
                </button>
              </div>
            </div>
          )}
        </div>
        {children}
      </section>

      <section aria-label="Як це бачить покупець" className="hidden min-h-0 min-w-0 flex-1 flex-col bg-neutral-100 lg:flex">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-neutral-200 bg-white px-4 py-2">
          <p className="min-w-0 text-sm text-neutral-600">{previewNote ?? "Так сторінку бачить покупець. Клацніть на тексті, щоб змінити його."}</p>
          <div className="flex items-center gap-2">
            <div role="group" aria-label="Розмір екрана" className="flex h-control items-center rounded-md border border-neutral-300 px-1">
              {(
                [
                  ["desktop", "Комп’ютер", Monitor],
                  ["phone", "Телефон", Smartphone],
                ] as const
              ).map(([key, label, Icon]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={device === key}
                  onClick={() => setDevice(key)}
                  className={cn(
                    "flex h-control-sm items-center gap-1 rounded px-2 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-black",
                    device === key ? "bg-black text-white" : "text-neutral-600 hover:text-black",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            <button type="button" className={adminButton.icon} onClick={() => setVersion((current) => current + 1)} aria-label="Завантажити сторінку ще раз" data-tip="Завантажити ще раз">
              <RotateCw className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div ref={stage} className="relative min-h-0 flex-1 overflow-hidden">
          {size.width > 0 && (
            <div
              className="absolute overflow-hidden rounded-lg border border-neutral-300 bg-white shadow-sm"
              style={{
                top: gutter,
                left: Math.max(gutter, (size.width - frameWidth * scale) / 2),
                width: frameWidth * scale,
                height: frameHeight * scale,
              }}
            >
              <iframe
                key={`${src}-${version}`}
                ref={frame}
                src={src}
                title="Сторінка магазину"
                style={{ width: frameWidth, height: frameHeight, transform: `scale(${scale})`, transformOrigin: "top left", border: 0 }}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  )
})

export default EditorShell
