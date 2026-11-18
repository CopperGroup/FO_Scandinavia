import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AdminPage, EmptyState, FormLayout, Pagination, Panel, Pill, StatTile, Tabs, adminButton } from "@/components/admin/ui"
import { DeliveryPill, PaymentPill } from "@/components/admin-components/orders/StatusPills"
import { EditUserForm } from "@/components/forms/EditUser"
import { getSessionUser } from "@/lib/auth/guards"
import { CLIENT_ORDERS_PAGE_SIZE, getClientDetail } from "@/lib/admin/clients"
import { listHref, parseChoice, parsePage } from "@/lib/admin/list"
import { thumbnailUrl } from "@/lib/admin/thumb"
import { ROLE_LABEL, formatAdminDate, formatAdminDateTime } from "@/lib/admin/status"
import { formatPromoDay, promoUsesLabel } from "@/lib/promo/rules"
import { money } from "@/lib/storefront/format"

export const metadata: Metadata = { title: "Клієнт" }
export const dynamic = "force-dynamic"

const TAB_KEYS = ["orders", "promo"] as const
const shortDate = new Intl.DateTimeFormat("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Kiev" })

const Page = async ({ params, searchParams }: { params: { id: string }; searchParams: { tab?: string; page?: string } }) => {
  const tab = parseChoice(searchParams.tab, TAB_KEYS, "orders")
  const ordersPage = parsePage(searchParams.page)
  const [client, currentUser] = await Promise.all([getClientDetail(params.id, ordersPage), getSessionUser()])
  if (!client) notFound()

  const base = `/admin/clients/${client.id}`
  const href = (changes: Record<string, string | undefined>) => listHref(base, { tab, page: String(ordersPage) }, changes, { tab: "orders" })
  const fullName = [client.name, client.surname].filter(Boolean).join(" ") || client.username || client.email
  const { stats } = client
  const ordersPageCount = Math.max(1, Math.ceil(stats.orders / CLIENT_ORDERS_PAGE_SIZE))
  const activePromos = client.promoCodes.filter((promo) => promo.state === "active" || promo.state === "scheduled").length

  return (
    <AdminPage
      title={fullName}
      back={{ href: "/admin/clients", label: "Клієнти" }}
      description={
        <>
          {ROLE_LABEL[client.role] ?? client.role}
          {client.guest ? ", без акаунта: запис створено під час замовлення" : ""}. У базі з {formatAdminDate(client.joined)}
        </>
      }
      actions={
        <a href={`mailto:${client.email}`} className={adminButton.secondary}>
          Написати листа
        </a>
      }
    >
      <FormLayout
        aside={
          <>
            <EditUserForm
              client={{ id: client.id, name: client.name || client.username, surname: client.surname, email: client.email, phoneNumber: client.phoneNumber, role: client.role }}
              canManageAdmins={currentUser?.role === "Owner"}
            />
            {client.address && (
              <Panel title="Адреса з профілю">
                <p className="text-sm text-neutral-700">{client.address}</p>
              </Panel>
            )}
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatTile label="Замовлень" value={stats.orders} hint={stats.canceled ? `скасовано ${stats.canceled}` : "без скасованих"} />
          <StatTile label="Оплачено" value={money(stats.paid)} hint={`${stats.paidOrders} оплачених`} />
          <StatTile label="Середній чек" value={stats.paidOrders ? money(stats.average) : "—"} hint="за оплаченими" />
          <StatTile label="Останнє замовлення" value={stats.lastOrder ? shortDate.format(new Date(stats.lastOrder)) : "—"} hint={stats.firstOrder ? `перше ${formatAdminDate(stats.firstOrder)}` : undefined} />
        </div>

        <Tabs
          label="Розділи профілю"
          items={[
            { key: "orders", label: "Замовлення", count: stats.orders, href: href({ tab: "orders", page: "1" }), active: tab === "orders" },
            { key: "promo", label: "Промокоди", count: activePromos, href: href({ tab: "promo", page: "1" }), active: tab === "promo" },
          ]}
        />

        {tab === "orders" &&
          (client.orders.length === 0 ? (
            <EmptyState title="Замовлень ще немає" text="Коли клієнт оформить замовлення, воно з’явиться тут." />
          ) : (
            <div className="space-y-4">
              <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
                {client.orders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/admin/Orders/${order.id}`}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none"
                    >
                      <span className="min-w-[7.5rem]">
                        <span className="block font-semibold">№{order.id}</span>
                        <span className="block text-xs text-neutral-500">{formatAdminDateTime(order.date)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="flex -space-x-2">
                          {order.images.map((src, index) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={index} src={thumbnailUrl(src)} alt="" width={32} height={32} loading="lazy" className="h-8 w-8 rounded-md border border-neutral-200 bg-white object-contain" />
                          ))}
                        </span>
                        <span className="text-sm tabular-nums text-neutral-600">{order.units} шт.</span>
                      </span>
                      <span className="flex flex-wrap gap-2">
                        <DeliveryPill status={order.deliveryStatus} />
                        <PaymentPill status={order.paymentStatus} />
                      </span>
                      <span className="ml-auto font-semibold tabular-nums">{money(order.value)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Pagination
                page={Math.min(ordersPage, ordersPageCount)}
                pageCount={ordersPageCount}
                total={stats.orders}
                pageSize={CLIENT_ORDERS_PAGE_SIZE}
                hrefFor={(next) => href({ page: String(next) })}
                jump={{ action: base, hidden: { tab: tab === "orders" ? undefined : tab } }}
              />
            </div>
          ))}

        {tab === "promo" &&
          (client.promoCodes.length === 0 ? (
            <EmptyState
              title="Особистих промокодів немає"
              text="Вони з’являються після реєстрації чи відгуку, або їх видає магазин."
              action={
                <Link href={`/admin/promocodes/new?owner=${client.id}`} className={adminButton.secondary}>
                  Видати промокод
                </Link>
              }
            />
          ) : (
            <Panel padded={false}>
              <ul className="divide-y divide-neutral-100">
                {client.promoCodes.map((promo) => (
                  <li key={promo.code} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="min-w-0">
                      <span className="block break-all font-mono text-xs text-neutral-900">{promo.code}</span>
                      <span className="block text-xs text-neutral-500">
                        −{promo.percent}%, {promo.lastDay ? `останній день ${formatPromoDay(promo.lastDay)}` : "без терміну"}
                        {promo.state === "active" || promo.state === "scheduled" ? `, ${promoUsesLabel(promo.usesLeft)}` : ""}
                      </span>
                    </span>
                    {promo.state === "active" ? (
                      <Pill tone="ok">Діє</Pill>
                    ) : promo.state === "scheduled" ? (
                      <Pill>Ще не діє</Pill>
                    ) : (
                      <Pill tone="muted">{promo.state === "used" ? "Використано" : "Термін минув"}</Pill>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
      </FormLayout>
    </AdminPage>
  )
}

export default Page
