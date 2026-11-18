import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { MessageCircle, PackageCheck, RotateCcw, Truck, Wallet } from "lucide-react"
import LikeButton from "@/components/interface/LikeButton"
import ContentView from "@/components/pixel/ContentView"
import { ProductReviews, type Review } from "@/components/shared/ProductReviews"
import Breadcrumbs, { type Crumb } from "@/components/storefront/Breadcrumbs"
import ProductRail from "@/components/storefront/ProductRail"
import StickyColumn from "@/components/storefront/StickyColumn"
import BuyActions from "@/components/storefront/product/BuyActions"
import ProductGallery from "@/components/storefront/product/ProductGallery"
import SpecList, { type Spec } from "@/components/storefront/product/SpecList"
import VariantSelector from "@/components/storefront/product/VariantSelector"
import { Store } from "@/constants/store"
import { fetchProductPageInfo } from "@/lib/actions/cache"
import type { ProductVariants } from "@/lib/catalog/types"
import { vendorLabel } from "@/lib/catalog/vendors"
import { withAmount } from "@/lib/content/schema"
import { getContent, getFreeDelivery } from "@/lib/content/server"
import { returnPolicyJsonLd, shippingJsonLd } from "@/lib/policies"
import { getStorePolicies } from "@/lib/storefront/policies"
import { money } from "@/lib/storefront/format"
import { findDepartment, getNavigation, getProductCard, getRelatedCards } from "@/lib/storefront/navigation"
import { getCurrentUser } from "@/lib/storefront/session"
import JsonLd from "@/components/seo/JsonLd"
import { absoluteUrl, breadcrumbJsonLd, clip, plainText } from "@/lib/seo"
import { cn, pretifyProductName, replaceDescription } from "@/lib/utils"

type PageProps = { params: { id: string }; searchParams: { choose?: string } }

type Product = {
  _id: string
  id?: string
  name: string
  description?: string
  category?: { _id: string; name: string }[]
  images?: string[]
  price: number
  priceToShow: number
  params?: { name: string; value: string }[]
  articleNumber?: string
  reviews?: Review[]
  isAvailable: boolean
  quantity?: number
  vendor?: string
  url?: string
}

/** Null when there is no such product. A database failure is not caught here: it must be an error page, not "not found". */
async function loadProduct(id: string): Promise<{ product: Product; variants: ProductVariants | null } | null> {
  const data = await fetchProductPageInfo(id)
  return data.product ? data : null
}

const baseTitle = (product: Product, variants: ProductVariants | null) =>
  variants?.title || pretifyProductName(product.name, [], product.articleNumber || "", 0)

const selectedSizeOf = (variants: ProductVariants | null) =>
  variants?.axes.find((axis) => axis.key === "size")?.options.find((option) => option.selected)?.label ?? null

const stripTags = (html: string) => html.replace(/<\/?[^>]+(>|$)/g, " ").replace(/\s+/g, " ").trim()

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await loadProduct(params.id)
  // Here, before the page starts streaming, "not found" still becomes a real 404 status.
  if (!data) notFound()

  const { product, variants } = data
  const size = selectedSizeOf(variants)
  const title = size ? `${baseTitle(product, variants)}, розмір ${size}` : baseTitle(product, variants)
  // What a search result should say first: the price and whether it can be bought; then the start of the description.
  const purchasable = product.isAvailable && (product.quantity ?? 1) > 0
  const discount = product.price > product.priceToShow ? Math.round(((product.price - product.priceToShow) / product.price) * 100) : 0
  const facts = `${title}: ${money(product.priceToShow)}${discount > 0 ? `, знижка ${discount}%` : ""}, ${purchasable ? "є в наявності" : "немає в наявності"}. Доставка Новою поштою по Україні.`
  const description = clip(`${facts} ${plainText(replaceDescription(product.description ?? ""))}`)
  const url = `${Store.domain}/catalog/${product._id}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: Store.name,
      locale: "uk_UA",
      title,
      description,
      url,
      images: product.images?.[0] ? [{ url: product.images[0], alt: title }] : undefined,
    },
  }
}

const Page = async ({ params, searchParams }: PageProps) => {
  const data = await loadProduct(params.id)
  if (!data) notFound()

  const { product, variants } = data
  const images = product.images ?? []
  // Supplier files repeat a line now and then: one row per name and value.
  const specs: Spec[] = []
  for (const param of product.params ?? []) {
    const name = String(param?.name ?? "").trim()
    const value = String(param?.value ?? "").replaceAll("_", " ").trim()
    if (name && value && !specs.some((spec) => spec.name === name && spec.value === value)) specs.push({ name, value })
  }
  const categoryIds = (product.category ?? []).map((category) => String(category._id))

  const [navigation, user, related, card, notes, freeFrom, policies] = await Promise.all([
    getNavigation(),
    getCurrentUser(),
    getRelatedCards(String(product._id), categoryIds),
    getProductCard(String(product._id)),
    // Edited in the admin: Сторінки → Сторінка товару.
    getContent<{ delivery: string; freeDelivery: string; returns: string; returnsLink: string; payment: string }>("product"),
    getFreeDelivery(),
    // Set in the admin: Налаштування → Доставка і повернення.
    getStorePolicies(),
  ])
  const deliveryNote = withAmount(notes.delivery, freeFrom)
  const freeDeliveryNote = withAmount(notes.freeDelivery, freeFrom)
  const likedIds = new Set(user?.likedIds ?? [])

  const title = baseTitle(product, variants)
  // The catalog knows the brand under one canonical spelling; that is also what its filter expects.
  // A product that is not in the catalog (sold out) still gets the same spelling as its siblings.
  const brand = card?.vendor || vendorLabel(product.vendor || specs.find((param) => param.name === "Бренд")?.value || "")
  const canonicalUrl = `${Store.domain}/catalog/${product._id}`
  const purchasable = product.isAvailable && (product.quantity ?? 1) > 0

  // The axis the shopper has to decide on: sizes when there are any, else the generic "variant".
  const axis = variants?.axes[0] ?? null
  const choices = axis?.options.filter((option) => option.purchasable) ?? []
  const pending = searchParams.choose === "1" && choices.length > 1
  const selectedOption = pending ? null : axis?.options.find((option) => option.selected) ?? null
  const selectedSize = selectedSizeOf(variants)
  const otherVariantsInStock = (variants?.purchasableVariants ?? 0) > 0

  const discount = product.price > product.priceToShow ? Math.round(((product.price - product.priceToShow) / product.price) * 100) : 0

  const mainCategory = product.category?.[0]
  const department = mainCategory ? findDepartment(navigation, navigation.departmentsByCategory[String(mainCategory._id)]?.[0]) : undefined
  const crumbs: Crumb[] = []
  if (department) crumbs.push({ label: department.label, href: `/catalog?department=${department.key}` })
  if (mainCategory) {
    crumbs.push({
      label: mainCategory.name,
      href: department ? `/catalog?department=${department.key}&categories=${mainCategory._id}` : `/catalog?categories=${mainCategory._id}`,
    })
  }
  crumbs.push({ label: title })

  // Every review is shown, the low ones too: a rating that leaves them out would mislead shoppers and search engines.
  const publishedReviews = product.reviews ?? []
  const sortedReviews = [...publishedReviews].sort((a, b) => (b.attachmentsUrls?.length || 0) - (a.attachmentsUrls?.length || 0))
  const hasReviews = publishedReviews.length > 0
  const averageRating = hasReviews ? publishedReviews.reduce((sum, review) => sum + review.rating, 0) / publishedReviews.length : 0

  const axisPrompt = axis?.key === "size" ? "Оберіть розмір" : "Оберіть варіант"
  const variantLabel = selectedOption && axis ? `${axis.label}: ${selectedOption.label}` : null
  const description = (product.description ?? "").trim()
  const hasDescription = stripTags(description).length > 0

  /*
   * Structured data. This page is one variant (one size) of a model, and every size has its own page:
   * Google's "multi-page" variant markup is a ProductGroup that holds this variant in full and the
   * addresses of the others, so the sizes are understood as one product instead of look-alike pages.
   */
  const plainDescription = plainText(description).slice(0, 5000)
  const color = variants?.siblingAxisLabel === "Колір" ? variants.siblings.find((sibling) => sibling.selected)?.label : specs.find((spec) => spec.name === "Колір")?.value
  // Return and delivery terms: only what the owner stated, nothing is assumed.
  const returnPolicy = returnPolicyJsonLd(policies)
  const shipping = shippingJsonLd(policies, { price: product.priceToShow, freeFrom })
  const structuredVariant = {
    "@type": "Product",
    name: selectedSize ? `${title}, розмір ${selectedSize}` : title,
    image: images,
    ...(plainDescription && { description: plainDescription }),
    sku: product.articleNumber || product._id,
    ...(product.articleNumber && { mpn: product.articleNumber }),
    ...(selectedSize && { size: selectedSize }),
    ...(color && { color }),
    ...(brand && { brand: { "@type": "Brand", name: brand } }),
    offers: {
      "@type": "Offer",
      url: canonicalUrl,
      price: product.priceToShow,
      priceCurrency: "UAH",
      availability: purchasable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: Store.name },
      // The price before the discount, the way search engines read a crossed-out price.
      ...(discount > 0 && {
        priceSpecification: { "@type": "UnitPriceSpecification", priceType: "https://schema.org/StrikethroughPrice", price: product.price, priceCurrency: "UAH" },
      }),
      ...(returnPolicy && { hasMerchantReturnPolicy: returnPolicy }),
      ...(shipping && { shippingDetails: shipping }),
    },
    ...(hasReviews && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: averageRating.toFixed(1),
        reviewCount: publishedReviews.length.toString(),
        bestRating: "5",
        worstRating: "1",
      },
      // The reviews themselves, as the page shows them (the first ten are enough for a search engine).
      review: sortedReviews.slice(0, 10).map((review) => ({
        "@type": "Review",
        author: { "@type": "Person", name: review.user },
        reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5, worstRating: 1 },
        ...(review.text && { reviewBody: plainText(review.text).slice(0, 1000) }),
      })),
    }),
  }
  const otherVariants = (axis?.options ?? []).filter((option) => option.productId !== String(product._id)).slice(0, 60)
  const structuredProduct: Record<string, unknown> =
    variants && otherVariants.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ProductGroup",
          name: title,
          ...(plainDescription && { description: plainDescription }),
          ...(brand && { brand: { "@type": "Brand", name: brand } }),
          productGroupID: variants.groupKey,
          ...(axis?.key === "size" && { variesBy: ["https://schema.org/size"] }),
          hasVariant: [structuredVariant, ...otherVariants.map((option) => ({ url: absoluteUrl(`/catalog/${option.productId}`) }))],
        }
      : { "@context": "https://schema.org", ...structuredVariant }

  return (
    <>
      <JsonLd data={structuredProduct} />
      <JsonLd data={breadcrumbJsonLd(crumbs, canonicalUrl)} />
      <ContentView
        productName={title}
        productCategory={mainCategory?.name ?? "Без категорії"}
        productId={product._id}
        contentType="product"
        value={product.priceToShow}
        currency="UAH"
      />

      <div className="shell pt-4 lg:pt-6">
        <Breadcrumbs crumbs={crumbs} className="max-lg:hidden" />
        {mainCategory && (
          <Link
            href={crumbs[crumbs.length - 2]?.href ?? "/catalog"}
            className="inline-flex min-h-11 items-center text-sm text-brand-muted hover:text-brand focus-visible:outline-none focus-visible:underline lg:hidden"
          >
            ← {mainCategory.name}
          </Link>
        )}

        <article className="mt-3 grid gap-x-12 gap-y-6 lg:mt-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] xl:gap-x-16">
          <div className="min-w-0">
            <ProductGallery images={images} alt={title} />
          </div>

          <div className="min-w-0 lg:row-span-2">
            <StickyColumn>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  {brand && (
                    <Link
                      href={card?.vendor ? `/catalog?vendor=${encodeURIComponent(card.vendor)}` : `/catalog?search=${encodeURIComponent(brand)}`}
                      className="text-sm font-semibold text-brand hover:text-brand-deep focus-visible:outline-none focus-visible:underline"
                    >
                      {brand}
                    </Link>
                  )}
                  <h1 className="mt-1 break-words text-xl font-semibold text-brand-ink sm:text-2xl">{title}</h1>
                </div>
                <LikeButton
                  className="-mr-1 shrink-0"
                  circleClassName="border border-brand-line shadow-none"
                  initiallyLiked={likedIds.has(String(product._id))}
                  productId={product.id ?? String(product._id)}
                  productName={title}
                  value={product.priceToShow}
                  email={user?.email ?? ""}
                />
              </div>

              <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={cn("text-2xl font-semibold tabular-nums", discount > 0 ? "text-brand-sale" : "text-brand-ink")}>
                  {money(product.priceToShow)}
                </span>
                {discount > 0 && (
                  <>
                    <span className="text-base tabular-nums text-brand-muted line-through">{money(product.price)}</span>
                    <span className="rounded-sm bg-brand-sale px-2 leading-5 text-sm font-bold tabular-nums text-white">−{discount}%</span>
                  </>
                )}
              </p>

              {variants && (
                <div className="mt-6">
                  <VariantSelector variants={variants} pending={pending} />
                </div>
              )}

              <div className="mt-6">
                {purchasable ? (
                  <BuyActions
                    id={String(product._id)}
                    name={product.name}
                    image={images[0] ?? ""}
                    price={product.priceToShow}
                    priceWithoutDiscount={product.price}
                    url={product.url ?? ""}
                    variantLabel={variantLabel}
                    pending={pending}
                    axisKey={axis?.key ?? null}
                    axisPrompt={axisPrompt}
                    priceText={money(product.priceToShow)}
                  />
                ) : (
                  <div className="rounded-md bg-brand-mist p-5">
                    <p className="font-semibold text-brand-ink">
                      {selectedSize ? `Розміру ${selectedSize} зараз немає в наявності` : "Цього товару зараз немає в наявності"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-brand-muted">
                      {otherVariantsInStock
                        ? "Оберіть інший варіант вище або запитайте нас, коли чекати на надходження."
                        : "Запитайте нас, коли чекати на надходження."}
                    </p>
                    <Link href="/info/contacts" className="btn-secondary mt-4 h-11">
                      Запитати про наявність
                    </Link>
                  </div>
                )}
              </div>

              <ul className="mt-6 space-y-4 border-t border-brand-line pt-6 text-sm text-brand-ink">
                <li className="flex gap-3">
                  <PackageCheck className={cn("h-5 w-5 shrink-0", purchasable ? "text-brand-ok" : "text-brand-muted")} aria-hidden="true" />
                  <span>
                    {purchasable ? "Є в наявності" : "Немає в наявності"}
                    {product.articleNumber && <span className="block text-brand-muted">Артикул {product.articleNumber}</span>}
                  </span>
                </li>
                {(deliveryNote || freeDeliveryNote) && (
                  <li className="flex gap-3">
                    <Truck className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
                    <span>
                      <span data-edit={deliveryNote ? "product:delivery" : "product:freeDelivery"}>{deliveryNote || freeDeliveryNote}</span>
                      {deliveryNote && freeDeliveryNote && (
                        <span className="block text-brand-muted" data-edit="product:freeDelivery">
                          {freeDeliveryNote}
                        </span>
                      )}
                    </span>
                  </li>
                )}
                {(notes.returns || notes.returnsLink) && (
                  <li className="flex gap-3">
                    <RotateCcw className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
                    <span>
                      <span data-edit="product:returns">{notes.returns}</span>
                      {notes.returnsLink && (
                        <Link href="/info/warranty-services" data-edit="product:returnsLink" className="-my-3 flex min-h-11 w-fit items-center text-brand-muted">
                          <span className="link-quiet">{notes.returnsLink}</span>
                        </Link>
                      )}
                    </span>
                  </li>
                )}
                {notes.payment && (
                  <li className="flex gap-3">
                    <Wallet className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
                    <span data-edit="product:payment">{withAmount(notes.payment, freeFrom)}</span>
                  </li>
                )}
                <li className="flex gap-3">
                  <MessageCircle className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
                  <span>
                    {axis?.key === "size" ? "Не впевнені щодо розміру?" : "Виникли питання?"}{" "}
                    <Link href="/info/contacts" className="font-medium link-quiet">
                      Напишіть нам
                    </Link>
                  </span>
                </li>
              </ul>
            </StickyColumn>
          </div>

          <div className="min-w-0 space-y-10 border-t border-brand-line pt-8 lg:pt-10">
            {hasDescription && (
              <section aria-labelledby="product-description">
                <h2 id="product-description" className="heading-display text-xl">
                  Опис
                </h2>
                <div className="rich-text mt-4 max-w-[68ch]" dangerouslySetInnerHTML={{ __html: description }} />
              </section>
            )}

            {/* The article alone is not a section: it already stands next to the availability. */}
            {specs.length > 0 && (
              <section aria-labelledby="product-specs">
                <h2 id="product-specs" className="heading-display text-xl">
                  Характеристики
                </h2>
                <SpecList specs={product.articleNumber ? [...specs, { name: "Артикул", value: product.articleNumber }] : specs} />
              </section>
            )}

            {hasReviews && (
              <section aria-labelledby="product-reviews">
                <h2 id="product-reviews" className="heading-display text-xl">
                  Відгуки
                </h2>
                <div className="mt-4">
                  <ProductReviews reviews={sortedReviews} averageRating={averageRating} productName={title} />
                </div>
              </section>
            )}
          </div>
        </article>
      </div>

      <ProductRail title="Схожі товари" cards={related} email={user?.email} likedIds={likedIds} />
    </>
  )
}

export default Page
