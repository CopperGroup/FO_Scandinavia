"use client"

import { useRef, useState } from "react"
import { ArrowLeft, ArrowRight, ImagePlus, Link2, Loader2, Star, Trash2, X } from "lucide-react"
import { adminButton, adminInput } from "@/components/admin/ui"
import { cn } from "@/lib/utils"
import { UPLOAD_TYPES, imageUrlProblem, moveItem, uploadFailure, uploadProblem } from "./form-logic"

type Pending = { key: string; name: string; progress: number; state: "queued" | "uploading" }
type Failure = { key: string; name: string; message: string }

/** Sends one file to the shop's own upload route and reports progress. Resolves with the stored URL. */
function sendFile(file: File, onProgress: (share: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open("POST", "/api/upload")
    request.responseType = "json"
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total)
    }
    request.onload = () => {
      const url = request.status >= 200 && request.status < 300 ? (request.response as { url?: string } | null)?.url : undefined
      if (url) resolve(url)
      else reject(new Error(uploadFailure(request.status || 500)))
    }
    request.onerror = () => reject(new Error(uploadFailure(0)))
    request.onabort = () => reject(new Error(uploadFailure(0)))
    const body = new FormData()
    body.append("file", file)
    request.send(body)
  })
}

/**
 * Product photos: a grid of tiles in shop order (the first is the main photo),
 * reordered by dragging or with the arrow buttons, with an upload tile at the
 * end that also takes files dropped on it. Each file shows its progress and,
 * if it fails, a plain reason. Adding by link is behind «Додати за посиланням».
 */
export function PhotosField({
  images,
  onChange,
  inputId,
  invalid,
}: {
  images: string[]
  onChange: (next: string[]) => void
  /** Id of the file input (the upload tile is its label). */
  inputId: string
  invalid?: boolean
}) {
  const [pending, setPending] = useState<Pending[]>([])
  const [failures, setFailures] = useState<Failure[]>([])
  const [linkOpen, setLinkOpen] = useState(false)
  const [link, setLink] = useState("")
  const [linkError, setLinkError] = useState("")
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dropAt, setDropAt] = useState<number | null>(null)
  const [fileOver, setFileOver] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const linkInput = useRef<HTMLInputElement>(null)
  // The latest list, for uploads that finish after several renders.
  const latest = useRef(images)
  latest.current = images
  const announce = useRef<HTMLParagraphElement>(null)

  const say = (text: string) => {
    if (announce.current) announce.current.textContent = text
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length || from === to) return
    onChange(moveItem(images, from, to))
    say(`Фото ${from + 1} тепер на місці ${to + 1}.`)
  }

  const upload = async (list: File[]) => {
    if (list.length === 0) return
    const stamp = Date.now()
    const accepted: { file: File; key: string }[] = []
    const rejected: Failure[] = []
    list.forEach((file, index) => {
      const key = `${stamp}-${index}`
      const problem = uploadProblem(file)
      if (problem) rejected.push({ key, name: file.name, message: problem })
      else accepted.push({ file, key })
    })
    setFailures((current) => [...current, ...rejected])
    if (accepted.length === 0) return
    setPending((current) => [...current, ...accepted.map(({ file, key }) => ({ key, name: file.name, progress: 0, state: "queued" as const }))])

    // One at a time, so the photos land in the order they were chosen.
    for (const { file, key } of accepted) {
      setPending((current) => current.map((item) => (item.key === key ? { ...item, state: "uploading" } : item)))
      try {
        const url = await sendFile(file, (share) => setPending((current) => current.map((item) => (item.key === key ? { ...item, progress: share } : item))))
        if (!latest.current.includes(url)) onChange([...latest.current, url])
      } catch (error) {
        setFailures((current) => [...current, { key, name: file.name, message: error instanceof Error ? error.message : uploadFailure(500) }])
      } finally {
        setPending((current) => current.filter((item) => item.key !== key))
      }
    }
  }

  const addLink = () => {
    const problem = imageUrlProblem(link)
    if (problem) {
      setLinkError(problem)
      linkInput.current?.focus()
      return
    }
    const value = link.trim()
    if (images.includes(value)) {
      setLinkError("Це фото вже є в товарі.")
      return
    }
    onChange([...images, value])
    setLink("")
    setLinkError("")
    setLinkOpen(false)
  }

  const isFileDrag = (event: React.DragEvent) => Array.from(event.dataTransfer.types).includes("Files")

  const tileControl =
    "inline-flex h-control-sm w-control-sm items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:pointer-events-none disabled:opacity-30"

  return (
    <div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(9.25rem,1fr))]" aria-label="Фото товару">
        {images.map((image, index) => (
          <li
            key={image}
            draggable
            onDragStart={(event) => {
              setDragFrom(index)
              event.dataTransfer.effectAllowed = "move"
              event.dataTransfer.setData("text/plain", String(index))
            }}
            onDragOver={(event) => {
              if (dragFrom === null) return
              event.preventDefault()
              event.dataTransfer.dropEffect = "move"
              if (dropAt !== index) setDropAt(index)
            }}
            onDrop={(event) => {
              if (dragFrom === null) return
              event.preventDefault()
              move(dragFrom, index)
              setDragFrom(null)
              setDropAt(null)
            }}
            onDragEnd={() => {
              setDragFrom(null)
              setDropAt(null)
            }}
            className={cn(
              "group relative flex flex-col overflow-hidden rounded-lg border bg-white transition-shadow",
              index === 0 ? "border-neutral-900" : "border-neutral-200",
              dragFrom === index && "opacity-40",
              dropAt === index && dragFrom !== null && dragFrom !== index && "ring-2 ring-black ring-offset-2",
            )}
          >
            <div className="relative aspect-[3/4] cursor-grab bg-neutral-50 active:cursor-grabbing" data-tip="Перетягніть, щоб змінити порядок">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt={`Фото ${index + 1}`} loading="lazy" draggable={false} className="h-full w-full object-contain" />
              {index === 0 && <span className="absolute left-2 top-2 rounded bg-black px-1.5 py-0.5 text-xs font-medium text-white">Головне</span>}
              <span className="absolute right-2 top-2 rounded bg-white/90 px-1.5 py-0.5 text-xs tabular-nums text-neutral-600">{index + 1}</span>
            </div>
            <div className="flex items-center justify-between border-t border-neutral-200 px-1 py-1">
              <button type="button" className={tileControl} aria-label={`Посунути фото ${index + 1} лівіше`} data-tip="Лівіше" disabled={index === 0} onClick={() => move(index, index - 1)}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={tileControl}
                aria-label={index === 0 ? "Це головне фото" : `Зробити фото ${index + 1} головним`}
                data-tip={index === 0 ? "Головне фото" : "Зробити головним"}
                disabled={index === 0}
                onClick={() => move(index, 0)}
              >
                <Star className={cn("h-4 w-4", index === 0 && "fill-current")} aria-hidden="true" />
              </button>
              <button type="button" className={tileControl} aria-label={`Посунути фото ${index + 1} правіше`} data-tip="Правіше" disabled={index === images.length - 1} onClick={() => move(index, index + 1)}>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={cn(tileControl, "hover:bg-red-50 hover:text-red-700")}
                aria-label={`Видалити фото ${index + 1}`}
                data-tip="Видалити"
                onClick={() => {
                  onChange(images.filter((value) => value !== image))
                  say(`Фото ${index + 1} прибрано. Воно зникне з товару після збереження.`)
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}

        {pending.map((item) => (
          <li key={item.key} className="flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <div className="flex aspect-[3/4] flex-col items-center justify-center gap-3 bg-neutral-50 px-3 text-center">
              <Loader2 className={cn("h-5 w-5 text-neutral-500", item.state === "uploading" && "animate-spin")} aria-hidden="true" />
              <p className="w-full truncate text-xs text-neutral-600" data-tip={item.name}>
                {item.name}
              </p>
              <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-200" role="progressbar" aria-label={`Завантаження ${item.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(item.progress * 100)}>
                <div className="h-full bg-black transition-[width]" style={{ width: `${Math.round(item.progress * 100)}%` }} />
              </div>
            </div>
            <p className="border-t border-neutral-200 px-2 py-2 text-center text-xs tabular-nums text-neutral-500">{item.state === "queued" ? "У черзі" : `${Math.round(item.progress * 100)}%`}</p>
          </li>
        ))}

        <li>
          <input
            ref={fileInput}
            id={inputId}
            type="file"
            accept={UPLOAD_TYPES.join(",")}
            multiple
            className="peer sr-only"
            onChange={(event) => {
              void upload(Array.from(event.target.files ?? []))
              event.target.value = ""
            }}
          />
          <label
            htmlFor={inputId}
            onDragOver={(event) => {
              if (!isFileDrag(event)) return
              event.preventDefault()
              event.dataTransfer.dropEffect = "copy"
              setFileOver(true)
            }}
            onDragLeave={() => setFileOver(false)}
            onDrop={(event) => {
              if (!isFileDrag(event)) return
              event.preventDefault()
              setFileOver(false)
              void upload(Array.from(event.dataTransfer.files))
            }}
            className={cn(
              "flex h-full min-h-[11.25rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-6 text-center transition-colors hover:border-black hover:bg-neutral-50 peer-focus-visible:ring-2 peer-focus-visible:ring-black peer-focus-visible:ring-offset-2",
              fileOver ? "border-black bg-neutral-100" : invalid ? "border-red-500" : "border-neutral-300",
            )}
          >
            <ImagePlus className="h-6 w-6 text-neutral-500" aria-hidden="true" />
            <span className="text-sm font-medium text-neutral-900">{fileOver ? "Відпустіть, щоб додати" : "Додати фото"}</span>
            <span className="text-xs text-neutral-500">Перетягніть файли сюди або натисніть. JPG, PNG, WebP до 4 МБ.</span>
          </label>
        </li>
      </ul>

      <p ref={announce} className="sr-only" aria-live="polite" />

      {failures.length > 0 && (
        <ul className="mt-3 space-y-2" aria-live="polite">
          {failures.map((failure) => (
            <li key={failure.key} role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 py-1.5 pl-3 pr-1 text-sm text-red-800">
              <span className="min-w-0 flex-1 py-0.5">
                Не вдалося додати «<span className="break-all">{failure.name}</span>»: {failure.message}
              </span>
              <button
                type="button"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                aria-label={`Сховати повідомлення про «${failure.name}»`}
                onClick={() => setFailures((current) => current.filter((item) => item.key !== failure.key))}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3">
        {linkOpen ? (
          <div>
            <label htmlFor={`${inputId}-link`} className="text-sm font-medium text-neutral-900">
              Посилання на фото
            </label>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row">
              <input
                ref={linkInput}
                id={`${inputId}-link`}
                value={link}
                autoFocus
                inputMode="url"
                autoComplete="off"
                placeholder="https://…/photo.jpg"
                aria-invalid={Boolean(linkError) || undefined}
                aria-describedby={linkError ? `${inputId}-link-error` : undefined}
                onChange={(event) => {
                  setLink(event.target.value)
                  if (linkError) setLinkError("")
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    addLink()
                  } else if (event.key === "Escape") {
                    event.preventDefault()
                    setLinkOpen(false)
                    setLinkError("")
                  }
                }}
                className={cn(adminInput, "min-w-0 flex-1", linkError && "border-red-600")}
              />
              <div className="flex gap-2">
                <button type="button" className={adminButton.secondary} onClick={addLink}>
                  Додати фото
                </button>
                <button
                  type="button"
                  className={adminButton.ghost}
                  onClick={() => {
                    setLinkOpen(false)
                    setLink("")
                    setLinkError("")
                  }}
                >
                  Скасувати
                </button>
              </div>
            </div>
            {linkError && (
              <p id={`${inputId}-link-error`} role="alert" className="mt-1 text-xs text-red-700">
                {linkError}
              </p>
            )}
          </div>
        ) : (
          <button type="button" className={cn(adminButton.ghost, "-ml-3")} onClick={() => setLinkOpen(true)}>
            <Link2 className="h-4 w-4" aria-hidden="true" />
            Додати за посиланням
          </button>
        )}
      </div>
    </div>
  )
}
