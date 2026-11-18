"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  ClipboardList,
  Code2,
  CreditCard,
  ExternalLink,
  FileText,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelTop,
  Plus,
  Settings,
  SlidersHorizontal,
  Tag,
  TicketPercent,
  Truck,
  Upload,
  Users,
  X,
  type LucideIcon,
} from "lucide-react"
import { Store } from "@/constants/store"
import { cn } from "@/lib/utils"
import TipLayer from "./TipLayer"
import { adminButton } from "./ui"

/** `tip`: what the section holds, shown when the pointer rests on its name. */
type NavItem = { label: string; href: string; icon: LucideIcon; tip: string; badgeKey?: "orders" | "settings" }
type NavGroup = { title: string | null; items: NavItem[] }

const NAVIGATION: NavGroup[] = [
  { title: null, items: [{ label: "Огляд", href: "/admin/dashboard", icon: LayoutDashboard, tip: "Продажі, замовлення і товари за вибраний період" }] },
  {
    title: "Продажі",
    items: [
      { label: "Замовлення", href: "/admin/Orders", icon: ClipboardList, tip: "Усі замовлення: оплата, відправлення, статус", badgeKey: "orders" },
      { label: "Платежі", href: "/admin/payments", icon: CreditCard, tip: "Оплати замовлень і їхній стан" },
      { label: "Доставка", href: "/admin/delivery", icon: Truck, tip: "Нова пошта: ключ, дані відправника" },
      { label: "Клієнти", href: "/admin/clients", icon: Users, tip: "Покупці та їхні замовлення" },
      { label: "Промокоди", href: "/admin/promocodes", icon: TicketPercent, tip: "Знижки за кодом: створити, вимкнути, побачити, хто скористався" },
    ],
  },
  {
    title: "Каталог",
    items: [
      { label: "Товари", href: "/admin/products", icon: Package, tip: "Список товарів: ціни, залишки, наявність" },
      { label: "Категорії", href: "/admin/categories", icon: FolderTree, tip: "Дерево категорій і товари в них" },
      { label: "Бренди", href: "/admin/brands", icon: Tag, tip: "Список брендів: додати, перейменувати, об’єднати написання" },
      { label: "Фільтри", href: "/admin/filter", icon: SlidersHorizontal, tip: "Які характеристики покупець бачить у фільтрах каталогу" },
      { label: "Імпорт товарів", href: "/admin/fetchUrl", icon: Upload, tip: "Додати або оновити товари з файлу постачальника" },
    ],
  },
  {
    title: "Магазин",
    items: [
      { label: "Меню", href: "/admin/menu", icon: PanelTop, tip: "Рядок відділів у магазині: назви, категорії всередині, «Новинки» і «Знижки»" },
      { label: "Сторінки", href: "/admin/pages", icon: FileText, tip: "Тексти головної, доставки, контактів і документів" },
      { label: "Пікселі реклами", href: "/admin/pixel", icon: Code2, tip: "Лічильники рекламних кабінетів на сайті" },
      { label: "Налаштування", href: "/admin/settings", icon: Settings, tip: "Контакти магазину і змінні для текстів сайту", badgeKey: "settings" },
    ],
  },
]

/** Section title shown in the top bar, by the first path segment after /admin. */
const SECTION_TITLES: Record<string, string> = {
  dashboard: "Огляд",
  orders: "Замовлення",
  payments: "Платежі",
  delivery: "Доставка",
  clients: "Клієнти",
  promocodes: "Промокоди",
  products: "Товари",
  createproduct: "Товар",
  categories: "Категорії",
  brands: "Бренди",
  menu: "Меню",
  filter: "Фільтри",
  fetchurl: "Імпорт товарів",
  parse: "Імпорт товарів",
  pages: "Сторінки",
  pixel: "Пікселі реклами",
  settings: "Налаштування",
}

export type AdminShellProps = {
  user: { name: string; email: string; role: string }
  /** Orders waiting for the team: paid or pending, not yet shipped. */
  openOrders: number
  /** Something in "Налаштування" must be filled in (the phone or the e-mail of the shop). */
  settingsAttention?: boolean
  children: React.ReactNode
}

function isActive(pathname: string, href: string): boolean {
  const current = pathname.toLowerCase()
  const target = href.toLowerCase()
  if (current === target || current.startsWith(`${target}/`)) return true
  // Creating and editing a product belong to "Товари".
  return target === "/admin/products" && current.startsWith("/admin/createproduct")
}

type Go = (href: string, event: React.MouseEvent<HTMLAnchorElement>) => void

function Navigation({ pathname, openOrders, settingsAttention, go }: { pathname: string; openOrders: number; settingsAttention: boolean; go: Go }) {
  return (
    <nav aria-label="Розділи панелі" className="flex-1 overflow-y-auto px-2 py-3">
      {NAVIGATION.map((group, index) => (
        <div key={group.title ?? index} className={index > 0 ? "mt-4" : undefined}>
          {group.title && <p className="px-2 pb-1 text-xs font-medium text-neutral-500">{group.title}</p>}
          <ul>
            {group.items.map((item) => {
              const active = isActive(pathname, item.href)
              const badge = item.badgeKey === "orders" ? openOrders : 0
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={(event) => go(item.href, event)}
                    aria-current={active ? "page" : undefined}
                    data-tip={item.tip}
                    data-tip-side="right"
                    className={cn(
                      "flex h-control items-center gap-2 rounded-md px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                      active ? "bg-white text-black" : "text-neutral-300 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1">{item.label}</span>
                    {item.badgeKey === "settings" && settingsAttention && (
                      <span data-tip="Не заповнено телефон або пошту магазину" className="inline-flex h-5 items-center rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white">
                        заповнити
                      </span>
                    )}
                    {badge > 0 && (
                      <span
                        data-tip="Замовлення, які ще не відправлено"
                        className={cn(
                          "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums",
                          active ? "bg-black text-white" : "bg-white text-black",
                        )}
                      >
                        {badge > 99 ? "99+" : badge}
                        <span className="sr-only"> відкритих</span>
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function SidebarBody({ pathname, user, openOrders, settingsAttention = false, go }: Omit<AdminShellProps, "children"> & { pathname: string; go: Go }) {
  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 px-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white font-display text-sm font-semibold text-black">
          {Store.name.slice(0, 1)}
        </span>
        <div>
          <p className="font-display text-sm font-semibold tracking-[-0.02em] text-white">{Store.name}</p>
          <p className="text-xs text-neutral-500">Панель керування</p>
        </div>
      </div>

      <Navigation pathname={pathname} openOrders={openOrders} settingsAttention={settingsAttention} go={go} />

      <div className="shrink-0 border-t border-white/10 p-2">
        <div className="flex items-center gap-2 py-1 pl-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-sm font-semibold text-white">
            {(user.name || user.email).slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user.name || user.email}</p>
            <p className="truncate text-xs text-neutral-500">{user.role === "Owner" ? "Власник" : "Адміністратор"}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            aria-label="Вийти з панелі"
            data-tip="Вийти з панелі"
            className="flex h-control w-control shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  )
}

/**
 * Frame of the admin panel: a black navigation rail, a white work area, and a
 * top bar with the two things the team does most (open the shop, add a product).
 */
export default function AdminShell({ user, openOrders, settingsAttention = false, children }: AdminShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  // The section being opened. The sidebar marks it at once and a bar runs under
  // the top bar, so a click is acknowledged even while the page is still loading.
  const [target, setTarget] = useState<string | null>(null)
  const [navigating, startNavigation] = useTransition()

  useEffect(() => {
    setMenuOpen(false)
    setTarget(null)
  }, [pathname])

  const go: Go = (href, event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    setMenuOpen(false)
    if (href === pathname) return router.refresh()
    setTarget(href)
    startNavigation(() => router.push(href))
  }

  const shownPath = navigating && target ? target : pathname

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [menuOpen])

  const section = SECTION_TITLES[shownPath.split("/")[2]?.toLowerCase() ?? ""] ?? "Панель керування"

  return (
    <div className="min-h-dvh bg-white text-neutral-900">
      <TipLayer />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col bg-black lg:flex">
        <SidebarBody pathname={shownPath} user={user} openOrders={openOrders} settingsAttention={settingsAttention} go={go} />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Розділи панелі">
          <button type="button" aria-label="Закрити меню" className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
          <div className="relative flex h-full w-[84vw] max-w-[300px] flex-col bg-black">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Закрити меню"
              className="absolute right-2 top-[calc((3.5rem-var(--control))/2)] z-10 flex h-control w-control items-center justify-center rounded-md text-neutral-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <SidebarBody pathname={shownPath} user={user} openOrders={openOrders} settingsAttention={settingsAttention} go={go} />
          </div>
        </div>
      )}

      <div className="lg:pl-56">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-neutral-200 bg-white px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Відкрити меню"
            className="-ml-2 flex h-control w-control items-center justify-center rounded-md hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <p className="font-display text-base font-semibold tracking-[-0.02em]">{section}</p>
          {navigating && (
            <span role="status" className="absolute inset-x-0 -bottom-px h-0.5 overflow-hidden bg-neutral-200">
              <span className="sr-only">Відкриваємо розділ…</span>
              <span className="block h-full w-1/3 animate-[admin-progress_1s_ease-in-out_infinite] bg-black" />
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              aria-label="Відкрити магазин у новій вкладці"
              data-tip="Сайт, яким його бачать покупці. Відкриється в новій вкладці"
              className={adminButton.secondary}
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Відкрити магазин</span>
            </a>
            <Link
              href="/admin/createProduct"
              aria-label="Додати товар"
              data-tip="Новий товар: назва, ціна, фото, розміри"
              className={adminButton.primary}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Додати товар</span>
            </Link>
          </div>
        </header>

        <main aria-busy={navigating} className={cn("transition-opacity duration-150", navigating && "opacity-50")}>
          {children}
        </main>
      </div>
    </div>
  )
}
