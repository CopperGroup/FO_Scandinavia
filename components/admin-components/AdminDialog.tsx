"use client"

import { useEffect, useRef } from "react"
import { X } from "lucide-react"
import { adminButton } from "@/components/admin/ui"
import { cn } from "@/lib/utils"

/**
 * A modal on the native <dialog> element: focus is kept inside, Escape and
 * the backdrop close it, and the page behind cannot be reached.
 */
export function AdminDialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  size?: "md" | "lg"
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      aria-labelledby="admin-dialog-title"
      className={cn(
        "w-[calc(100%-2rem)] rounded-lg border border-neutral-200 bg-white p-0 text-neutral-900 backdrop:bg-black/40",
        size === "lg" ? "max-w-2xl" : "max-w-md",
      )}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-4 py-3">
            <div className="min-w-0">
              <h2 id="admin-dialog-title" className="font-display text-base font-semibold tracking-[-0.02em]">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
            </div>
            <button type="button" onClick={onClose} className={adminButton.icon} aria-label="Закрити">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-200 px-4 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  )
}
