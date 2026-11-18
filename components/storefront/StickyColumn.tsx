"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

/**
 * A column that stays in view while the neighbouring column scrolls (desktop only).
 *
 * If it fits in the window it sticks just below the header. If it is taller
 * than the window it sticks by its bottom edge instead, so every part of it can
 * still be reached: a plain `position: sticky; top: N` would leave the lower
 * part cut off until the very end of the page.
 *
 * The offset is one CSS expression: min(below the header, window height minus
 * own height). The only thing measured in JavaScript is the column's height,
 * and --sticky-top already follows the header, so nothing is computed on scroll.
 */
export default function StickyColumn({ children, className, gap = 24 }: { children: React.ReactNode; className?: string; gap?: number }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(() => {
      element.style.setProperty("--column-h", `${element.offsetHeight}px`)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      data-sticky-column=""
      className={cn("lg:sticky lg:transition-[top] lg:duration-200", className)}
      style={{ top: `min(calc(var(--sticky-top) + ${gap}px), calc(100dvh - var(--column-h, 0px) - ${gap}px))` }}
    >
      {children}
    </div>
  )
}
