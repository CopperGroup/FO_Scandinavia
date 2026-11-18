"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import * as Dialog from "@radix-ui/react-dialog"
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react"
import Photo from "@/components/storefront/Photo"
import { cn } from "@/lib/utils"

type Props = {
  images: string[]
  /** Product title, used as the photos' text alternative. */
  alt: string
}

const arrowClass =
  "absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-brand-ink shadow-[0_1px_4px_rgba(16,34,46,0.25)] transition-opacity hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-0 lg:flex"

/**
 * Product photos: a swipeable track with thumbnails that are always visible
 * (a column on desktop, a strip on phones) and a full-screen view on tap.
 */
export default function ProductGallery({ images, alt }: Props) {
  const photos = images.length > 0 ? images : ["/placeholder.svg"]
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  // The background colour of each photo, so the full-screen view can continue it to the edges of the window.
  const [backdrops, setBackdrops] = useState<Record<string, string | null>>({})

  const goTo = useCallback(
    (next: number, smooth = true) => {
      const track = trackRef.current
      if (!track) return
      const clamped = Math.max(0, Math.min(photos.length - 1, next))
      track.scrollTo({ left: clamped * track.clientWidth, behavior: smooth ? "smooth" : "auto" })
      setIndex(clamped)
    },
    [photos.length],
  )

  // Another variant of the product was opened: start from its first photo.
  useEffect(() => {
    goTo(0, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images[0]])

  function onScroll() {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return
    const next = Math.round(track.scrollLeft / track.clientWidth)
    if (next !== index) setIndex(next)
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") goTo(index + 1)
    else if (event.key === "ArrowLeft") goTo(index - 1)
  }

  const many = photos.length > 1

  return (
    <div className={cn(many && "lg:grid lg:grid-cols-[72px_minmax(0,1fr)] lg:gap-4")}>
      {many && (
        <ul aria-label="Фото товару" className="hidden max-h-[min(640px,calc(100dvh-var(--header-h)-56px))] flex-col gap-2 overflow-y-auto [scrollbar-width:none] lg:flex [&::-webkit-scrollbar]:hidden">
          {photos.map((photo, photoIndex) => (
            <li key={photo + photoIndex}>
              <button
                type="button"
                onClick={() => goTo(photoIndex)}
                aria-label={`Фото ${photoIndex + 1} з ${photos.length}`}
                aria-current={photoIndex === index ? "true" : undefined}
                className={cn(
                  "relative block aspect-[3/4] w-full overflow-hidden rounded-sm border bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  photoIndex === index ? "border-brand-ink" : "border-brand-line hover:border-brand-ink/50",
                )}
              >
                <Photo src={photo} alt="" sizes="72px" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <div
          ref={trackRef}
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          tabIndex={0}
          role="group"
          aria-roledescription="карусель"
          aria-label={`Фото товару: ${alt}`}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-sm border border-brand-line bg-white [scrollbar-width:none] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand max-lg:-mx-4 max-lg:rounded-none max-lg:border-x-0 sm:max-lg:-mx-6 [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((photo, photoIndex) => (
            <button
              key={photo + photoIndex}
              type="button"
              onClick={() => setZoomed(true)}
              aria-label="Відкрити фото на весь екран"
              tabIndex={photoIndex === index ? 0 : -1}
              className="relative aspect-[4/5] w-full shrink-0 cursor-zoom-in snap-center focus-visible:outline-none sm:max-lg:max-h-[min(640px,68dvh)] lg:max-h-[min(640px,calc(100dvh-var(--header-h)-56px))]"
            >
              <Photo
                src={photo}
                alt={photoIndex === 0 ? alt : `${alt}, фото ${photoIndex + 1}`}
                priority={photoIndex === 0}
                sizes="(max-width: 1024px) 100vw, 640px"
                onBackdrop={(color) => setBackdrops((current) => (current[photo] === color ? current : { ...current, [photo]: color }))}
              />
            </button>
          ))}
        </div>

        {many && (
          <>
            <button type="button" aria-label="Попереднє фото" disabled={index === 0} onClick={() => goTo(index - 1)} className={cn(arrowClass, "left-3")}>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Наступне фото"
              disabled={index === photos.length - 1}
              onClick={() => goTo(index + 1)}
              className={cn(arrowClass, "right-3")}
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-xs font-medium tabular-nums text-brand-ink shadow-[0_1px_3px_rgba(16,34,46,0.2)] max-lg:left-0">
              {index + 1} / {photos.length}
            </span>
          </>
        )}

        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label="Відкрити фото на весь екран"
          className="absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-brand-ink shadow-[0_1px_3px_rgba(16,34,46,0.2)] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand max-lg:right-0"
        >
          <Expand className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {many && (
        <ul aria-label="Фото товару" className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
          {photos.map((photo, photoIndex) => (
            <li key={photo + photoIndex} className="shrink-0">
              <button
                type="button"
                onClick={() => goTo(photoIndex)}
                aria-label={`Фото ${photoIndex + 1} з ${photos.length}`}
                aria-current={photoIndex === index ? "true" : undefined}
                className={cn(
                  "relative block h-16 w-12 overflow-hidden rounded-sm border bg-white",
                  photoIndex === index ? "border-brand-ink" : "border-brand-line",
                )}
              >
                <Photo src={photo} alt="" sizes="52px" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog.Root open={zoomed} onOpenChange={setZoomed}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[80] bg-white" style={backdrops[photos[index]] ? { backgroundColor: backdrops[photos[index]] as string } : undefined} />
          <Dialog.Content
            className="fixed inset-0 z-[81] flex flex-col outline-none"
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") setIndex((value) => Math.min(photos.length - 1, value + 1))
              else if (event.key === "ArrowLeft") setIndex((value) => Math.max(0, value - 1))
            }}
          >
            <div className="flex h-14 shrink-0 items-center justify-between bg-white px-4">
              <Dialog.Title className="text-sm font-medium tabular-nums text-brand-muted">
                Фото {index + 1} з {photos.length}
              </Dialog.Title>
              <Dialog.Description className="sr-only">{alt}</Dialog.Description>
              <Dialog.Close
                aria-label="Закрити"
                className="flex h-11 w-11 items-center justify-center rounded-md text-brand-ink hover:bg-brand-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Dialog.Close>
            </div>
            <div className="relative min-h-0 flex-1">
              <Image src={photos[index]} alt={alt} fill sizes="100vw" className="object-contain" />
              {many && (
                <>
                  <button
                    type="button"
                    aria-label="Попереднє фото"
                    disabled={index === 0}
                    onClick={() => setIndex(index - 1)}
                    className={cn(arrowClass, "left-4 flex")}
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Наступне фото"
                    disabled={index === photos.length - 1}
                    onClick={() => setIndex(index + 1)}
                    className={cn(arrowClass, "right-4 flex")}
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
