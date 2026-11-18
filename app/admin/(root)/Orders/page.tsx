import type { Metadata } from "next"
import Link from "next/link"
import { AdminPage, EmptyState, Pagination, SearchForm, Tabs, adminButton } from "@/components/admin/ui"
import { ListPosition } from "@/components/admin-components/ListPosition"
import { OrdersTable } from "@/components/admin-components/orders/OrdersTable"
import { PAGE_SIZES, listHref, parseChoice, parsePage, parsePageSize, parseQuery } from "@/lib/admin/list"
import { ORDER_TABS, ORDER_TAB_KEYS, listOrders, thumbnailUrl } from "@/lib/admin/orders"
import { formatAdminDateTime } from "@/lib/admin/status"

export const metadata: Metadata = { title: "Замовлення" }
export const dynamic = "force-dynamic"

type SearchParams = { tab?: string; q?: string; page?: string; size?: string }

const BASE = "/admin/Orders"

const Page = async ({ searchParams }: { searchParams: SearchParams }) => {
  const tab = parseChoice(searchParams.tab, ORDER_TAB_KEYS, "all")
  const query = parseQuery(searchParams.q)
  const pageSize = parsePageSize(searchParams.size)
  const { rows, total, page, pageCount, counts } = await listOrders({ tab, query, page: parsePage(searchParams.page), pageSize })
  const current = { tab, q: query, size: String(pageSize), page: String(page) }
  const keep = { tab: tab === "all" ? undefined : tab, q: query || undefined, size: pageSize === 25 ? undefined : String(pageSize) }
  const href = (changes: Record<string, string | undefined>) => listHref(BASE, current, changes, { tab: "all", size: "25" })

  return (
    <AdminPage
      title="Замовлення"
      description={query ? `Знайдено за запитом «${query}»: ${counts.all}` : `Усього: ${counts.all}. Чекають на обробку: ${counts.new}`}
      actions={
        <SearchForm action={BASE} defaultValue={query} placeholder="Номер, ім’я, телефон або e-mail" label="Пошук замовлень" hidden={{ ...keep, q: undefined }} />
      }
    >
      <div className="space-y-4">
        <Tabs
          label="Стан замовлень"
          items={ORDER_TABS.map((entry) => ({
            key: entry.key,
            label: entry.label,
            count: counts[entry.key],
            href: href({ tab: entry.key, page: "1" }),
            active: entry.key === tab,
          }))}
        />

        {rows.length === 0 ? (
          <EmptyState
            title={query ? "Нічого не знайдено" : "Тут поки немає замовлень"}
            text={query ? "Перевірте номер або спробуйте інше написання імені чи телефону." : "Замовлення з цим станом з’являться в цьому списку."}
            action={
              query || tab !== "all" ? (
                <Link href={BASE} className={adminButton.secondary}>
                  Показати всі замовлення
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            <ListPosition page={page} pageSize={pageSize} total={total} pageCount={pageCount} />
            <OrdersTable
              rows={rows.map((order) => ({
                id: order.id,
                when: formatAdminDateTime(order.date),
                customer: order.customer,
                contact: [order.phone, order.city].filter(Boolean).join(", "),
                value: order.value,
                paymentStatus: order.paymentStatus,
                paymentType: order.paymentType,
                deliveryStatus: order.deliveryStatus,
                units: order.units,
                thumbs: order.images.map((src) => thumbnailUrl(src)),
              }))}
            />
            <Pagination
              page={page}
              pageCount={pageCount}
              total={total}
              pageSize={pageSize}
              hrefFor={(next) => href({ page: String(next) })}
              jump={{ action: BASE, hidden: keep }}
              sizes={{ options: [...PAGE_SIZES], hrefFor: (size) => href({ size: String(size), page: "1" }) }}
            />
          </>
        )}
      </div>
    </AdminPage>
  )
}

export default Page
