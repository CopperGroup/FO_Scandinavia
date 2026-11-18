"use client"

import { useEffect, useState } from "react"
import { Heart } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { trackFacebookEvent } from "@/helpers/pixel"
import { addLike } from "@/lib/actions/product.actions"
import { cn } from "@/lib/utils"

interface Props {
  /** JSON array of `{ email }` objects; kept for pages that still pass the full list. */
  likedBy?: string
  /** Preferred: whether the signed-in shopper already liked the product. */
  initiallyLiked?: boolean
  productId: string
  productName: string
  value: number
  email: string
  /** Position of the 44px button. */
  className?: string
  /** Look of the 36px circle inside it. */
  circleClassName?: string
}

function likedByIncludes(likedBy: string | undefined, email: string): boolean {
  if (!likedBy || !email) return false
  try {
    const likes = JSON.parse(likedBy)
    return Array.isArray(likes) && likes.some((user: { email?: string }) => user?.email === email)
  } catch {
    return false
  }
}

const LikeButton = ({ likedBy, initiallyLiked, productId, productName, value, email, className, circleClassName }: Props) => {
  const [isLiked, setIsLiked] = useState(initiallyLiked ?? likedByIncludes(likedBy, email))
  const [isSaving, setIsSaving] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    setIsLiked(initiallyLiked ?? likedByIncludes(likedBy, email))
  }, [initiallyLiked, likedBy, productId, email])

  const toggleLike = async (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (!email) {
      // Likes are kept per account, so a guest is taken to sign in.
      router.push("/login")
      return
    }
    if (isSaving) return

    const next = !isLiked
    setIsLiked(next)
    setIsSaving(true)

    if (next) {
      trackFacebookEvent("AddToWishlist", {
        content_name: productName,
        content_ids: [productId],
        content_type: "product",
        value,
        currency: "UAH",
      })
    }

    try {
      await addLike({ productId, email, path: pathname })
    } catch (error) {
      // Put the heart back if the server did not accept the change.
      setIsLiked(!next)
      console.error("Could not update the like:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const label = !email ? "Увійти, щоб зберегти в обране" : isLiked ? "Прибрати з обраного" : "Додати в обране"

  return (
    <button
      type="button"
      onClick={toggleLike}
      aria-pressed={isLiked}
      aria-label={label}
      title={label}
      className={cn("group/like flex h-11 w-11 items-center justify-center rounded-full text-brand-ink hover:text-brand focus-visible:outline-none", className)}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-[0_1px_3px_rgba(16,34,46,0.18)] transition-colors group-focus-visible/like:ring-2 group-focus-visible/like:ring-brand",
          circleClassName,
        )}
      >
        <Heart className={cn("h-5 w-5", isLiked && "fill-brand-sale stroke-brand-sale")} aria-hidden="true" />
      </span>
    </button>
  )
}

export default LikeButton
