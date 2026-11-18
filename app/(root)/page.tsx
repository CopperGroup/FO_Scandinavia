import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import FactIcon from "@/components/content/FactIcon"
import JsonLd from "@/components/seo/JsonLd"
import FlagDirectory, { type Quadrant } from "@/components/storefront/FlagDirectory"
import ProductRail from "@/components/storefront/ProductRail"
import { NEW_HREF, SALE_HREF, categoryHref } from "@/components/storefront/types"
import type { DepartmentKey, NavCategory } from "@/lib/catalog/departments"
import { withAmount } from "@/lib/content/schema"
import { getContent, getFreeDelivery } from "@/lib/content/server"
import { returnPolicyJsonLd } from "@/lib/policies"
import { getStorePolicies } from "@/lib/storefront/policies"
import { HOME_TILES, type HomeTile } from "@/lib/content/schema"
import { resolveTarget, type LinkItem } from "@/lib/content/targets"
import { getHomeData, getNavigation } from "@/lib/storefront/navigation"
import { Store } from "@/constants/store"
import { getCurrentUser, getStoreContacts } from "@/lib/storefront/session"

export const dynamic = "force-dynamic"

export const metadata: Metadata = { alternates: { canonical: "/" } }

const QUADRANT_IMAGES = { clothing: "/assets/1.jpg", shoes: "/assets/2.jpg", food: "/assets/3.jpg", home: "/assets/4.jpg" }

type HomeContent = {
  headline: string
  facts: { icon: string; title: string; text: string }[]
  shoesTitle: string
  clothingTitle: string
  foodTitle: string
  homeTitle: string
  shoesTarget: string
  clothingTarget: string
  foodTarget: string
  homeTarget: string
  shoesLinks: LinkItem[]
  clothingLinks: LinkItem[]
  foodLinks: LinkItem[]
  homeLinks: LinkItem[]
  popularTitle: string
  categoriesTitle: string
  saleTitle: string
  newTitle: string
  brandsTitle: string
}

/** The texts are edited in the admin: Сторінки → Головна сторінка. */
export default async function Home() {
  const [navigation, home, user, content, freeDelivery, contacts, policies] = await Promise.all([
    getNavigation(),
    getHomeData(),
    getCurrentUser(),
    getContent<HomeContent>("home"),
    getFreeDelivery(),
    getStoreContacts(),
    getStorePolicies(),
  ])
  const returnPolicy = returnPolicyJsonLd(policies)
  const likedIds = new Set(user?.likedIds ?? [])

  // Four tiles; the title, where each one leads and the small links under it come from the page editor.
  // While the owner has set no links for a tile, the shop puts its own there.
  const tile = (slot: HomeTile, title: string, target: string, links: LinkItem[]): Quadrant => {
    const resolved = resolveTarget(navigation, target, HOME_TILES[slot], links)
    return {
      title,
      image: QUADRANT_IMAGES[slot],
      edit: `home:${slot}Title`,
      href: resolved.href,
      count: resolved.count,
      links: resolved.links.map((link) => ({ label: link.label, href: link.href, edit: link.index === undefined ? `home:${slot}Links` : `home:${slot}Links.${link.index}` })),
    }
  }
  const quadrants: [Quadrant, Quadrant, Quadrant, Quadrant] = [
    tile("shoes", content.shoesTitle, content.shoesTarget, content.shoesLinks),
    tile("clothing", content.clothingTitle, content.clothingTarget, content.clothingLinks),
    tile("food", content.foodTitle, content.foodTarget, content.foodLinks),
    tile("home", content.homeTitle, content.homeTarget, content.homeLinks),
  ]

  // The most stocked categories across the store, each shown once.
  const seen = new Set<string>()
  const popularCategories: { category: NavCategory; department: DepartmentKey }[] = []
  for (const department of navigation.departments) {
    for (const group of department.groups) {
      for (const category of group.categories) {
        if (seen.has(category.id) || !category.image) continue
        seen.add(category.id)
        popularCategories.push({ category, department: department.key })
      }
    }
  }
  popularCategories.sort((a, b) => b.category.count - a.category.count)

  // A fact that names the free-delivery sum disappears while free delivery is switched off.
  const facts = content.facts
    .map((fact) => ({ icon: fact.icon, title: withAmount(fact.title, freeDelivery), text: withAmount(fact.text, freeDelivery), hidden: withAmount(`${fact.title} ${fact.text}`, freeDelivery) === "" }))
    .filter((fact) => fact.title && !fact.hidden)

  return (
    <>
      {/* The name search engines show for the site, and the shop behind it. */}
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", name: Store.name, url: `${Store.domain}/`, inLanguage: "uk" }} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "OnlineStore",
          name: Store.name,
          url: `${Store.domain}/`,
          ...((contacts.phone || contacts.email) && {
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "customer service",
              ...(contacts.phone && { telephone: contacts.phone }),
              ...(contacts.email && { email: contacts.email }),
              areaServed: "UA",
              availableLanguage: "uk",
            },
          }),
          // The return terms of the whole shop: Налаштування → Доставка і повернення.
          ...(returnPolicy && { hasMerchantReturnPolicy: returnPolicy }),
        }}
      />
      <section className="shell pt-6 lg:pt-10">
        {/* One line across the flag on desktop: the size follows the window so it never wraps into a half-empty row. */}
        <h1 className="heading-display mb-5 text-balance text-2xl sm:text-4xl lg:mb-7 lg:whitespace-nowrap lg:text-[clamp(28px,2.95vw,43px)]">
          <span data-edit="home:headline">{content.headline}</span>
        </h1>

        <FlagDirectory quadrants={quadrants} />
      </section>

      {facts.length > 0 && (
        <section aria-label="Умови покупки" className="shell mt-8 lg:mt-10">
          <ul data-edit="home:facts" className={`grid grid-cols-1 gap-x-6 gap-y-4 border-y min-[480px]:grid-cols-2 min-[480px]:gap-y-6 border-brand-line py-6 lg:py-7 ${facts.length === 4 ? "lg:grid-cols-4" : facts.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
            {facts.map(({ icon, title, text }, index) => (
              <li key={`${index}-${title}`} className="flex gap-3">
                <FactIcon name={icon} className="h-6 w-6 shrink-0 text-brand" />
                <div>
                  <p className="text-sm font-semibold text-brand-ink">{title}</p>
                  {text && <p className="mt-1 text-sm text-brand-muted">{text}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ProductRail edit="home:popularTitle" title={content.popularTitle} href="/catalog?sort=popular" cards={home.popular} email={user?.email} likedIds={likedIds} />

      {popularCategories.length > 0 && (
        <section className="shell mt-14 lg:mt-20">
          <div className="mb-5 flex items-end justify-between gap-4 lg:mb-7">
            <h2 data-edit="home:categoriesTitle" className="heading-display text-xl sm:text-2xl">{content.categoriesTitle}</h2>
            <Link href="/catalog" className="-my-3 inline-flex min-h-11 items-center shrink-0 text-sm font-semibold text-brand hover:text-brand-deep focus-visible:outline-none focus-visible:underline">
              Увесь каталог
            </Link>
          </div>
          <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 lg:grid-cols-6 lg:gap-x-5 lg:gap-y-8">
            {popularCategories.slice(0, 12).map(({ category, department }) => (
              <li key={category.id}>
                <Link href={categoryHref(category.id, department)} className="group block focus-visible:outline-none">
                  <span className="relative block aspect-square overflow-hidden rounded-sm bg-brand-mist transition-colors group-hover:bg-brand-tint group-focus-visible:ring-2 group-focus-visible:ring-brand">
                    <Image
                      src={category.image as string}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 16vw"
                      className="object-contain p-2 mix-blend-multiply"
                    />
                  </span>
                  <span className="mt-2 block text-sm font-medium text-brand-ink group-hover:text-brand">{category.name}</span>
                  <span className="text-xs tabular-nums text-brand-muted">{category.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ProductRail edit="home:saleTitle" title={content.saleTitle} href={SALE_HREF} hrefLabel="Усі знижки" cards={home.onSale} email={user?.email} likedIds={likedIds} />
      <ProductRail edit="home:newTitle" title={content.newTitle} href={NEW_HREF} hrefLabel="Усі новинки" cards={home.newest} email={user?.email} likedIds={likedIds} />

      {home.brands.length > 0 && (
        <section className="shell mt-14 lg:mt-20">
          <h2 data-edit="home:brandsTitle" className="heading-display mb-5 text-xl sm:text-2xl lg:mb-7">{content.brandsTitle}</h2>
          <ul className="flex flex-wrap gap-2">
            {home.brands.map((brand) => (
              <li key={brand.name}>
                <Link
                  href={`/catalog?vendor=${encodeURIComponent(brand.name)}`}
                  className="inline-flex h-11 items-center gap-2 rounded-md border border-brand-line px-4 text-base font-medium text-brand-ink transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {brand.name}
                  <span className="text-xs tabular-nums text-brand-muted">{brand.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
