import Image from "next/image"
import Link from "next/link"
import { countLabel, PRODUCT_FORMS } from "@/lib/storefront/format"
import { cn } from "@/lib/utils"

export type Quadrant = {
  title: string
  href: string
  /** Null hides the line with the number of products. */
  count: number | null
  image: string
  /** Marks the tile for the page editor's preview (data-edit). */
  edit?: string
  /** `edit` marks a link for the page editor's preview, like the tile's own mark. */
  links: { label: string; href: string; edit?: string }[]
}

/**
 * The home page directory, laid out as a Nordic cross: four blue fields
 * (the store's four kinds of goods) separated by a yellow cross whose
 * vertical arm sits left of centre, as on the Swedish flag.
 */
export default function FlagDirectory({ quadrants }: { quadrants: [Quadrant, Quadrant, Quadrant, Quadrant] }) {
  return (
    <nav
      aria-label="Відділи магазину"
      className="grid grid-cols-[5fr_9fr] gap-2 bg-brand-sun sm:gap-3 lg:gap-4 max-sm:grid-cols-2"
    >
      {quadrants.map((quadrant, index) => (
        <div
          key={index}
          data-edit={quadrant.edit}
          className={cn(
            "group relative isolate flex min-h-[190px] flex-col justify-end overflow-hidden bg-brand p-4 text-white sm:min-h-[230px] sm:p-6 lg:min-h-[270px] lg:p-8",
          )}
        >
          <Image
            src={quadrant.image}
            alt=""
            fill
            priority={index < 2}
            sizes={index % 2 === 0 ? "(max-width: 640px) 50vw, 36vw" : "(max-width: 640px) 50vw, 64vw"}
            className="-z-10 object-cover opacity-45 mix-blend-luminosity transition-opacity duration-500 group-hover:opacity-60"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-brand-deep/90 via-brand/30 to-transparent" aria-hidden="true" />

          <h2 className="font-display text-xl font-semibold tracking-[-0.03em] sm:text-3xl lg:text-4xl">
            <Link href={quadrant.href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:underline">
              {quadrant.title}
            </Link>
          </h2>
          {quadrant.count !== null && <p className="mt-2 text-sm text-white/85">{countLabel(quadrant.count, PRODUCT_FORMS)}</p>}

          <ul className="relative z-10 mt-3 flex flex-wrap gap-x-4 gap-y-2 max-sm:hidden">
            {quadrant.links.map((link, linkIndex) => (
              <li key={linkIndex} className="min-w-0">
                <Link
                  href={link.href}
                  data-edit={link.edit}
                  className="break-words text-base font-medium text-white underline decoration-brand-sun decoration-2 underline-offset-4 hover:text-brand-sun focus-visible:outline-none focus-visible:text-brand-sun"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
