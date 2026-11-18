import type { Metadata } from "next"
import Link from "next/link"
import { AdminPage, EmptyState, Pagination, SearchForm, StatTile, Tabs, adminButton } from "@/components/admin/ui"
import { ListPosition } from "@/components/admin-components/ListPosition"
import { PaymentsTable } from "@/components/admin-components/orders/PaymentsTable"
import { PAGE_SIZES, listHref, parseChoice, parsePage, parsePageSize, parseQuery } from "@/lib/admin/list"
import { PAYMENT_SORTS, PAYMENT_TABS, PAYMENT_TAB_KEYS, listPayments, type PaymentSort } from "@/lib/admin/payments"
import { formatAdminDateTime } from "@/lib/admin/status"
import { money } from "@/lib/storefront/format"

export const metadata: Metadata = { title: "Платежі" }
export const dynamic = "force-dynamic"

type SearchParams = { tab?: string; q?: string; sort?: string; page?: string; size?: string }

const BASE = "/admin/payments"
const DEFAULTS = { tab: "all", sort: "new", size: "25" }

const Page = async ({ searchParams }: { searchParams: SearchParams }) => {
  const tab = parseChoice(searchParams.tab, PAYMENT_TAB_KEYS, "all")
  const sort = parseChoice(searchParams.sort, PAYMENT_SORTS, "new")
  const query = parseQuery(searchParams.q)
  const pageSize = parsePageSize(searchParams.size)
  const { rows, total, page, pageCount, summary } = await listPayments({ tab, query, sort, page: parsePage(searchParams.page), pageSize })
  const current = { tab, q: query, sort, size: String(pageSize), page: String(page) }
  const keep = { tab: tab === "all" ? undefined : tab, q: query || undefined, sort: sort === "new" ? undefined : sort, size: pageSize === 25 ? undefined : String(pageSize) }
  const href = (changes: Record<string, string | undefined>) => listHref(BASE, current, changes, DEFAULTS)
  const sortHref = (desc: PaymentSort, asc: PaymentSort) => href({ sort: sort === desc ? asc : desc, page: "1" })

  const tabCount = { all: summary.all.count, pending: summary.pending.count, paid: summary.paid.count, declined: summary.declined.count }

  return (
    <AdminPage
      title="Платежі"
      description={query ? `Знайдено за запитом «${query}»: ${total}` : "Оплата кожного замовлення. Статус змінюють на сторінці замовлення."}
      actions={
        <SearchForm action={BASE} defaultValue={query} placeholder="Номер, ім’я, телефон або e-mail" label="Пошук платежів" hidden={{ ...keep, q: undefined }} />
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Оплачено" value={money(summary.paid.value)} hint={`${summary.paid.count} замовл.`} />
        <StatTile label="Очікують оплати" value={money(summary.pendingOpen.value)} hint={`${summary.pendingOpen.count} замовл., без скасованих`} />
        <StatTile label="Оплату відхилено" value={summary.declined.count} hint={money(summary.declined.value)} />
      </div>

      <div className="space-y-4">
        <Tabs
          label="Статус оплати"
          items={PAYMENT_TABS.map((entry) => ({
            key: entry.key,
            label: entry.label,
            count: tabCount[entry.key],
            href: href({ tab: entry.key, page: "1" }),
            active: entry.key === tab,
          }))}
        />

        {rows.length === 0 ? (
          <EmptyState
            title={query ? "Нічого не знайдено" : "Тут поки порожньо"}
            text={query ? "Перевірте номер замовлення або спробуйте інше написання імені чи телефону." : "Замовлення з таким статусом оплати з’являться тут."}
            action={
              query || tab !== "all" ? (
                <Link href={BASE} className={adminButton.secondary}>
                  Показати всі платежі
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            <ListPosition page={page} pageSize={pageSize} total={total} pageCount={pageCount} />
            <PaymentsTable
              rows={rows.map((row) => ({
                id: row.id,
                when: formatAdminDateTime(row.date),
                customer: row.customer,
                contact: [row.phone, row.email].filter(Boolean).join(" · "),
                value: row.value,
                paymentStatus: row.paymentStatus,
                paymentType: row.paymentType,
                deliveryStatus: row.deliveryStatus,
              }))}
              dateSort={{ href: sortHref("new", "old"), active: sort === "new" ? "desc" : sort === "old" ? "asc" : null }}
              sumSort={{ href: sortHref("sum-desc", "sum-asc"), active: sort === "sum-desc" ? "desc" : sort === "sum-asc" ? "asc" : null }}
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
