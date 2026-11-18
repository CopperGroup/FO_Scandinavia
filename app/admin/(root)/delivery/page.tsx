import type { Metadata } from "next"
import Link from "next/link"
import { AdminPage, EmptyState, Pagination, Pill, SearchForm, Tabs, adminButton } from "@/components/admin/ui"
import { ListPosition } from "@/components/admin-components/ListPosition"
import { AwaitingTable } from "@/components/admin-components/delivery/AwaitingTable"
import { SenderBranches } from "@/components/admin-components/delivery/SenderBranches"
import { SenderForm } from "@/components/admin-components/delivery/SenderForm"
import { WaybillsTable } from "@/components/admin-components/delivery/WaybillsTable"
import { countDelivery, deliveryProblems, getDeliverySettings, listAwaiting, listWaybills } from "@/lib/admin/delivery"
import { PAGE_SIZES, listHref, parseChoice, parsePage, parsePageSize, parseQuery } from "@/lib/admin/list"
import { formatAdminDate, formatAdminDateTime } from "@/lib/admin/status"

export const metadata: Metadata = { title: "Доставка" }
export const dynamic = "force-dynamic"

const TABS = [
  { key: "awaiting", label: "До відправлення" },
  { key: "waybills", label: "Накладні" },
  { key: "branches", label: "Відділення відправника" },
  { key: "sender", label: "Відправник" },
] as const
type TabKey = (typeof TABS)[number]["key"]
const TAB_KEYS = TABS.map((tab) => tab.key) as TabKey[]

const BASE = "/admin/delivery"

type SearchParams = { tab?: string; page?: string; size?: string; q?: string }

const Page = async ({ searchParams }: { searchParams: SearchParams }) => {
  const tab = parseChoice(searchParams.tab, TAB_KEYS, "awaiting")
  const pageSize = parsePageSize(searchParams.size)
  const page = parsePage(searchParams.page)
  const query = tab === "waybills" ? parseQuery(searchParams.q) : ""

  const [settings, counts, awaiting, waybills] = await Promise.all([
    getDeliverySettings(),
    countDelivery(),
    tab === "awaiting" ? listAwaiting({ page, pageSize }) : null,
    tab === "waybills" ? listWaybills({ page, pageSize, query }) : null,
  ])
  const problems = deliveryProblems(settings)

  const current = { tab, q: query, size: String(pageSize), page: "1" }
  const href = (changes: Record<string, string | undefined>) => listHref(BASE, current, changes, { tab: "awaiting", size: "25" })
  const keep = { tab: tab === "awaiting" ? undefined : tab, q: query || undefined, size: pageSize === 25 ? undefined : String(pageSize) }

  const list = awaiting ?? waybills
  const pagination = list && (
    <Pagination
      page={list.page}
      pageCount={list.pageCount}
      total={list.total}
      pageSize={pageSize}
      hrefFor={(next) => href({ page: String(next) })}
      jump={{ action: BASE, hidden: keep }}
      sizes={{ options: [...PAGE_SIZES], hrefFor: (size) => href({ size: String(size), page: "1" }) }}
    />
  )

  return (
    <AdminPage
      title="Доставка"
      description={
        <span className="inline-flex flex-wrap items-center gap-2">
          Нова пошта:
          {problems.length === 0 ? <Pill tone="ok">готово до роботи</Pill> : <Pill tone="problem">налаштування не завершено</Pill>}
        </span>
      }
      actions={
        tab === "waybills" ? <SearchForm action={BASE} defaultValue={query} placeholder="Номер накладної або замовлення" label="Пошук накладних" hidden={{ tab: "waybills" }} /> : undefined
      }
    >
      <div className="space-y-4">
        <Tabs
          label="Розділи доставки"
          items={TABS.map((entry) => ({
            key: entry.key,
            label: entry.label,
            count: entry.key === "awaiting" ? counts.awaiting : entry.key === "waybills" ? counts.waybills : entry.key === "branches" ? settings.branches.length : undefined,
            href: href({ tab: entry.key, q: undefined, page: "1" }),
            active: entry.key === tab,
          }))}
        />

        {problems.length > 0 && (tab === "awaiting" || tab === "waybills") && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <p>
              Накладні поки не створюються автоматично. {problems.join(" ")}
            </p>
            <Link href={href({ tab: settings.apiKeySet && settings.branches.length === 0 ? "branches" : "sender", page: "1" })} className={adminButton.secondary}>
              Що налаштувати
            </Link>
          </div>
        )}

        {tab === "awaiting" && awaiting && (
          awaiting.rows.length === 0 ? (
            <EmptyState title="Усе відправлено" text="Нові оплачені замовлення та замовлення з оплатою при отриманні з’являться тут, доки для них немає накладної." />
          ) : (
            <>
              <ListPosition page={awaiting.page} pageSize={pageSize} total={awaiting.total} pageCount={awaiting.pageCount} />
              <AwaitingTable
                rows={awaiting.rows.map((row) => ({
                  _id: row._id,
                  id: row.id,
                  when: formatAdminDateTime(row.date),
                  recipient: row.recipient,
                  phone: row.phone,
                  place: [row.city, row.warehouse].filter(Boolean).join(", "),
                  value: row.value,
                  payment: row.paymentType === "Накладний платіж" ? "Оплата при отриманні" : row.paymentType,
                  paid: row.paymentStatus === "Success",
                  ready: row.ready,
                }))}
                branches={settings.branches.map((branch) => ({ value: branch.id, label: branch.cityName, hint: branch.warehouseName }))}
                defaultBranchId={settings.defaultBranchId}
                blocked={problems.length > 0}
              />
              {pagination}
            </>
          )
        )}

        {tab === "waybills" && waybills && (
          waybills.rows.length === 0 ? (
            <EmptyState
              title={query ? "Нічого не знайдено" : "Накладних ще немає"}
              text={query ? "Перевірте номер накладної або замовлення." : "Створені накладні та номери, введені вручну, з’являться тут."}
              action={query ? <Link href={href({ q: undefined, page: "1" })} className={adminButton.secondary}>Показати всі накладні</Link> : undefined}
            />
          ) : (
            <>
              <ListPosition page={waybills.page} pageSize={pageSize} total={waybills.total} pageCount={waybills.pageCount} />
              <WaybillsTable
                apiKeySet={settings.apiKeySet}
                rows={waybills.rows.map((row) => ({
                  _id: row._id,
                  id: row.id,
                  number: row.number,
                  recipient: row.recipient,
                  city: row.city,
                  when: formatAdminDate(row.date),
                  cost: row.cost,
                  estimated: row.estimated,
                  status: row.status,
                  checked: formatAdminDateTime(row.checkedAt),
                  deliveryStatus: row.deliveryStatus,
                }))}
              />
              {pagination}
            </>
          )
        )}

        {tab === "branches" && (
          <SenderBranches
            branches={settings.branches.map((branch) => ({ id: branch.id, cityName: branch.cityName, warehouseName: branch.warehouseName }))}
            defaultBranchId={settings.defaultBranchId}
            apiKeySet={settings.apiKeySet}
          />
        )}

        {tab === "sender" && (
          <SenderForm
            saved={settings.savedSender}
            effective={settings.sender}
            sources={settings.senderSource}
            apiKey={{
              source: settings.apiKey.source,
              mask: settings.apiKey.mask,
              unreadable: settings.apiKey.unreadable,
              canSeal: settings.apiKey.canSeal,
              envFallback: settings.apiKey.envFallback,
              changed: [settings.apiKey.updatedBy, formatAdminDateTime(settings.apiKey.updatedAt)].filter(Boolean).join(", "),
            }}
            problems={problems}
          />
        )}
      </div>
    </AdminPage>
  )
}

export default Page
