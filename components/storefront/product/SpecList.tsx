"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export type Spec = { name: string; value: string }

/** A longer list than this is folded, so the page does not turn into a table. */
const FOLD_OVER = 12
const SHOWN_FOLDED = 10

/**
 * Characteristics of a product as a two-column list. A long list shows its
 * first rows and a button for the rest; the folded rows stay in the page, so
 * a search engine and "find on page" still see them once opened.
 */
export default function SpecList({ specs }: { specs: Spec[] }) {
  const foldable = specs.length > FOLD_OVER
  const [open, setOpen] = useState(false)
  const folded = (index: number) => foldable && !open && index >= SHOWN_FOLDED

  return (
    <>
      <dl id="product-spec-list" className="mt-4 divide-y divide-brand-line border-y border-brand-line text-base">
        {specs.map((spec, index) => (
          <div
            key={`${spec.name}-${index}`}
            // The attribute keeps the dividers right, the class does the hiding ("grid" would win over the attribute).
            hidden={folded(index)}
            className={cn(folded(index) ? "hidden" : "grid", "grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]")}
          >
            <dt className="break-words text-brand-muted">{spec.name}</dt>
            <dd className="break-words text-brand-ink">{spec.value}</dd>
          </div>
        ))}
      </dl>
      {foldable && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls="product-spec-list"
          onClick={() => setOpen(!open)}
          className="mt-2 inline-flex min-h-11 items-center gap-2 text-base font-medium text-brand-ink hover:text-brand focus-visible:outline-none focus-visible:underline"
        >
          {open ? "Згорнути характеристики" : `Показати всі характеристики (${specs.length})`}
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
      )}
    </>
  )
}
