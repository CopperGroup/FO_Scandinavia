"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { signOut } from "next-auth/react"
import { ChevronDown } from "lucide-react"
import { useAppContext } from "@/app/(root)/context"
import type { DepartmentKey } from "@/lib/catalog/departments"
import { cn } from "@/lib/utils"
import Drawer from "./Drawer"
import { NEW_HREF, SALE_HREF, categoryHref, departmentHref, type HeaderData } from "./types"

/**
 * Mobile catalog menu. Departments are the first level, so browsing starts
 * with one tap; the department the shopper is in opens by default.
 */
export default function MobileMenu({ data, activeDepartment }: { data: HeaderData; activeDepartment: DepartmentKey | null }) {
  const { menuOpen, setMenuOpen } = useAppContext()
  const pathname = usePathname()
  const params = useSearchParams()
  const [expanded, setExpanded] = useState<DepartmentKey | null>(activeDepartment)

  const location = `${pathname}?${params.toString()}`
  useEffect(() => {
    setMenuOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  useEffect(() => {
    if (menuOpen) setExpanded(activeDepartment)
  }, [menuOpen, activeDepartment])

  const { user } = data
  const rowClass =
    "flex min-h-12 items-center justify-between px-4 text-base text-brand-ink active:bg-brand-mist focus-visible:outline-none focus-visible:bg-brand-mist"

  return (
    <Drawer open={Boolean(menuOpen)} onOpenChange={setMenuOpen} side="left" title="Каталог" description="Відділи та категорії магазину">
      <nav aria-label="Каталог">
        <ul>
          {data.departments.map((department) => {
            const isExpanded = expanded === department.key
            return (
              <li key={department.key} className="border-b border-brand-line">
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => setExpanded(isExpanded ? null : department.key)}
                  className={cn(rowClass, "w-full font-semibold", activeDepartment === department.key && "text-brand")}
                >
                  <span>{department.label}</span>
                  <span className="flex items-center gap-2 text-sm font-normal text-brand-muted">
                    <span className="tabular-nums">{department.count}</span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} aria-hidden="true" />
                  </span>
                </button>

                {isExpanded && (
                  <div className="bg-brand-mist pb-3">
                    <Link href={departmentHref(department.key)} className={cn(rowClass, "font-semibold text-brand")}>
                      Усі товари відділу
                    </Link>
                    {department.groups.map((group) => (
                      <div key={group.label}>
                        <p className="px-4 pb-1 pt-3 text-xs font-medium text-brand-muted">{group.label}</p>
                        <ul>
                          {group.categories.map((category) => (
                            <li key={category.id}>
                              <Link href={categoryHref(category.id, department.key)} className={cn(rowClass, "min-h-11")}>
                                <span>{category.name}</span>
                                <span className="text-sm tabular-nums text-brand-muted">{category.count}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        <ul className="border-b border-brand-line py-2">
          {data.showNew && (
            <li>
              <Link href={NEW_HREF} className={rowClass}>
                Новинки
              </Link>
            </li>
          )}
          {data.showSale && data.saleCount > 0 && (
            <li>
              <Link href={SALE_HREF} className={rowClass}>
                <span className="font-semibold text-brand-sale">Знижки</span>
                <span className="text-sm tabular-nums text-brand-muted">{data.saleCount}</span>
              </Link>
            </li>
          )}
          <li>
            <Link href="/catalog" className={rowClass}>
              Увесь каталог
            </Link>
          </li>
          {data.other.map((category) => (
            <li key={category.id}>
              <Link href={categoryHref(category.id)} className={rowClass}>
                <span>{category.name}</span>
                <span className="text-sm tabular-nums text-brand-muted">{category.count}</span>
              </Link>
            </li>
          ))}
        </ul>

        <ul className="py-2">
          {user ? (
            <>
              <li>
                <Link href={`/myOrders/user/${user.id}`} className={rowClass}>
                  Мої замовлення
                </Link>
              </li>
              <li>
                <Link href={`/liked/${user.id}`} className={rowClass}>
                  Обране
                </Link>
              </li>
              <li>
                <Link href="/promocodes" className={rowClass}>
                  Мої промокоди
                </Link>
              </li>
              {user.isAdmin && (
                <li>
                  <Link href="/admin/dashboard" className={rowClass}>
                    Панель керування
                  </Link>
                </li>
              )}
            </>
          ) : (
            <li>
              <Link href="/login" className={cn(rowClass, "font-semibold")}>
                Увійти або зареєструватися
              </Link>
            </li>
          )}
          <li>
            <Link href="/info/delivery-payment" className={rowClass}>
              Доставка та оплата
            </Link>
          </li>
          <li>
            <Link href="/info/contacts" className={rowClass}>
              Контакти
            </Link>
          </li>
          <li>
            <a href={`tel:${data.phone}`} className={cn(rowClass, "tabular-nums")}>
              {data.phone}
            </a>
          </li>
          {user && (
            <li>
              <button type="button" onClick={() => signOut()} className={cn(rowClass, "w-full text-brand-muted")}>
                Вийти
              </button>
            </li>
          )}
        </ul>
      </nav>
    </Drawer>
  )
}
