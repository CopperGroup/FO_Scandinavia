"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

/** Puts a promo code on the clipboard and says so. */
export default function CopyCode({ code, className }: { code: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle")
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  async function copy() {
    let done = false
    try {
      await navigator.clipboard.writeText(code)
      done = true
    } catch {
      // Older browsers and pages opened inside some apps have no clipboard access: fall back to a hidden field.
      try {
        const field = document.createElement("textarea")
        field.value = code
        field.setAttribute("readonly", "")
        field.style.position = "fixed"
        field.style.opacity = "0"
        document.body.appendChild(field)
        field.select()
        done = document.execCommand("copy")
        field.remove()
      } catch {
        done = false
      }
    }
    setState(done ? "copied" : "failed")
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setState("idle"), 2500)
  }

  return (
    <button type="button" onClick={copy} className={cn("btn-secondary h-11 shrink-0 px-4 text-sm", className)}>
      {state === "copied" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      <span aria-live="polite">{state === "copied" ? "Скопійовано" : state === "failed" ? "Виділіть код і скопіюйте" : "Скопіювати"}</span>
    </button>
  )
}
