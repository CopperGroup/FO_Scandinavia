"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"

/**
 * The tooltip of the admin panel. It is mounted once (in <AdminShell>) and
 * serves every element of the panel, in server and client components alike:
 *
 *  - `data-tip="…"` on any element: the text shows on hover and on keyboard
 *    focus. `data-tip-side="right"` puts it to the right (the sidebar);
 *    otherwise it sits above, or below when there is no room above.
 *  - A button or a link with only an icon shows its `aria-label` on hover: it
 *    needs no `data-tip` unless the tooltip should say more than the name.
 *  - Text cut with an ellipsis (`truncate`, `line-clamp-*`) shows in full on
 *    hover without any attribute.
 *  - `data-tip-click` (the <Hint> "i") also opens on a click or a tap, so the
 *    explanation is reachable on a touch screen.
 *
 * A tooltip adds to what is on the screen and never carries what the admin
 * needs in order to finish a task: it has no place on a phone and cannot be
 * read while typing. Text only; a line break in the text is kept.
 */

const OPEN_DELAY = 350
/** Moving from one tip to the next within this time skips the delay. */
const WARM_FOR = 500
const GAP = 6
const EDGE = 8
const TIP_ID = "admin-tip"

type Target = { element: HTMLElement; text: string }
type Place = { left: number; top: number }

function findTarget(start: EventTarget | null): Target | null {
  if (!(start instanceof Element)) return null
  const marked = start.closest<HTMLElement>("[data-tip]")
  const text = marked?.dataset.tip?.trim()
  if (marked && text) return { element: marked, text }

  // A control with an icon and no words shows its name.
  const named = start.closest<HTMLElement>("a[aria-label], button[aria-label], [role=button][aria-label]")
  const name = named?.getAttribute("aria-label")?.trim()
  if (named && name && !named.textContent?.trim()) return { element: named, text: name }

  // Text that did not fit: the element itself or one of its nearest parents.
  let node: HTMLElement | null = start instanceof HTMLElement ? start : start.parentElement
  for (let depth = 0; node && depth < 3; depth++, node = node.parentElement) {
    const cutAcross = node.scrollWidth > node.clientWidth + 1
    const cutDown = node.scrollHeight > node.clientHeight + 1
    if (!cutAcross && !cutDown) continue
    const style = getComputedStyle(node)
    const clamped = style.getPropertyValue("-webkit-line-clamp")
    if ((cutAcross && style.textOverflow === "ellipsis") || (cutDown && clamped && clamped !== "none")) {
      const full = node.textContent?.replace(/\s+/g, " ").trim()
      if (full) return { element: node, text: full }
    }
  }
  return null
}

export default function TipLayer() {
  const [shown, setShown] = useState<Target | null>(null)
  const [place, setPlace] = useState<Place | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const current = useRef<Target | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closedAt = useRef(0)

  useEffect(() => {
    const cancel = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = null
    }
    const close = () => {
      cancel()
      if (!current.current) return
      const { element } = current.current
      if (element.getAttribute("aria-describedby") === TIP_ID) element.removeAttribute("aria-describedby")
      current.current = null
      closedAt.current = Date.now()
      setShown(null)
      setPlace(null)
    }
    const open = (target: Target) => {
      cancel()
      if (current.current && current.current.element !== target.element) close()
      current.current = target
      // A screen reader hears the text as a description, unless it is already the name.
      if (!target.element.hasAttribute("aria-describedby") && !(target.element.getAttribute("aria-label") ?? "").includes(target.text)) {
        target.element.setAttribute("aria-describedby", TIP_ID)
      }
      setPlace(null)
      setShown(target)
    }

    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType === "touch") return
      const target = findTarget(event.target)
      if (!target) return close()
      if (current.current?.element === target.element) return
      cancel()
      if (current.current) close()
      const warm = Date.now() - closedAt.current < WARM_FOR
      if (warm) open(target)
      else timer.current = setTimeout(() => open(target), OPEN_DELAY)
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = findTarget(event.target)
      if (target?.element.hasAttribute("data-tip-click")) {
        if (current.current?.element === target.element && event.pointerType === "touch") close()
        else open(target)
        return
      }
      close()
    }
    const onFocusIn = (event: FocusEvent) => {
      if (!(event.target instanceof HTMLElement) || !event.target.matches(":focus-visible")) return
      // Typing in a field must not be covered by its own tooltip.
      if (event.target.matches("input, textarea, select, [contenteditable=true]")) return
      const target = findTarget(event.target)
      if (target) open(target)
    }
    const onFocusOut = () => close()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key.length === 1) close()
    }
    const onMove = () => close()
    // The element may disappear under the pointer (a row is removed, a menu closes).
    const watch = setInterval(() => {
      const target = current.current
      if (target && (!target.element.isConnected || !(target.element.matches(":hover") || target.element.matches(":focus-within")))) close()
    }, 400)

    document.addEventListener("pointerover", onPointerOver, { passive: true })
    document.addEventListener("pointerdown", onPointerDown, { passive: true })
    document.addEventListener("focusin", onFocusIn)
    document.addEventListener("focusout", onFocusOut)
    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("scroll", onMove, { capture: true, passive: true })
    window.addEventListener("resize", onMove)
    return () => {
      cancel()
      clearInterval(watch)
      document.removeEventListener("pointerover", onPointerOver)
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("focusin", onFocusIn)
      document.removeEventListener("focusout", onFocusOut)
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("scroll", onMove, { capture: true })
      window.removeEventListener("resize", onMove)
    }
  }, [])

  // Measured once it is in the page, then moved into place before the browser paints.
  useLayoutEffect(() => {
    if (!shown || !box.current) return
    const rect = shown.element.getBoundingClientRect()
    const width = box.current.offsetWidth
    const height = box.current.offsetHeight
    const clampX = (value: number) => Math.max(EDGE, Math.min(value, window.innerWidth - width - EDGE))
    const clampY = (value: number) => Math.max(EDGE, Math.min(value, window.innerHeight - height - EDGE))

    if (shown.element.dataset.tipSide === "right" && rect.right + GAP + width <= window.innerWidth - EDGE) {
      setPlace({ left: rect.right + GAP, top: clampY(rect.top + rect.height / 2 - height / 2) })
      return
    }
    const above = rect.top - GAP - height
    setPlace({ left: clampX(rect.left + rect.width / 2 - width / 2), top: above >= EDGE ? above : clampY(rect.bottom + GAP) })
  }, [shown])

  if (!shown) return null
  return (
    <div ref={box} id={TIP_ID} role="tooltip" className="admin-tip" style={place ? { left: Math.round(place.left), top: Math.round(place.top) } : { left: 0, top: 0, visibility: "hidden" }}>
      {shown.text}
    </div>
  )
}
