import Link from "next/link"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

/**
 * A sortable column heading: a link to the same list sorted by this column.
 * `active` is the direction the list is sorted in now, if by this column.
 */
export function SortLink({ label, href, active }: { label: string; href: string; active: "asc" | "desc" | null }) {
  const Icon = active === "asc" ? ArrowUp : active === "desc" ? ArrowDown : ArrowUpDown
  return (
    <Link
      href={href}
      scroll={false}
      className="inline-flex items-center gap-1 rounded hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
      aria-label={`${label}: ${active === "asc" ? "за зростанням" : active === "desc" ? "за спаданням" : "без сортування"}. Змінити сортування`}
    >
      {label}
      <Icon className={active ? "h-3.5 w-3.5 text-black" : "h-3.5 w-3.5 text-neutral-400"} aria-hidden="true" />
    </Link>
  )
}
