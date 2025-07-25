"use client"

import { useState, Suspense, useEffect } from "react"
import Head from "next/head"
import Image from "next/image"
import { JsonLd } from "react-schemaorg"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, Star, ChevronDown, Flame, Expand } from "lucide-react"
import AddToCart from "./AddToCart"
import ContentView from "../pixel/ContentView"
import { Store } from "@/constants/store"
import { pretifyProductName } from "@/lib/utils"
import BuyNow from "./BuyNow"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { CategoryType } from "@/lib/types/types"
import Link from "next/link"
import ProductImagesCarousel from "../interface/ProductImagesCarousel"
import ProductVariantSelector from "../interface/ProductVariantSelector"

// Only dynamically import the variant selector which is less critical for initial view

type Review = {
  user: string
  rating: number
  text: string
  attachmentsUrls: string[]
  time: string
}

export type Product = {
  _id: string
  name: string
  description: string
  category: CategoryType[]
  images: string[]
  price: number
  priceToShow: number
  params: Array<{ name: string; value: string }>
  articleNumber?: string
  reviews?: Review[]
  isAvailable: boolean
  url: string
}

// Lightweight loading component for reviews
const ReviewsLoading = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-32 bg-gray-100 rounded-lg w-full"></div>
    <div className="h-40 bg-gray-100 rounded-lg w-full"></div>
    <div className="h-40 bg-gray-100 rounded-lg w-full"></div>
  </div>
)

// Separate Reviews component to lazy load
const ProductReviews = ({
  reviews,
  averageRating,
  productId,
  productName,
}: {
  reviews: Review[]
  averageRating: number
  productId: string
  productName: string
}) => {
  const [visibleReviews, setVisibleReviews] = useState(10)
  const hasMoreReviews = reviews.length > visibleReviews

  const handleShowMore = () => {
    setVisibleReviews((prev) => prev + 10)
  }

  return (
    <div className="max-w-3xl">
      {/* Reviews summary */}
      <div className="mb-6 pb-6 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg p-3 sm:p-4 min-w-[100px] sm:min-w-[120px]">
            <span className="text-2xl sm:text-3xl font-semibold text-gray-900">{averageRating.toFixed(1)}</span>
            <div className="flex items-center my-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={14}
                  className={`${
                    star <= Math.round(averageRating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs sm:text-sm text-gray-500">{reviews.length} відгуків</span>
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">Відгуки покупців</h3>
            <p className="text-sm text-gray-500">
              Відгуки від реальних покупців, які придбали цей товар у нашому магазині
            </p>
            <p className="text-xs text-gray-500 mt-1">Показано тільки відгуки з рейтингом 3 зірки і вище</p>
          </div>
        </div>

        <div className="mt-4 sm:mt-6">
          <a
            href={`/catalog/${productId}/review?name=${encodeURIComponent(productName)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Написати відгук про ${productName}`}
          >
            <Button
              variant="outline"
              className="font-medium rounded-full px-4 sm:px-8 py-2 sm:py-6 h-auto border-gray-300 hover:border-gray-900 hover:bg-gray-50 w-full sm:w-auto bg-transparent"
            >
              Написати відгук
            </Button>
          </a>
        </div>
      </div>

      {/* Individual reviews */}
      <div className="space-y-6 sm:space-y-8">
        {reviews.slice(0, visibleReviews).map((review, index) => (
          <div
            key={index}
            className="pb-6 sm:pb-8 border-b border-gray-100 last:border-b-0"
            itemScope
            itemType="https://schema.org/Review"
          >
            <meta itemProp="itemReviewed" content={productName} />
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3">
              <div>
                <h4 className="font-medium text-base sm:text-lg text-gray-900" itemProp="author">
                  {review.user}
                </h4>
                <div
                  className="flex items-center mt-1"
                  itemProp="reviewRating"
                  itemScope
                  itemType="https://schema.org/Rating"
                >
                  <meta itemProp="ratingValue" content={review.rating.toString()} />
                  <meta itemProp="bestRating" content="5" />
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={14}
                      className={`${star <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                    />
                  ))}
                </div>
              </div>

              <time
                dateTime={review.time}
                itemProp="datePublished"
                className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-0"
              >
                {review.time}
              </time>
            </div>

            {/* Review text with preserved line breaks */}
            <div className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-700 whitespace-pre-line" itemProp="reviewBody">
              {review.text}
            </div>

            {/* Review attachments */}
            {review.attachmentsUrls && review.attachmentsUrls.length > 0 && (
              <div className="mt-3 sm:mt-4 flex flex-wrap gap-2 sm:gap-3">
                {review.attachmentsUrls.map((url, imgIndex) => (
                  <div
                    key={imgIndex}
                    className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-lg overflow-hidden border border-gray-200"
                  >
                    <Image
                      src={url || "/placeholder.svg"}
                      alt={`Фото від ${review.user} до відгуку про ${productName}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 64px, 96px"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Advantages and disadvantages */}
            {review.text.includes("Переваги:") && (
              <div className="mt-3 sm:mt-4 text-sm">
                <div className="text-green-600 font-medium">
                  Переваги:
                  <span className="text-gray-700 font-normal ml-2">
                    {review.text.split("Переваги:")[1].split("Недоліки:")[0].trim()}
                  </span>
                </div>
                {review.text.includes("Недоліки:") && (
                  <div className="text-red-600 font-medium mt-2">
                    Недоліки:
                    <span className="text-gray-700 font-normal ml-2">{review.text.split("Недоліки:")[1].trim()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Show more button */}
      {hasMoreReviews && (
        <div className="mt-6 sm:mt-8 text-center">
          <Button
            variant="outline"
            onClick={handleShowMore}
            className="font-medium rounded-full px-4 sm:px-8 py-2 sm:py-6 h-auto border-gray-300 hover:border-gray-900 hover:bg-gray-50 w-full sm:w-auto bg-transparent"
          >
            Показати більше відгуків <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

// Empty reviews state component
const NoReviews = ({ productId, productName }: { productId: string; productName: string }) => (
  <div className="w-full text-center py-8 sm:py-16">
    <h3 className="text-xl sm:text-2xl font-semibold mb-2">Ще немає відгуків</h3>
    <p className="text-gray-500 mb-6 sm:mb-8 px-4">Будьте першим, хто залишить відгук про цей товар</p>
    <a
      href={`/catalog/${productId}/review?name=${encodeURIComponent(productName)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Написати перший відгук про ${productName}`}
    >
      <Button
        variant="outline"
        className="font-medium rounded-full px-4 sm:px-8 py-2 sm:py-6 h-auto border-gray-300 hover:border-gray-900 hover:bg-gray-50 w-full sm:w-auto mx-4 bg-transparent"
      >
        Написати відгук
      </Button>
    </a>
  </div>
)

export default function ProductPage({
  productJson,
  selectParams,
}: {
  productJson: string
  selectParams: Record<string, { _id: string; value: string }[]>
}) {
  const product = JSON.parse(productJson) as Product
  const pretifiedName = pretifyProductName(product.name, [], product.articleNumber || "", 0)
  const optimizedDescription = product.description // Removes empty <p></p>

  // Extract key product features for meta description
  const keyFeatures = product.params
    .filter((param) => ["Процесор", "Пам'ять", "Екран", "Камера"].includes(param.name))
    .map((param) => `${param.name}: ${param.value.replaceAll("_", " ")}`)
    .join(", ")

  // Create optimized meta description
  const metaDescription = keyFeatures
    ? `${pretifiedName} - ${keyFeatures}. Купуйте з гарантією та безкоштовною доставкою від ${Store.name}.`
    : `${pretifiedName} - Купуйте з гарантією та безкоштовною доставкою від ${Store.name}. ${product.description.slice(0, 120).replace(/<\/?[^>]+(>|$)/g, "")}`

  // Check if product is a best seller (more than 20 reviews)
  const isBestSeller = product.reviews && product.reviews.length > 20

  // Filter reviews to only show ratings >= 3
  const filteredReviews = product.reviews?.filter((review) => review.rating >= 3) || []

  // Sort reviews by number of attachments (most attachments first)
  const sortedReviews = [...filteredReviews].sort(
    (a, b) => (b.attachmentsUrls?.length || 0) - (a.attachmentsUrls?.length || 0),
  )

  // Calculate discount percentage if there's a sale
  const discountPercentage =
    product.priceToShow !== product.price
      ? Math.round(((product.price - product.priceToShow) / product.price) * 100)
      : 0

  // Check if product is in stock (assuming it is for this example)
  const inStock = product.isAvailable

  // Calculate average rating if filtered reviews exist
  const hasReviews = filteredReviews.length > 0
  const averageRating = hasReviews
    ? filteredReviews.reduce((acc, review) => acc + review.rating, 0) / filteredReviews.length
    : 0

  // State to track active tab for lazy loading
  const [activeTab, setActiveTab] = useState("description")

  // Generate canonical URL
  const canonicalUrl = `${Store.domain}/catalog/${product._id}`

  // Extract main category and subcategory for breadcrumbs
  // Provide a fallback object for mainCategory if product.category is empty or undefined.
  const mainCategory = product.category?.[0] || { name: "Без категорії", _id: "uncategorized" }

  // For SEO, ensure the page has mounted before rendering client-side only components
  const [hasMounted, setHasMounted] = useState(false)

  // Pre-calculate content heights to prevent layout shifts
  const titleHeight = pretifiedName.length > 50 ? "h-[4.5rem] sm:h-[6rem]" : "h-[3rem] sm:h-[4rem]"
  const descriptionPreviewHeight = "h-[4.5rem] sm:h-[5.5rem]"

  useEffect(() => {
    setHasMounted(true)
  }, [])

  return (
    <>
      <Head>
        <title>
          {pretifiedName} | Купити в {Store.name} | Ціна {product.priceToShow} {Store.currency_sign}
        </title>
        <meta name="description" content={metaDescription} />
        <meta
          name="keywords"
          content={`${pretifiedName}, ${mainCategory.name}, ${product.params.map((p) => p.value).join(", ")}, купити, ціна`}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />

        {/* Canonical URL */}
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph Tags */}
        <meta property="og:title" content={`${pretifiedName} | ${Store.name}`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={product.images[0]} />
        <meta property="og:image:alt" content={pretifiedName} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content={Store.name} />
        <meta property="product:price:amount" content={product.priceToShow.toString()} />
        <meta property="product:price:currency" content="UAH" />
        <meta property="product:availability" content={inStock ? "in stock" : "out of stock"} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${pretifiedName} | ${Store.name}`} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={product.images[0]} />

        {/* Additional SEO Meta Tags */}
        <meta name="robots" content="index, follow" />
        <meta name="language" content="Ukrainian" />
        <meta name="revisit-after" content="7 days" />
        <meta name="author" content={Store.name} />

        {/* Preload LCP image with high priority */}
        <link rel="preload" href={product.images[0]} as="image" fetchPriority="high" />

        {/* Add preconnect for image domain */}
        {product.images[0]?.includes("rozetka.com.ua") && (
          <link rel="preconnect" href="https://content.rozetka.com.ua" crossOrigin="anonymous" />
        )}
      </Head>

      {/* Enhanced Schema.org JSON-LD */}
      <JsonLd
        item={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: pretifiedName,
          image: product.images,
          description: product.description.replace(/<\/?[^>]+(>|$)/g, "").slice(0, 5000),
          sku: product.articleNumber || product._id,
          mpn: product.articleNumber,
          brand: {
            "@type": "Brand",
            name: product.params.find((param) => param.name === "Бренд")?.value || "Бренд",
          },
          offers: {
            "@type": "Offer",
            url: canonicalUrl,
            price: product.priceToShow,
            priceCurrency: "UAH",
            priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0],
            availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            seller: {
              "@type": "Organization",
              name: Store.name,
            },
            shippingDetails: {
              "@type": "OfferShippingDetails",
              shippingRate: {
                "@type": "MonetaryAmount",
                value: "100",
                currency: "UAH",
              },
              deliveryTime: {
                "@type": "ShippingDeliveryTime",
                handlingTime: {
                  "@type": "QuantitativeValue",
                  minValue: 1,
                  maxValue: 3,
                  unitCode: "DAY",
                },
                transitTime: {
                  "@type": "QuantitativeValue",
                  minValue: 1,
                  maxValue: 5,
                  unitCode: "DAY",
                },
              },
            },
            hasMerchantReturnPolicy: {
              "@type": "MerchantReturnPolicy",
              applicableCountry: "UA",
              returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
              merchantReturnDays: 14,
              returnMethod: "https://schema.org/ReturnByMail",
              returnFees: "https://schema.org/FreeReturn",
            },
          },
          ...(hasReviews && {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: averageRating.toString(),
              reviewCount: filteredReviews.length.toString(),
              bestRating: "5",
              worstRating: "1",
            },
            review: filteredReviews.slice(0, 5).map((review) => ({
              "@type": "Review",
              author: {
                "@type": "Person",
                name: review.user,
              },
              datePublished: review.time,
              reviewRating: {
                "@type": "Rating",
                ratingValue: review.rating.toString(),
                bestRating: "5",
                worstRating: "1",
              },
              reviewBody: review.text,
            })),
          }),
        }}
      />

      {/* BreadcrumbList Schema */}
      <JsonLd
        item={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Головна",
              item: Store.domain,
            },
            // Only include the category breadcrumb if a valid category exists
            ...(product.category && product.category.length > 0
              ? [
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: mainCategory.name, // Use the safely accessed mainCategory name
                    item: `${Store.domain}/catalog?categories=${mainCategory._id}`, // Use the safely accessed mainCategory _id
                  },
                ]
              : []),
            {
              "@type": "ListItem",
              // Adjust position based on whether category breadcrumb is included
              position: product.category && product.category.length > 0 ? 3 : 2,
              name: pretifiedName,
              item: canonicalUrl,
            },
          ],
        }}
      />

      {/* Organization Schema */}
      <JsonLd
        item={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: Store.name,
          url: Store.domain,
          logo: `${Store.domain}/logo.png`,
          contactPoint: {
            "@type": "ContactPoint",
            telephone: Store.phoneNumber,
            contactType: "customer service",
            availableLanguage: ["Ukrainian", "English"],
          },
          sameAs: [
            "https://www.facebook.com/yourstore",
            "https://www.instagram.com/yourstore",
            "https://twitter.com/yourstore",
          ],
        }}
      />

      {/* Add a CSS class to ensure the entire page doesn't overflow horizontally */}
      <section className="bg-white w-full overflow-x-hidden" lang="uk">
        <ContentView
          productName={pretifiedName}
          // Safely access category name, provide default if not available
          productCategory={mainCategory.name}
          productId={product._id}
          contentType="product"
          value={product.priceToShow}
          currency="UAH"
        />

        {/* Breadcrumb navigation - Enhanced for SEO */}
        <div className="max-w-[1200px] mx-auto px-3 sm:px-6 py-2 sm:py-4 overflow-x-auto no-scrollbar">
          <nav aria-label="Breadcrumb" className="flex items-center text-xs sm:text-sm text-gray-500 min-w-[320px]">
            <Link href={Store.catalog_link} className="hover:text-gray-900 transition-colors flex-shrink-0">
              Каталог
            </Link>
            <ChevronRight className="h-3 w-3 mx-1 sm:mx-2 flex-shrink-0" aria-hidden="true" />
            {/* CONDITIONAL RENDERING FOR CATEGORY LINK */}
            {product.category && product.category.length > 0 && (
              <>
                <Link
                  href={`/catalog?page=1&sort=default&categories=${mainCategory._id}`}
                  className="hover:text-gray-900 transition-colors flex-shrink-0"
                >
                  {mainCategory.name}
                </Link>
                <ChevronRight className="h-3 w-3 mx-1 sm:mx-2 flex-shrink-0" aria-hidden="true" />
              </>
            )}
            <span
              className="text-gray-900 font-medium truncate max-w-[120px] sm:max-w-[200px] block"
              aria-current="page"
            >
              {pretifiedName}
            </span>
          </nav>
        </div>

        <article
          itemScope
          itemType="https://schema.org/Product"
          className="max-w-[1200px] mx-auto px-3 sm:px-6 pb-12 sm:pb-24 pt-3 sm:pt-6 overflow-hidden"
        >
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-16">
            {/* Product Images Section - Improved container for mobile */}
            <div className="w-full max-w-full overflow-hidden">
              <div className="w-full max-w-full relative">
                <ProductImagesCarousel images={product.images} />

                <meta itemProp="image" content={product.images[0]} />
              </div>
            </div>

            {/* Product Info Section - Fixed height elements to prevent layout shifts */}
            <div className={`space-y-4 sm:space-y-8 max-w-xl ${!product.isAvailable ? "opacity-60" : ""}`}>
              {/* Product Title and Status - Fixed heights */}
              <div className="space-y-2 sm:space-y-4">
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  {product.isAvailable ? (
                    <Badge
                      variant="outline"
                      className="bg-green-100 text-green-700 border-0 rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-medium"
                    >
                      В наявності
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-red-100 text-red-700 border-0 rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-medium"
                    >
                      Немає в наявності
                    </Badge>
                  )}
                  {/* Best Seller Badge - only show if available */}
                  {isBestSeller && product.isAvailable && (
                    <Badge className="bg-orange-100 text-orange-700 border-0 rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-medium flex items-center">
                      <Flame className="h-3 w-3 mr-1" /> Хіт продаж
                    </Badge>
                  )}
                </div>

                <div className="overflow-visible">
                  <h1
                    className="text-2xl sm:text-3xl md:text-4xl font-semibold text-gray-900 tracking-tight leading-tight break-words"
                    itemProp="name"
                  >
                    {pretifiedName}
                    {!product.isAvailable && (
                      <span className="block text-lg sm:text-xl text-red-600 font-normal mt-2">
                        Товар тимчасово недоступний
                      </span>
                    )}
                  </h1>
                </div>

                {/* Display rating if reviews exist and product is available */}
                {hasReviews && product.isAvailable && (
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={14}
                          className={`${
                            star <= Math.round(averageRating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs sm:text-sm text-gray-500">
                      {averageRating.toFixed(1)} ({filteredReviews.length} відгуків)
                    </span>
                  </div>
                )}

                <div className="overflow-hidden">
                  <p className="text-base sm:text-lg md:text-xl text-gray-500 leading-relaxed break-words">
                    {!product.isAvailable
                      ? "Цей товар тимчасово недоступний. Зв'яжіться з нами для уточнення термінів надходження."
                      : `${product.description.slice(0, 100).replace(/<\/?[^>]+(>|$)/g, "")}...`}
                  </p>
                </div>
              </div>

              {/* Price Section */}
              <div className="pt-2 sm:pt-4">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span itemProp="offers" itemScope itemType="https://schema.org/Offer">
                    <span
                      className={`text-2xl sm:text-3xl font-medium ${product.isAvailable ? "text-gray-900" : "text-gray-500"}`}
                    >
                      <span>{Store.currency_sign}</span>
                      <span itemProp="price" content={product.priceToShow.toString()}>
                        {product.priceToShow}
                      </span>
                    </span>
                    <meta itemProp="priceCurrency" content="UAH" />
                    <link
                      itemProp="availability"
                      href={product.isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"}
                    />
                    <meta itemProp="url" content={canonicalUrl} />
                    <meta
                      itemProp="priceValidUntil"
                      content={
                        new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0]
                      }
                    />
                  </span>

                  {discountPercentage > 0 && product.isAvailable && (
                    <>
                      <span className="text-base sm:text-xl text-gray-500 line-through">
                        {Store.currency_sign}
                        {product.price}
                      </span>
                      <Badge className="bg-gray-100 text-gray-900 border-0 rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-medium hover:bg-red-500 hover:text-white">
                        Економія {discountPercentage}%
                      </Badge>
                    </>
                  )}
                </div>

                {!product.isAvailable && (
                  <p className="text-sm text-gray-500 mt-2">Ціна може змінитися до моменту надходження товару</p>
                )}
              </div>

              {/* Variant Selector - only show if available */}
              {product.isAvailable && (
                <div className="pt-2 sm:pt-4">
                  <Suspense fallback={<div className="h-16 sm:h-20 bg-gray-100 rounded-lg animate-pulse"></div>}>
                    {hasMounted && <ProductVariantSelector selectParams={selectParams} productId={product._id} />}
                  </Suspense>
                </div>
              )}

              {/* Call to Action Buttons */}
              <div className="flex flex-col gap-2 sm:gap-3 pt-4 sm:pt-6">
                {product.isAvailable ? (
                  <>
                    <BuyNow
                      id={product._id}
                      name={product.name}
                      image={product.images[0]}
                      price={product.priceToShow}
                      priceWithoutDiscount={product.price}
                      url={product.url}
                    />
                    <AddToCart
                      id={product._id}
                      name={product.name}
                      image={product.images[0]}
                      price={product.priceToShow}
                      priceWithoutDiscount={product.price}
                      variant="full"
                      url={product.url}
                    />
                  </>
                ) : (
                  <div className="space-y-2">
                    <Button
                      disabled
                      className="w-full py-3 sm:py-4 text-sm sm:text-base font-medium rounded-full bg-gray-300 text-gray-500 cursor-not-allowed"
                    >
                      Товар недоступний
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full py-3 sm:py-4 text-sm sm:text-base font-medium rounded-full bg-transparent"
                      onClick={() => window.open(`tel:${Store.phoneNumber}`, "_self")}
                    >
                      Зв&apos;язатися з нами
                    </Button>
                  </div>
                )}
              </div>

              {/* Shipping & Payment Info - only show if available */}
              {product.isAvailable && (
                <div className="grid grid-cols-1 gap-3 sm:gap-4 pt-4 sm:pt-8 border-t border-gray-200">
                  {/* Your existing shipping info content */}
                </div>
              )}
            </div>
          </div>

          {/* Product Details Tabs */}
          <div className="mt-12 sm:mt-24">
            <Tabs defaultValue="description" className="w-full" onValueChange={setActiveTab}>
              {/* Ensure the tabs don't cause overflow by adding proper overflow handling */}
              <div className="overflow-x-auto pb-2 no-scrollbar">
                <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 min-w-[320px]">
                  <TabsTrigger
                    value="description"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-black px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium whitespace-nowrap"
                  >
                    Опис
                  </TabsTrigger>
                  <TabsTrigger
                    value="specifications"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-black px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium whitespace-nowrap"
                  >
                    Характеристики
                  </TabsTrigger>
                  {/* <TabsTrigger
                    value="reviews"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-black px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium whitespace-nowrap"
                  >
                    Відгуки {hasReviews && `(${filteredReviews.length})`}
                  </TabsTrigger> */}
                </TabsList>
              </div>

              <TabsContent value="description" className="mt-4 sm:mt-8 px-1 sm:px-6">
                {/* Fix the prose content to prevent overflow */}
                <div className="max-w-3xl">
                  <div
                    className="prose prose-sm sm:prose-base lg:prose-lg max-w-none text-gray-700 overflow-hidden [&_p:empty]:min-h-[1em]"
                    itemProp="description"
                    dangerouslySetInnerHTML={{ __html: optimizedDescription }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="specifications" className="mt-4 sm:mt-8 px-1 sm:px-6">
                <div className="max-w-3xl overflow-x-auto no-scrollbar">
                  <div className="grid md:grid-cols-1 gap-4 sm:gap-8 min-w-[300px]">
                    <table className="w-full border-collapse">
                      <tbody>
                        {product.params.map((param) => (
                          <tr key={param.name} className="border-b border-gray-100">
                            <td className="py-3 sm:py-4 text-gray-500 w-1/3 text-xs sm:text-sm">{param.name}</td>
                            <td className="py-3 sm:py-4 text-gray-900 text-xs sm:text-sm">
                              {param.value.replaceAll("_", " ")}
                            </td>
                          </tr>
                        ))}
                        {product.articleNumber && (
                          <tr className="border-b border-gray-100">
                            <td className="py-3 sm:py-4 text-gray-500 w-1/3 text-xs sm:text-sm">Артикул</td>
                            <td className="py-3 sm:py-4 text-gray-900 text-xs sm:text-sm">{product.articleNumber}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="mt-4 sm:mt-8 px-1 sm:px-6">
                {activeTab === "reviews" && (
                  <Suspense fallback={<ReviewsLoading />}>
                    {hasReviews ? (
                      <ProductReviews
                        reviews={sortedReviews}
                        averageRating={averageRating}
                        productId={product._id}
                        productName={pretifiedName}
                      />
                    ) : (
                      <NoReviews productId={product._id} productName={pretifiedName} />
                    )}
                  </Suspense>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </article>
      </section>
    </>
  )
}