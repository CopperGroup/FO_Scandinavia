"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronDown, Star } from "lucide-react"
import { plural } from "@/lib/storefront/format"

export type Review = {
  user: string
  rating: number
  text: string
  attachmentsUrls: string[]
  time: string
}

const PAGE = 10
const REVIEW_FORMS: [string, string, string] = ["відгук", "відгуки", "відгуків"]

function Stars({ rating }: { rating: number }) {
  const filled = Math.round(rating)
  return (
    <span role="img" aria-label={`Оцінка ${filled} з 5`} className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={`h-4 w-4 ${star <= filled ? "fill-brand-sun text-brand-sun" : "text-brand-line"}`} aria-hidden="true" />
      ))}
    </span>
  )
}

/**
 * Reviews of a product: the average with the number of reviews, then every
 * review as it was written, ten at a time. All reviews are shown and counted,
 * whatever their rating: the average here is the one search engines are told.
 */
export function ProductReviews({ reviews, averageRating, productName }: { reviews: Review[]; averageRating: number; productName: string }) {
  const [visible, setVisible] = useState(PAGE)
  const rest = reviews.length - visible

  return (
    <div className="max-w-[42rem]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-3xl font-semibold tabular-nums text-brand-ink">{averageRating.toFixed(1)}</span>
        <div>
          <Stars rating={averageRating} />
          <p className="mt-1 text-sm text-brand-muted">
            {reviews.length} {plural(reviews.length, REVIEW_FORMS)}
          </p>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-brand-line border-t border-brand-line">
        {reviews.slice(0, visible).map((review, index) => (
          <li key={index} className="py-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="min-w-0 break-words text-base font-medium text-brand-ink">{review.user}</p>
              {review.time && <p className="text-sm text-brand-muted">{review.time}</p>}
            </div>
            <div className="mt-2">
              <Stars rating={review.rating} />
            </div>
            {review.text && <p className="mt-3 whitespace-pre-line break-words text-base leading-6 text-brand-ink">{review.text}</p>}

            {review.attachmentsUrls?.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {review.attachmentsUrls.map((url, imageIndex) => (
                  <li key={imageIndex} className="relative h-16 w-16 overflow-hidden rounded-sm border border-brand-line bg-brand-mist sm:h-24 sm:w-24">
                    <Image src={url} alt={`Фото від ${review.user} до відгуку про ${productName}`} fill className="object-cover" sizes="(max-width: 640px) 64px, 96px" loading="lazy" />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      {rest > 0 && (
        <button type="button" onClick={() => setVisible((count) => count + PAGE)} className="btn-secondary mt-2 h-11 w-full gap-2 sm:w-auto">
          Показати ще {Math.min(rest, PAGE)}
          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
