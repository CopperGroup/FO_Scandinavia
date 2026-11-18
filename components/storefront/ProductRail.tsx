import Link from "next/link"
import { ArrowRight } from "lucide-react"
import ProductCard from "@/components/cards/ProductCard"
import type { CardData } from "@/lib/storefront/navigation"

type Props = {
  title: string
  /** Where "see all" leads. */
  href?: string
  hrefLabel?: string
  cards: CardData[]
  email?: string
  likedIds?: Set<string>
  /** Marks the title for the page editor's preview (data-edit). */
  edit?: string
}

/** A titled row of products: swipeable on phones, a five-column grid on desktop. */
export default function ProductRail({ title, href, hrefLabel = "Дивитися всі", cards, email = "", likedIds, edit }: Props) {
  if (cards.length === 0) return null

  return (
    <section className="shell mt-14 lg:mt-20">
      <div className="mb-5 flex items-end justify-between gap-4 lg:mb-7">
        <h2 data-edit={edit} className="heading-display text-xl sm:text-2xl">{title}</h2>
        {href && (
          <Link
            href={href}
            className="group -my-3 inline-flex min-h-11 items-center shrink-0 gap-2 text-sm font-semibold text-brand hover:text-brand-deep focus-visible:outline-none focus-visible:underline"
          >
            {hrefLabel}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        )}
      </div>

      <ul className="rail">
        {cards.map((card) => (
          <li key={card.key} className="min-w-0">
            <ProductCard
              card={card}
              email={email}
              liked={likedIds?.has(card.id) ?? false}
              showAction={false}
              sizes="(max-width: 1024px) 44vw, 20vw"
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
