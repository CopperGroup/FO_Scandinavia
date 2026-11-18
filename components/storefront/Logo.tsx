import Link from "next/link"
import { Store } from "@/constants/store"
import { cn } from "@/lib/utils"

/**
 * Wordmark with the Nordic cross: a long horizontal bar crossed off-centre,
 * the proportion every Scandinavian flag shares.
 */
export function NordicCross({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 20" aria-hidden="true" className={cn("h-5 w-8", className)}>
      <rect x="0" y="8" width="32" height="4" fill="currentColor" />
      <rect x="10" y="0" width="4" height="20" fill="currentColor" />
    </svg>
  )
}

export default function Logo({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${Store.name} — на головну`}
      className={cn(
        "group inline-flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sun focus-visible:ring-offset-2",
        tone === "light" ? "text-white focus-visible:ring-offset-brand-navy" : "text-brand focus-visible:ring-offset-white",
        className,
      )}
    >
      <NordicCross className="text-brand-sun" />
      <span className="font-display text-xl font-semibold tracking-[-0.03em] sm:text-xl">{Store.name}</span>
    </Link>
  )
}
