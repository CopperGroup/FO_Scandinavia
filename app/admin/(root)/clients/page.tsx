import type { Metadata } from "next"
import Link from "next/link"
import { AdminPage, EmptyState, Pagination, SearchForm, Tabs, adminButton } from "@/components/admin/ui"
import { ListPosition } from "@/components/admin-components/ListPosition"
import { AddClientButton } from "@/components/admin-components/clients/AddClientButton"
import { ClientsTable } from "@/components/admin-components/clients/ClientsTable"
import { getSessionUser } from "@/lib/auth/guards"
import { CLIENT_SORTS, CLIENT_TABS, CLIENT_TAB_KEYS, listClients, type ClientSort } from "@/lib/admin/clients"
import { PAGE_SIZES, listHref, parseChoice, parsePage, parsePageSize, parseQuery } from "@/lib/admin/list"
import { formatAdminDate } from "@/lib/admin/status"

export const metadata: Metadata = { title: "Клієнти" }
export const dynamic = "force-dynamic"

type SearchParams = { tab?: string; q?: string; sort?: string; page?: string; size?: string }

const BASE = "/admin/clients"
const DEFAULTS = { tab: "all", sort: "new", size: "25" }

const Page = async ({ searchParams }: { searchParams: SearchParams }) => {
  const tab = parseChoice(searchParams.tab, CLIENT_TAB_KEYS, "all")
  const sort = parseChoice(searchParams.sort, CLIENT_SORTS, "new")
  const query = parseQuery(searchParams.q)
  const pageSize = parsePageSize(searchParams.size)

  const [{ rows, total, page, pageCount, counts }, currentUser] = await Promise.all([
    listClients({ tab, query, sort, page: parsePage(searchParams.page), pageSize }),
    getSessionUser(),
  ])

  const current = { tab, q: query, sort, size: String(pageSize), page: String(page) }
  const keep = { tab: tab === "all" ? undefined : tab, q: query || undefined, sort: sort === "new" ? undefined : sort, size: pageSize === 25 ? undefined : String(pageSize) }
  const href = (changes: Record<string, string | undefined>) => listHref(BASE, current, changes, DEFAULTS)
  const sortLink = (desc: ClientSort, asc: ClientSort | null, active: "asc" | "desc" | null) => ({
    href: href({ sort: sort === desc && asc ? asc : desc, page: "1" }),
    active,
  })

  return (
    <AdminPage
      title="Клієнти"
      description={query ? `Знайдено за запитом «${query}»: ${total}` : `Усього: ${counts.all}, з них адміністраторів: ${counts.staff}`}
      actions={
        <>
          <SearchForm
            action={BASE}
            defaultValue={query}
            placeholder="Ім’я, e-mail або телефон"
            label="Пошук клієнтів"
            hidden={{ ...keep, q: undefined }}
          />
          <AddClientButton canGrantAdmin={currentUser?.role === "Owner"} />
        </>
      }
    >
      <div className="space-y-4">
        <Tabs
          label="Роль"
          items={CLIENT_TABS.map((entry) => ({
            key: entry.key,
            label: entry.label,
            count: counts[entry.key],
            href: href({ tab: entry.key, page: "1" }),
            active: entry.key === tab,
          }))}
        />

        {rows.length === 0 ? (
          <EmptyState
            title={query ? "Нікого не знайдено" : "Тут поки нікого немає"}
            text={query ? "Спробуйте частину імені, адресу e-mail або останні цифри телефону." : "Клієнти з’являються після першого замовлення або реєстрації."}
            action={
              query || tab !== "all" ? (
                <Link href={BASE} className={adminButton.secondary}>
                  Показати всіх клієнтів
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            <ListPosition page={page} pageSize={pageSize} total={total} pageCount={pageCount} />
            <ClientsTable
              rows={rows.map((row) => ({ ...row, joined: formatAdminDate(row.joined), lastOrder: formatAdminDate(row.lastOrder) }))}
              nameSort={sortLink("name", null, sort === "name" ? "asc" : null)}
              joinedSort={sortLink("new", "old", sort === "new" ? "desc" : sort === "old" ? "asc" : null)}
              ordersSort={sortLink("orders", null, sort === "orders" ? "desc" : null)}
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
