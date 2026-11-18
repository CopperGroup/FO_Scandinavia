"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { signOut } from "next-auth/react"
import { ChevronDown, Heart, LogOut, Menu, Package, Settings, ShoppingBag, TicketPercent, User } from "lucide-react"
import { useAppContext } from "@/app/(root)/context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { DepartmentKey } from "@/lib/catalog/departments"
import { useCart } from "@/lib/storefront/use-cart"
import { cn } from "@/lib/utils"
import Logo from "./Logo"
import MobileMenu from "./MobileMenu"
import SearchBox from "./SearchBox"
import { NEW_HREF, SALE_HREF, categoryHref, departmentHref, type HeaderData, type HeaderDepartment } from "./types"

const OPEN_DELAY_MS = 160
const CLOSE_DELAY_MS = 220
const MAX_CATEGORIES_PER_GROUP = 9

function useActiveDepartment(data: HeaderData): DepartmentKey | null {
  const pathname = usePathname()
  const params = useSearchParams()
  if (pathname !== "/catalog") return null
  const explicit = params.get("department")
  if (explicit && data.departments.some((department) => department.key === explicit)) return explicit as DepartmentKey
  const categories = (params.get("categories") ?? "").split(",").filter(Boolean)
  return categories.length > 0 ? data.primaryDepartment[categories[0]] ?? null : null
}

function IconLink({
  href,
  label,
  children,
  badge,
}: {
  href: string
  label: string
  children: React.ReactNode
  badge?: number
}) {
  return (
    <Link
      href={href}
      className="relative flex h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-md px-2 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sun"
    >
      {children}
      <span className="hidden text-xs lg:block">{label}</span>
      <span className="sr-only lg:hidden">{label}</span>
      {badge ? <Badge count={badge} /> : null}
    </Link>
  )
}

function Badge({ count }: { count: number }) {
  return (
    <span className="absolute right-1 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-sun px-1 text-xs font-bold text-brand-ink">
      {count > 99 ? "99+" : count}
    </span>
  )
}

function AccountMenu({ user }: { user: NonNullable<HeaderData["user"]> }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-md px-2 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sun">
        <User className="h-6 w-6" aria-hidden="true" />
        <span className="hidden max-w-[84px] truncate text-xs lg:block">{user.name || "Кабінет"}</span>
        <span className="sr-only lg:hidden">Мій кабінет</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-md border-brand-line bg-white p-2 text-brand-ink">
        <DropdownMenuItem asChild className="cursor-pointer gap-3 rounded-sm px-3 py-3 text-sm focus:bg-brand-mist">
          <Link href={`/myOrders/user/${user.id}`}>
            <Package className="h-4 w-4 text-brand-muted" aria-hidden="true" />
            Мої замовлення
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer gap-3 rounded-sm px-3 py-3 text-sm focus:bg-brand-mist">
          <Link href={`/liked/${user.id}`}>
            <Heart className="h-4 w-4 text-brand-muted" aria-hidden="true" />
            Обране
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer gap-3 rounded-sm px-3 py-3 text-sm focus:bg-brand-mist">
          <Link href="/promocodes">
            <TicketPercent className="h-4 w-4 text-brand-muted" aria-hidden="true" />
            Мої промокоди
          </Link>
        </DropdownMenuItem>
        {user.isAdmin && (
          <DropdownMenuItem asChild className="cursor-pointer gap-3 rounded-sm px-3 py-3 text-sm focus:bg-brand-mist">
            <Link href="/admin/dashboard">
              <Settings className="h-4 w-4 text-brand-muted" aria-hidden="true" />
              Панель керування
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-brand-line" />
        <DropdownMenuItem
          onSelect={() => signOut()}
          className="cursor-pointer gap-3 rounded-sm px-3 py-3 text-sm focus:bg-brand-mist"
        >
          <LogOut className="h-4 w-4 text-brand-muted" aria-hidden="true" />
          Вийти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MegaPanel({ department, onNavigate }: { department: HeaderDepartment; onNavigate: () => void }) {
  return (
    <div className="shell grid grid-cols-[220px_1fr] gap-10 py-8">
      <div>
        <p className="font-display text-2xl font-semibold tracking-[-0.02em] text-brand-ink">{department.label}</p>
        <Link
          href={departmentHref(department.key)}
          onClick={onNavigate}
          className="mt-4 inline-flex h-11 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          Усі товари: {department.count}
        </Link>
        <Link
          href={`${departmentHref(department.key)}&sale=1&sort=discount`}
          onClick={onNavigate}
          className="mt-3 block w-fit text-sm text-brand-ink link-quiet"
        >
          Знижки у відділі
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-x-8 gap-y-8">
        {department.groups.map((group) => {
          const visible = group.categories.slice(0, MAX_CATEGORIES_PER_GROUP)
          const hidden = group.categories.length - visible.length
          const groupHref = `${departmentHref(department.key)}&categories=${group.categories.map((category) => category.id).join(",")}`
          return (
            <div key={group.label}>
              <Link
                href={groupHref}
                onClick={onNavigate}
                className="text-sm font-semibold text-brand-ink hover:text-brand focus-visible:outline-none focus-visible:underline"
              >
                {group.label}
              </Link>
              <ul className="mt-3 space-y-2">
                {visible.map((category) => (
                  <li key={category.id}>
                    <Link
                      href={categoryHref(category.id, department.key)}
                      onClick={onNavigate}
                      className="group/item flex items-baseline justify-between gap-3 text-sm text-brand-muted hover:text-brand focus-visible:outline-none focus-visible:underline"
                    >
                      <span>{category.name}</span>
                      <span className="text-xs tabular-nums text-brand-muted/70">{category.count}</span>
                    </Link>
                  </li>
                ))}
                {hidden > 0 && (
                  <li>
                    <Link href={groupHref} onClick={onNavigate} className="text-sm font-medium text-brand hover:underline">
                      Ще {hidden}
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function HeaderClient({ data }: { data: HeaderData }) {
  const pathname = usePathname()
  const params = useSearchParams()
  const { setMenuOpen } = useAppContext()
  const cart = useCart()
  const activeDepartment = useActiveDepartment(data)

  const [openKey, setOpenKey] = useState<DepartmentKey | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const schedule = (key: DepartmentKey | null, delay: number) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpenKey(key), delay)
  }
  const closeNow = () => {
    clearTimeout(timer.current)
    setOpenKey(null)
  }

  // A navigation always closes the menu.
  const location = `${pathname}?${params.toString()}`
  useEffect(() => {
    closeNow()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  useEffect(() => () => clearTimeout(timer.current), [])

  /*
   * Scrolling down tucks the search bar above the window and leaves the
   * department row; scrolling up brings it back. Only a transform changes, so
   * the page below never moves. The state lives on <html> as data-header, and
   * --sticky-top follows it: everything pinned under the header (catalog
   * filters, toolbar, the product buy panel) slides by the same distance.
   */
  useEffect(() => {
    const root = document.documentElement
    const ALWAYS_OPEN_ABOVE = 160
    const TRAVEL = 28
    let lastY = window.scrollY
    let turnedAt = lastY
    let direction: "up" | "down" | null = null
    let frame = 0

    const setCompact = (compact: boolean) => {
      if (compact) root.dataset.header = "compact"
      else delete root.dataset.header
    }

    const update = () => {
      frame = 0
      const y = window.scrollY
      if (y < ALWAYS_OPEN_ABOVE) {
        setCompact(false)
        direction = null
      } else if (y !== lastY) {
        const next = y > lastY ? "down" : "up"
        if (next !== direction) {
          direction = next
          turnedAt = lastY
        }
        // A small wobble of the wheel or the finger must not flip the header.
        if (Math.abs(y - turnedAt) > TRAVEL) setCompact(next === "down")
      }
      lastY = y
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(frame)
      delete root.dataset.header
    }
  }, [])

  // Keyboard focus that lands in the hidden bar brings it back.
  const revealHeader = () => {
    delete document.documentElement.dataset.header
  }

  const openDepartment = data.departments.find((department) => department.key === openKey)
  const isSale = pathname === "/catalog" && params.get("sale") === "1"
  const { user } = data

  return (
    <header className="site-header z-40 w-full">
      <div className="bg-brand-navy text-white" onFocusCapture={revealHeader}>
        <div className="shell flex h-[var(--bar-h)] items-center gap-2 lg:gap-8">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Відкрити каталог"
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-md hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sun lg:hidden"
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          <Logo />

          <SearchBox className="hidden max-w-2xl flex-1 lg:block" inputId="site-search" />

          <div className="ml-auto flex items-center gap-1 lg:gap-2">
            {user ? (
              <AccountMenu user={user} />
            ) : (
              <IconLink href="/login" label="Увійти">
                <User className="h-6 w-6" aria-hidden="true" />
              </IconLink>
            )}
            {user && (
              <span className="hidden lg:block">
                <IconLink href={`/liked/${user.id}`} label="Обране">
                  <Heart className="h-6 w-6" aria-hidden="true" />
                </IconLink>
              </span>
            )}
            <button
              type="button"
              onClick={cart.open}
              className="relative flex h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-md px-2 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-sun"
            >
              <ShoppingBag className="h-6 w-6" aria-hidden="true" />
              <span className="hidden text-xs lg:block">Кошик</span>
              <span className="sr-only">
                {cart.units > 0 ? `Кошик, товарів: ${cart.units}` : "Кошик порожній"}
              </span>
              {cart.ready && cart.units > 0 ? <Badge count={cart.units} /> : null}
            </button>
          </div>
        </div>

        <div className="shell pb-3 lg:hidden">
          <SearchBox inputId="site-search-mobile" />
        </div>
      </div>

      {/* The yellow rule under the blue bar: the horizontal arm of the cross. */}
      <div className="h-[var(--rule-h)] bg-brand-sun" aria-hidden="true" />

      {/* The row is exactly --nav-h tall, border included. */}
      <div className="relative hidden h-[var(--nav-h)] border-b border-brand-line bg-white lg:block" onMouseLeave={() => schedule(null, CLOSE_DELAY_MS)}>
        <nav aria-label="Відділи" className="shell flex h-full items-stretch gap-4">
          {/*
            The departments are the owner's list (admin, "Меню") and can be longer than the row:
            then this part scrolls sideways by itself and the page keeps its width.
            The panel of a department hangs from the row, not from here, so nothing clips it.
          */}
          <div className="-ml-3 flex min-w-0 items-stretch gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {data.departments.map((department) => {
            const isOpen = openKey === department.key
            const isCurrent = activeDepartment === department.key
            return (
              <Link
                key={department.key}
                href={departmentHref(department.key)}
                aria-current={isCurrent ? "page" : undefined}
                aria-expanded={isOpen}
                aria-haspopup="true"
                onMouseEnter={() => schedule(department.key, openKey ? 0 : OPEN_DELAY_MS)}
                onFocus={() => schedule(department.key, 0)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") closeNow()
                }}
                className={cn(
                  "relative flex shrink-0 items-center gap-1 whitespace-nowrap px-3 text-base font-medium text-brand-ink transition-colors hover:text-brand focus-visible:text-brand focus-visible:outline-none",
                  "after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:bg-transparent after:transition-colors",
                  (isOpen || isCurrent) && "text-brand after:bg-brand",
                )}
              >
                {department.label}
                <ChevronDown className={cn("h-4 w-4 text-brand-muted transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
              </Link>
            )
          })}

          {(data.showNew || (data.showSale && data.saleCount > 0)) && <span className="mx-2 my-4 w-px shrink-0 bg-brand-line" aria-hidden="true" />}

          {data.showNew && (
            <Link
              href={NEW_HREF}
              onMouseEnter={() => schedule(null, CLOSE_DELAY_MS)}
              className="flex shrink-0 items-center whitespace-nowrap px-2 text-base font-medium text-brand-ink hover:text-brand focus-visible:outline-none focus-visible:text-brand"
            >
              Новинки
            </Link>
          )}
          {data.showSale && data.saleCount > 0 && (
            <Link
              href={SALE_HREF}
              aria-current={isSale ? "page" : undefined}
              onMouseEnter={() => schedule(null, CLOSE_DELAY_MS)}
              className="flex shrink-0 items-center whitespace-nowrap px-2 focus-visible:outline-none"
            >
              <span className="text-base font-semibold text-brand-sale underline-offset-4 hover:underline">
                Знижки
              </span>
            </Link>
          )}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-6 text-sm text-brand-muted">
            {/* From 1280px: on a narrower desktop the row belongs to the departments (the link is in the footer too). */}
            <Link href="/info/delivery-payment" className="hidden whitespace-nowrap hover:text-brand focus-visible:outline-none focus-visible:underline xl:block">
              Доставка та оплата
            </Link>
            <a href={`tel:${data.phone}`} className="whitespace-nowrap font-medium tabular-nums text-brand-ink hover:text-brand focus-visible:outline-none focus-visible:underline">
              {data.phone}
            </a>
          </div>
        </nav>

        {openDepartment && (
          <div
            className="absolute inset-x-0 top-full z-40 border-b border-brand-line bg-white shadow-[0_24px_40px_-24px_rgba(16,34,46,0.35)] animate-sheet-up"
            onMouseEnter={() => clearTimeout(timer.current)}
            onKeyDown={(event) => {
              if (event.key === "Escape") closeNow()
            }}
          >
            <MegaPanel department={openDepartment} onNavigate={closeNow} />
          </div>
        )}
      </div>

      <MobileMenu data={data} activeDepartment={activeDepartment} />
    </header>
  )
}
