"use client"

import { useEffect, useId, useRef } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { adminButton } from "@/components/admin/ui"
import { cn } from "@/lib/utils"

/**
 * A modal for short tasks (a confirmation, one or two fields). Rendered in a
 * portal under the admin Select's popover layer (z-90), so a Select inside the
 * dialog opens above it. Escape and a click on the backdrop close it; focus
 * moves into the dialog, is kept there with Tab, and returns afterwards.
 */
export default function AdminDialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  tone = "default",
  busy = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
  footer?: React.ReactNode
  tone?: "default" | "danger"
  /** While true, Escape, the backdrop and the close button do nothing (an action is running). */
  busy?: boolean
}) {
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const busyRef = useRef(busy)
  busyRef.current = busy

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const node = panel.current
    const focusable = () =>
      Array.from(node?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),textarea,[tabindex]:not([tabindex="-1"])') ?? [])
    // First field if there is one, otherwise the dialog itself.
    const first = focusable().find((element) => element.tagName === "INPUT") ?? node
    first?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) {
        // A Select popover open inside the dialog handles its own Escape first.
        if (document.querySelector("[data-radix-popper-content-wrapper]")) return
        event.preventDefault()
        closeRef.current()
      }
      if (event.key === "Tab") {
        const items = focusable()
        if (items.length === 0) return
        const firstItem = items[0]
        const lastItem = items[items.length - 1]
        if (event.shiftKey && document.activeElement === firstItem) {
          event.preventDefault()
          lastItem.focus()
        } else if (!event.shiftKey && document.activeElement === lastItem) {
          event.preventDefault()
          firstItem.focus()
        }
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [open])

  if (!open || typeof document === "undefined") return null

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={() => !busy && onClose()} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-lg border border-neutral-200 bg-white text-neutral-900 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.35)] focus:outline-none"
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className={cn("text-base font-semibold", tone === "danger" && "text-red-700")}>
              {title}
            </h2>
            {description && (
              <div id={descriptionId} className="mt-1 text-sm text-neutral-500">
                {description}
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} disabled={busy} className={adminButton.icon} aria-label="Закрити">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {children && <div className="overflow-y-auto px-4 py-3">{children}</div>}
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-200 px-4 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
