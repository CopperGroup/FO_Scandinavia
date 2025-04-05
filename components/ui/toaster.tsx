"use client"

import { Toast, ToastClose, ToastProvider, ToastViewport } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { Check, Info, AlertTriangle } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, variant, ...props }) => {
        // Select icon based on variant
        let Icon = Info
        if (variant === "success") Icon = Check
        else if (variant === "destructive") Icon = AlertTriangle
        else if (variant === "warning") Icon = AlertTriangle

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0">
                <Icon className="h-4 w-4" />
              </div>
              <div className="grid gap-1">
                {title && <div className="text-sm font-semibold">{title}</div>}
                {description && <div className="text-sm opacity-90">{description}</div>}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

