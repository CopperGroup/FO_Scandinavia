import type { Metadata } from "next"
import Link from "next/link"
import { AdminPage, EmptyState, Pagination, Panel, Tabs, adminButton } from "@/components/admin/ui"
import ProductsTable from "@/components/admin-components/ProductsTable"
import ProductListControls from "@/components/admin-components/products/ProductListControls"
import { loadCategoryOptionsWithPath } from "@/lib/admin/categories"
import { PRODUCT_PAGE_SIZES, PRODUCT_SORTS, PRODUCT_TABS, listProducts, parsePageSize, parseProductListFilter, type ProductSortKey } from "@/lib/admin/products"
import { productsWord } from "@/lib/admin/catalog-shared"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Товари" }
export const dynamic = "force-dynamic"

type SearchParams = Record<string, string | string[] | undefined>

const number = new Intl.NumberFormat("uk-UA")

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? ""
}

/** Compact figure for the one-row summary above the list. */
function Figure({ label, value, href, problem }: { label: string; value: number; href?: string; problem?: boolean }) {
  const body = (
    <>
      <span className="text-sm text-neutral-500">{label}</span>
      <span className={cn("text-base font-semibold tabular-nums", problem && value > 0 ? "text-red-700" : "text-neutral-900")}>{number.format(value)}</span>
    </>
  )
  const className = "flex h-12 items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-4"
  return href ? (
    <Link href={href} data-size-free="" className={cn(className, "hover:border-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const filter = parseProductListFilter(searchParams)
  const sortParam = first(searchParams.sort)
  const sort = (PRODUCT_SORTS.some((entry) => entry.key === sortParam) ? sortParam : "updated") as ProductSortKey
  const pageSize = parsePageSize(searchParams.size)
  const requestedPage = Number.parseInt(first(searchParams.page) || "1") || 1

  const [list, categoryOptions] = await Promise.all([listProducts({ filter, sort, page: requestedPage, pageSize }), loadCategoryOptionsWithPath()])

  const state = { tab: filter.tab, q: filter.query, category: filter.category, sort, size: pageSize, page: list.page }
  const hrefFor = (changes: Partial<typeof state>) => {
    const next = { ...state, ...changes }
    const params = new URLSearchParams()
    if (next.tab && next.tab !== "all") params.set("tab", next.tab)
    if (next.q) params.set("q", next.q)
    if (next.category) params.set("category", next.category)
    if (next.sort && next.sort !== "updated") params.set("sort", next.sort)
    if (next.size !== 50) params.set("size", String(next.size))
    if (next.page && next.page > 1) params.set("page", String(next.page))
    const query = params.toString()
    return query ? `/admin/products?${query}` : "/admin/products"
  }
  const keep = {
    tab: filter.tab !== "all" ? filter.tab : undefined,
    q: filter.query || undefined,
    category: filter.category || undefined,
    sort: sort !== "updated" ? sort : undefined,
    size: pageSize !== 50 ? String(pageSize) : undefined,
  }

  const categoryName = categoryOptions.find((category) => category.id === filter.category)?.name
  const narrowed = Boolean(filter.query || filter.category)
  const from = list.total ? (list.page - 1) * pageSize + 1 : 0
  const to = Math.min(list.total, list.page * pageSize)

  return (
    <AdminPage title="Товари" description={`${number.format(list.stats.total)} ${productsWord(list.stats.total)} у каталозі`}>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Figure label="Усього" value={list.stats.total} />
        <Figure label="В наявності" value={list.stats.available} href={hrefFor({ tab: "available", page: 1 })} />
        <Figure label="Зі знижкою" value={list.stats.discounted} />
        <Figure label="Без категорії" value={list.stats.uncategorized} href={hrefFor({ tab: "uncategorized", page: 1 })} problem />
      </div>

      <Panel padded={false}>
        <div className="space-y-3 px-4 pt-4 sm:px-4">
          <ProductListControls
            query={filter.query}
            category={filter.category}
            sort={sort}
            tab={filter.tab}
            size={pageSize}
            categories={categoryOptions}
            sorts={PRODUCT_SORTS.map((entry) => ({ key: entry.key, label: entry.label }))}
          />
          <Tabs
            label="Наявність товарів"
            // «Закінчилися» appears only while there is something in it (or while it is open).
            items={PRODUCT_TABS.filter((entry) => entry.key !== "soldout" || list.counts.soldout > 0 || filter.tab === "soldout").map((entry) => ({
              key: entry.key,
              label: entry.label,
              href: hrefFor({ tab: entry.key, page: 1 }),
              count: list.counts[entry.key],
              active: entry.key === filter.tab,
              ...(entry.key === "soldout" && {
                tone: "problem" as const,
                tip: "Товари, які продаються, але на складі 0 шт.: останній купили або в кількості стоїть нуль. Купити їх не можна, доки ви не додасте кількість.",
              }),
            }))}
          />
        </div>

        {list.rows.length === 0 ? (
          <div className="p-4 sm:p-4">
            <EmptyState
              title={narrowed || filter.tab !== "all" ? "Нічого не знайдено" : "Товарів ще немає"}
              text={
                filter.tab === "uncategorized" && !narrowed
                  ? "Усі товари мають принаймні одну категорію."
                  : filter.tab === "soldout" && !narrowed
                    ? "Немає товарів, які закінчилися: усе, що продається, є на складі."
                    : narrowed
                    ? `Немає товарів${filter.query ? ` за запитом «${filter.query}»` : ""}${categoryName ? ` у категорії «${categoryName}»` : ""}. Перевірте написання або скиньте фільтри.`
                    : "Додайте перший товар або завантажте файл із товарами від постачальника в «Імпорт товарів»."
              }
              action={
                narrowed || filter.tab !== "all" ? (
                  <Link href="/admin/products" className={adminButton.secondary}>
                    Показати всі товари
                  </Link>
                ) : (
                  <Link href="/admin/createProduct" className={adminButton.primary}>
                    Додати товар
                  </Link>
                )
              }
            />
          </div>
        ) : (
          <ProductsTable
            rows={list.rows}
            total={list.total}
            position={`${number.format(from)}–${number.format(to)} з ${number.format(list.total)}`}
            filter={filter}
            categories={categoryOptions}
            key={`${filter.tab}|${filter.query}|${filter.category}|${sort}|${list.page}|${pageSize}`}
          />
        )}

        <div className="border-t border-neutral-200 px-4 py-3 sm:px-4">
          <Pagination
            page={list.page}
            pageCount={list.pageCount}
            total={list.total}
            pageSize={pageSize}
            hrefFor={(page) => hrefFor({ page })}
            jump={{ action: "/admin/products", hidden: keep }}
            sizes={{ options: [...PRODUCT_PAGE_SIZES], hrefFor: (size) => hrefFor({ size, page: 1 }) }}
          />
        </div>
      </Panel>
    </AdminPage>
  )
}
