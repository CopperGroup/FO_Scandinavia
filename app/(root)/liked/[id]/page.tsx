import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Heart } from "lucide-react"
import ProductCard from "@/components/cards/ProductCard"
import Breadcrumbs from "@/components/storefront/Breadcrumbs"
import { fetchLikedProducts } from "@/lib/actions/product.actions"
import { countLabel, PRODUCT_FORMS } from "@/lib/storefront/format"
import { getProductCard, type CardData } from "@/lib/storefront/navigation"
import { getCurrentUser } from "@/lib/storefront/session"

export const metadata: Metadata = {
  title: "Обране",
  robots: { index: false, follow: false },
}

const Page = async ({ params }: { params: { id: string } }) => {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  // A wishlist is personal: only its owner opens it.
  if (user.id !== params.id) redirect(`/liked/${user.id}`)

  const liked: any[] = JSON.parse(JSON.stringify(await fetchLikedProducts(user.id)))

  // Show each liked item the way the catalog does: one card per item, the liked size opened.
  const cards: CardData[] = []
  const seen = new Set<string>()
  for (const product of liked) {
    const id = String(product._id)
    const card = await getProductCard(id)
    const key = card?.key ?? id
    if (seen.has(key)) continue
    seen.add(key)
    cards.push(
      card
        ? { ...card, id, productId: String(product.id ?? card.productId), mustChoose: false }
        : {
            key: id,
            id,
            productId: String(product.id ?? id),
            title: product.name,
            name: product.name,
            vendor: product.vendor ?? "",
            image: product.images?.[0] ?? null,
            hoverImage: null,
            url: product.url ?? "",
            price: product.price,
            priceToShow: product.priceToShow,
            priceMin: product.priceToShow,
            priceMax: product.priceToShow,
            discountPercent: 0,
            sizes: [],
            variantCount: 2, // not in stock right now: the card links to the page instead of offering "add to cart"
            axisLabel: "Варіант",
            colorCount: 1,
            isNew: false,
            mustChoose: false,
          },
    )
  }

  return (
    <div className="shell pt-4 lg:pt-6">
      <Breadcrumbs crumbs={[{ label: "Обране" }]} />
      <h1 className="heading-display mt-3 text-2xl sm:text-3xl">Обране</h1>

      {cards.length === 0 ? (
        <div className="mt-8 rounded-md bg-brand-mist px-6 py-16 text-center">
          <Heart className="mx-auto h-10 w-10 text-brand-muted/50" aria-hidden="true" />
          <h2 className="heading-display mt-4 text-xl">Тут поки порожньо</h2>
          <p className="mx-auto mt-2 max-w-sm text-base text-brand-muted">Натисніть на сердечко біля товару, щоб зберегти його тут.</p>
          <Link href="/catalog" className="btn-blue mt-6">
            Перейти до каталогу
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-brand-muted">{countLabel(cards.length, PRODUCT_FORMS)}</p>
          <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-10 xl:grid-cols-5">
            {cards.map((card, index) => (
              <li key={card.key} className="min-w-0">
                <ProductCard card={card} email={user.email} liked priority={index < 4} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export default Page
