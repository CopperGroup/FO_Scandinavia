"use client"

import { useEffect, useRef, useState } from "react"

/** Pixels per second the row drifts at. Slow enough to read a label as it passes. */
const SPEED = 26
/** How long the row waits after the visitor touched it before it drifts again. */
const RESUME_AFTER_MS = 2500
const DRAG_THRESHOLD = 6

/**
 * A row of links that drifts sideways on its own and never ends: when the
 * items do not fit, they are laid out twice and the position wraps around.
 *
 * It stays an ordinary scrollable row: swipe, trackpad and mouse drag all
 * work, and the drift pauses while the pointer or the keyboard focus is on it,
 * while the page is hidden, and for a moment after any manual scroll. With
 * "reduce motion" switched on in the system it does not move by itself at all.
 *
 * `children` are the <li> items; `label` names the navigation.
 */
export default function AutoScrollRow({
  children,
  label,
  className = "",
  scrollerClassName = "",
}: {
  children: React.ReactNode
  label: string
  className?: string
  /** Side padding of the scrolling box, for rows that bleed to the window edge on phones. */
  scrollerClassName?: string
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const first = useRef<HTMLUListElement>(null)
  const [loop, setLoop] = useState(false)

  // Whether the items overflow decides if there is anything to scroll (and to repeat).
  useEffect(() => {
    const box = scroller.current
    const list = first.current
    if (!box || !list) return
    const measure = () => setLoop(list.scrollWidth > box.clientWidth + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    observer.observe(list)
    return () => observer.disconnect()
  }, [])

  // Start with the chosen item in view.
  useEffect(() => {
    const box = scroller.current
    const active = first.current?.querySelector<HTMLElement>("[aria-current='true']")
    if (box && active) box.scrollLeft = Math.max(0, active.offsetLeft - 16)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const box = scroller.current
    const list = first.current
    if (!box || !list || !loop) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
    let frame = 0
    let last = 0
    let position = box.scrollLeft
    let hovering = false
    let focused = false
    let visible = true
    let pausedUntil = 0
    let drag: { x: number; left: number; moved: boolean } | null = null
    let suppressClick = false

    /** Width of one copy of the items, including the gap before the next copy. */
    const span = () => {
      const second = list.nextElementSibling as HTMLElement | null
      return second ? second.offsetLeft - list.offsetLeft : list.scrollWidth
    }

    const wrap = () => {
      const width = span()
      if (width <= 0) return
      if (box.scrollLeft >= width) box.scrollLeft -= width
      else if (box.scrollLeft <= 0 && drag) box.scrollLeft += width
      position = box.scrollLeft
    }

    const hold = () => {
      pausedUntil = performance.now() + RESUME_AFTER_MS
    }

    const tick = (now: number) => {
      const elapsed = last ? Math.min(now - last, 64) : 0
      last = now
      const drifting = !reduced.matches && visible && !hovering && !focused && !drag && now >= pausedUntil && document.visibilityState === "visible"
      if (drifting) {
        position += (SPEED * elapsed) / 1000
        const width = span()
        if (width > 0 && position >= width) position -= width
        box.scrollLeft = position
      } else {
        position = box.scrollLeft
      }
      frame = requestAnimationFrame(tick)
    }

    const onEnter = (event: PointerEvent) => {
      if (event.pointerType === "mouse") hovering = true
    }
    const onLeave = () => {
      hovering = false
    }
    const onFocusIn = () => {
      focused = true
    }
    const onFocusOut = () => {
      focused = box.contains(document.activeElement)
    }
    const onManual = () => {
      hold()
      wrap()
    }

    // Mouse drag: grab the row and pull it. A drag is not a click on the link under it.
    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return
      drag = { x: event.clientX, left: box.scrollLeft, moved: false }
    }
    const onMove = (event: PointerEvent) => {
      if (!drag) return
      const delta = event.clientX - drag.x
      if (!drag.moved && Math.abs(delta) < DRAG_THRESHOLD) return
      drag.moved = true
      box.style.cursor = "grabbing"
      const width = span()
      let next = drag.left - delta
      if (width > 0) next = ((next % width) + width) % width
      box.scrollLeft = next
    }
    const onUp = () => {
      if (!drag) return
      suppressClick = drag.moved
      drag = null
      box.style.cursor = ""
      hold()
    }
    const onClick = (event: MouseEvent) => {
      if (!suppressClick) return
      suppressClick = false
      event.preventDefault()
      event.stopPropagation()
    }

    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
    })
    seen.observe(box)

    box.addEventListener("pointerenter", onEnter)
    box.addEventListener("pointerleave", onLeave)
    box.addEventListener("focusin", onFocusIn)
    box.addEventListener("focusout", onFocusOut)
    box.addEventListener("wheel", onManual, { passive: true })
    box.addEventListener("touchstart", onManual, { passive: true })
    box.addEventListener("touchmove", onManual, { passive: true })
    box.addEventListener("pointerdown", onDown)
    box.addEventListener("click", onClick, true)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      seen.disconnect()
      box.removeEventListener("pointerenter", onEnter)
      box.removeEventListener("pointerleave", onLeave)
      box.removeEventListener("focusin", onFocusIn)
      box.removeEventListener("focusout", onFocusOut)
      box.removeEventListener("wheel", onManual)
      box.removeEventListener("touchstart", onManual)
      box.removeEventListener("touchmove", onManual)
      box.removeEventListener("pointerdown", onDown)
      box.removeEventListener("click", onClick, true)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [loop])

  return (
    <nav aria-label={label} className={className}>
      <div
        ref={scroller}
        className={
          "no-scrollbar flex overflow-x-auto overscroll-x-contain " +
          scrollerClassName +
          " " +
          (loop ? "cursor-grab select-none [mask-image:linear-gradient(to_right,transparent,black_28px,black_calc(100%-28px),transparent)]" : "")
        }
      >
        <ul ref={first} className="flex shrink-0 gap-2 leading-5 pr-2">
          {children}
        </ul>
        {loop && (
          // The same items again, so the row can wrap around. Hidden from assistive tech and the keyboard.
          <ul aria-hidden="true" {...({ inert: "" } as Record<string, string>)} className="flex shrink-0 gap-2 leading-5 pr-2">
            {children}
          </ul>
        )}
      </div>
    </nav>
  )
}
