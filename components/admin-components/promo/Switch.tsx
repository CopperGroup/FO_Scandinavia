"use client"

import { cn } from "@/lib/utils"

/** On/off switch with its label and one line under it; the same control as «Продається в магазині» of a product. */
export function Switch({
  id,
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  id: string
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  hint?: React.ReactNode
  disabled?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={hint ? `${id}-hint` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-black" : "bg-neutral-300",
        )}
      >
        <span className={cn("inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-[1.125rem]" : "translate-x-0.5")} />
      </button>
      <div className="min-w-0">
        <label id={`${id}-label`} htmlFor={id} className="cursor-pointer text-sm font-medium text-neutral-900">
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} className="mt-0.5 text-xs text-neutral-500">
            {hint}
          </p>
        )}
      </div>
    </div>
  )
}
