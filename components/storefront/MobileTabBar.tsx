"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Heart, Home, LayoutGrid, Search, ShoppingBag } from "lucide-react"
import { useAppContext } from "@/app/(root)/context"
import { useCart } from "@/lib/storefront/use-cart"
import { cn } from "@/lib/utils"

const itemClass =
  "relative flex h-full flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-brand-muted focus-visible:outline-none focus-visible:text-brand"

/**
 * Bottom navigation on phones: the five things a shopper reaches for, in the
 * thumb zone. Hidden on the product and checkout pages, where the bottom of
 * the screen belongs to the buy button.
 */
export default function MobileTabBar({ likedHref }: { likedHref: string }) {
  const pathname = usePathname()
  const { setMenuOpen, menuOpen } = useAppContext()
  const cart = useCart()

  if (/^\/catalog\/[^/]+/.test(pathname) || pathname.startsWith("/order")) return null

  const isHome = pathname === "/"
  const isCatalog = pathname === "/catalog" || Boolean(menuOpen)
  const isLiked = pathname.startsWith("/liked")

  return (
    <nav
      aria-label="Швидка навігація"
      data-bottom-bar="tabs"
      className="fixed inset-x-0 bottom-0 z-40 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {/* 56px with the top border inside: an icon of 24, 4 between, a 16px line of words. */}
      <div className="box-border flex h-14 items-stretch border-t border-brand-line">
        <Link href="/" aria-current={isHome ? "page" : undefined} className={cn(itemClass, isHome && "text-brand")}>
          <Home className="h-6 w-6" aria-hidden="true" />
          Головна
        </Link>
        <button type="button" onClick={() => setMenuOpen(true)} className={cn(itemClass, isCatalog && "text-brand")}>
          <LayoutGrid className="h-6 w-6" aria-hidden="true" />
          Каталог
        </button>
        <button type="button" onClick={() => window.dispatchEvent(new Event("storefront:focus-search"))} className={itemClass}>
          <Search className="h-6 w-6" aria-hidden="true" />
          Пошук
        </button>
        <Link href={likedHref} aria-current={isLiked ? "page" : undefined} className={cn(itemClass, isLiked && "text-brand")}>
          <Heart className="h-6 w-6" aria-hidden="true" />
          Обране
        </Link>
        <button type="button" onClick={cart.open} className={itemClass}>
          <span className="relative">
            <ShoppingBag className="h-6 w-6" aria-hidden="true" />
            {cart.ready && cart.units > 0 && (
              <span className="absolute -right-3 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-sun px-1 text-xs font-bold text-brand-ink">
                {cart.units > 99 ? "99+" : cart.units}
              </span>
            )}
          </span>
          Кошик
        </button>
      </div>
    </nav>
  )
}
