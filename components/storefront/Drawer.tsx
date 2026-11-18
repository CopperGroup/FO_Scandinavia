"use client"

import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Screen-reader description of what the panel is for. */
  description?: string
  side?: "left" | "right" | "bottom"
  className?: string
  /** Shown to the right of the title, before the close button. */
  headerExtra?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
}

const SIDE: Record<NonNullable<Props["side"]>, string> = {
  left: "inset-y-0 left-0 h-full w-[calc(100vw-3.5rem)] max-w-[380px] data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
  right: "inset-y-0 right-0 h-full w-full max-w-[440px] data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
  bottom:
    "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-xl data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
}

/** Modal side panel with a fixed header and footer and a scrolling body. */
export default function Drawer({
  open,
  onOpenChange,
  title,
  description,
  side = "right",
  className,
  headerExtra,
  footer,
  children,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-brand-ink/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={description ? undefined : undefined}
          className={cn(
            "fixed z-[71] flex flex-col bg-white text-brand-ink shadow-2xl outline-none duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
            SIDE[side],
            className,
          )}
        >
          <div className="flex h-14 shrink-0 items-center gap-3 border-b border-brand-line pl-4 pr-1">
            <Dialog.Title className="font-display text-lg font-semibold tracking-[-0.02em]">{title}</Dialog.Title>
            <div className="ml-auto flex items-center gap-1">
              {headerExtra}
              <Dialog.Close
                aria-label="Закрити"
                className="flex h-11 w-11 items-center justify-center rounded-md text-brand-ink hover:bg-brand-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Dialog.Close>
            </div>
          </div>
          <Dialog.Description className="sr-only">{description ?? title}</Dialog.Description>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
          {footer && <div className="shrink-0 border-t border-brand-line bg-white pb-[env(safe-area-inset-bottom)]">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
