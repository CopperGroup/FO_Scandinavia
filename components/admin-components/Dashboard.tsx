"use client"

import { useMemo, useState, useTransition } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  ExternalLink,
  Minus,
  PackageOpen,
  RefreshCw,
  Truck,
} from "lucide-react"
import toast from "react-hot-toast"
import { Panel, StatTile as KitStatTile, adminButton } from "@/components/admin/ui"
import { DeliveryPill, PaymentPill } from "@/components/admin-components/orders/StatusPills"
import { Store } from "@/constants/store"
import { rebuildCatalogNow } from "@/lib/actions/redis/catalog.actions"
import type { DashboardOverview, Metric } from "@/lib/dashboard/types"
import { cn } from "@/lib/utils"

/* ------------------------------- formatting ------------------------------- */

const INK = "#171717"

const number = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat("uk-UA", { notation: "compact", maximumFractionDigits: 1 })

const money = (value: number) => `${Store.currency_sign}${number.format(Math.round(value))}`

const DELIVERY_STATUS: Record<string, string> = {
  Proceeding: "Нові",
  Indelivery: "У дорозі",
  Fulfilled: "Виконані",
  Canceled: "Скасовані",
}

function formatDay(iso: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("uk-UA", { timeZone: "UTC", ...options }).format(new Date(`${iso.slice(0, 10)}T00:00:00.000Z`))
}

function formatDateTime(iso: string): string {
  if (!iso) return ""
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kiev",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

/* --------------------------------- pieces --------------------------------- */

function Delta({ metric }: { metric: Metric }) {
  if (metric.change === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        немає даних за попередній період
      </span>
    )
  }

  const rising = metric.change >= 0
  const Icon = rising ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", rising ? "text-emerald-800" : "text-red-700")}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {rising ? "+" : "−"}
      {Math.abs(metric.change).toFixed(Math.abs(metric.change) < 10 ? 1 : 0)}%
      <span className="font-normal text-neutral-500">до попер. періоду</span>
    </span>
  )
}

function StatTile({ label, value, metric }: { label: string; value: string; metric: Metric }) {
  return <KitStatTile label={label} value={value} hint={<Delta metric={metric} />} />
}

/** Horizontal share bars: one ink colour, the label and the number do the identifying. */
function ShareList({ rows, total }: { rows: { name: string; count: number; value: number }[]; total: number }) {
  if (rows.length === 0) return <p className="text-sm text-neutral-500">За цей період замовлень не було.</p>

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.name}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-neutral-700">{row.name}</span>
            <span className="shrink-0 tabular-nums text-neutral-900">
              {row.count}
              <span className="ml-2 text-neutral-500">{money(row.value)}</span>
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-neutral-100">
            <div className="h-1.5 rounded-full bg-neutral-900" style={{ width: `${total > 0 ? Math.max(2, (row.count / total) * 100) : 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

type ChartMetric = "paidRevenue" | "orders"

function ChartTooltip({
  active,
  payload,
  metric,
  unit,
}: {
  active?: boolean
  payload?: { payload: DashboardOverview["series"][number] }[]
  metric: ChartMetric
  unit: DashboardOverview["bucketUnit"]
}) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  const heading =
    unit === "month"
      ? formatDay(point.start, { month: "long", year: "numeric" })
      : unit === "week"
        ? `Тиждень від ${formatDay(point.start, { day: "numeric", month: "long" })}`
        : formatDay(point.start, { weekday: "short", day: "numeric", month: "long" })

  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="text-neutral-500">{heading}</p>
      <p className="mt-1 font-semibold tabular-nums text-neutral-900">
        {metric === "paidRevenue" ? money(point.paidRevenue) : `${point.orders} замовл.`}
      </p>
      <p className="text-xs tabular-nums text-neutral-500">
        {metric === "paidRevenue" ? `${point.orders} замовл.` : `${money(point.paidRevenue)} оплачено`}
      </p>
    </div>
  )
}

const PIPELINE: Record<
  DashboardOverview["pipeline"][number]["key"],
  { label: string; hint: string; icon: typeof Truck; href: string }
> = {
  new: { label: "Нові замовлення", hint: "чекають на обробку", icon: PackageOpen, href: "/admin/Orders?tab=new" },
  inDelivery: { label: "У дорозі", hint: "передані перевізнику", icon: Truck, href: "/admin/Orders?tab=shipping" },
  awaitingPayment: { label: "Очікують оплати", hint: "ще не оплачені", icon: CircleDollarSign, href: "/admin/payments?tab=pending" },
}

/* -------------------------------- dashboard ------------------------------- */

const Dashboard = ({ overview }: { overview: DashboardOverview }) => {
  const router = useRouter()
  const [chartMetric, setChartMetric] = useState<ChartMetric>("paidRevenue")
  const [isRebuilding, startRebuild] = useTransition()

  const { metrics, series, catalog } = overview
  const periodOrders = metrics.orders.value

  const tickFormatter = useMemo(() => {
    if (overview.bucketUnit === "month") return (iso: string) => formatDay(iso, { month: "short" })
    return (iso: string) => formatDay(iso, { day: "numeric", month: "numeric" })
  }, [overview.bucketUnit])

  const hasSeriesData = series.some((point) => point.orders > 0)

  const rebuild = () =>
    startRebuild(async () => {
      try {
        const result = await rebuildCatalogNow()
        toast.success(`Каталог оновлено: ${number.format(result.stats.listings)} карток`)
        router.refresh()
      } catch {
        toast.error("Не вдалося оновити каталог. Спробуйте ще раз.")
      }
    })

  const catalogFacts: { label: string; value: number; warn?: boolean }[] = [
    { label: "Товарів у базі", value: catalog.stats.products },
    { label: "У наявності", value: catalog.stats.purchasableProducts },
    { label: "Карток у каталозі", value: catalog.stats.listings },
    { label: "Карток із вибором розміру", value: catalog.stats.multiVariantListings },
    { label: "Без фото", value: catalog.stats.productsWithoutImages, warn: true },
    { label: "Без категорії", value: catalog.stats.productsWithoutCategory, warn: true },
    { label: "Без характеристик", value: catalog.stats.productsWithoutParams, warn: true },
    { label: "Дублікати артикулів", value: catalog.stats.duplicateProducts, warn: true },
  ]

  return (
    <div className="space-y-4">
      {/* What needs doing right now, independent of the selected period. */}
      <section aria-label="Потребує уваги" className="grid gap-3 sm:grid-cols-3">
        {overview.pipeline.map((item) => {
          const config = PIPELINE[item.key]
          const Icon = config.icon
          return (
            <Link
              key={item.key}
              href={config.href}
              className="group flex items-center gap-4 rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 group-hover:bg-neutral-900 group-hover:text-white">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm text-neutral-500">{config.label}</span>
                <span className="block text-base font-semibold text-neutral-900 tabular-nums">
                  {item.count}
                  <span className="ml-2 text-sm font-normal text-neutral-500">
                    {item.count > 0 ? `на ${money(item.value)}` : config.hint}
                  </span>
                </span>
              </span>
            </Link>
          )
        })}
      </section>

      <section aria-label="Показники періоду" className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatTile label="Оплачений дохід" value={money(metrics.paidRevenue.value)} metric={metrics.paidRevenue} />
        <StatTile label="Замовлення" value={number.format(metrics.orders.value)} metric={metrics.orders} />
        <StatTile label="Середній чек" value={money(metrics.averageOrder.value)} metric={metrics.averageOrder} />
        <StatTile label="Продано одиниць" value={number.format(metrics.unitsSold.value)} metric={metrics.unitsSold} />
        <StatTile label="Нові покупці" value={number.format(metrics.newCustomers.value)} metric={metrics.newCustomers} />
      </section>

      <div className="grid gap-4 xl:grid-cols-3 [&>*]:min-w-0">
        <Panel
          className="xl:col-span-2"
          title={chartMetric === "paidRevenue" ? "Оплачений дохід" : "Замовлення"}
          description={
            overview.bucketUnit === "day" ? "по днях" : overview.bucketUnit === "week" ? "по тижнях" : "по місяцях"
          }
          action={
            <div role="group" aria-label="Показник графіка" className="inline-flex rounded-lg border border-neutral-200 p-0.5">
              {(["paidRevenue", "orders"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={chartMetric === key}
                  onClick={() => setChartMetric(key)}
                  className={cn(
                    "rounded-md px-2 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900",
                    chartMetric === key ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100",
                  )}
                >
                  {key === "paidRevenue" ? "Дохід" : "Замовлення"}
                </button>
              ))}
            </div>
          }
        >
          {hasSeriesData ? (
            <div className="h-[18.75rem] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="22%">
                  <CartesianGrid vertical={false} stroke="#e5e5e5" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="start"
                    tickFormatter={tickFormatter}
                    tickLine={false}
                    axisLine={{ stroke: "#d4d4d4" }}
                    tickMargin={8}
                    minTickGap={24}
                    tick={{ fontSize: 12, fill: "#737373" }}
                  />
                  <YAxis
                    width={64}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tickFormatter={(value: number) => compact.format(value)}
                    tick={{ fontSize: 12, fill: "#737373" }}
                  />
                  <Tooltip
                    cursor={{ fill: "#f5f5f5" }}
                    content={<ChartTooltip metric={chartMetric} unit={overview.bucketUnit} />}
                  />
                  <Bar dataKey={chartMetric} fill={INK} radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="flex h-[18.75rem] items-center justify-center text-sm text-neutral-500">
              За цей період замовлень не було. Оберіть довший період угорі.
            </p>
          )}
        </Panel>

        <Panel title="Стан замовлень" description="оформлені за період">
          <ShareList
            rows={overview.deliveryStatuses.map((row) => ({
              name: DELIVERY_STATUS[row.status] ?? row.status,
              count: row.count,
              value: row.value,
            }))}
            total={periodOrders}
          />
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3 [&>*]:min-w-0">
        <Panel
          className="xl:col-span-2"
          title="Останні замовлення"
          action={
            <Link href="/admin/Orders" className="text-sm font-medium text-neutral-900 underline-offset-4 hover:underline">
              Усі замовлення
            </Link>
          }
        >
          {overview.recentOrders.length > 0 ? (
            <div className="relative -mx-4 overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-neutral-500">
                    <th scope="col" className="px-4 pb-2 font-normal">Замовлення</th>
                    <th scope="col" className="px-3 pb-2 font-normal">Покупець</th>
                    <th scope="col" className="px-3 pb-2 font-normal">Оплата</th>
                    <th scope="col" className="px-3 pb-2 font-normal">Доставка</th>
                    <th scope="col" className="px-4 pb-2 text-right font-normal">Сума</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {overview.recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/Orders/${order.id}`}
                          className="font-medium text-neutral-900 underline-offset-4 hover:underline"
                        >
                          №{order.id}
                        </Link>
                        <span className="block text-xs text-neutral-500">{formatDateTime(order.date)}</span>
                      </td>
                      <td className="max-w-[12.5rem] truncate px-3 py-3 text-neutral-700">{order.customer}</td>
                      <td className="px-3 py-3">
                        <PaymentPill status={order.paymentStatus} />
                      </td>
                      <td className="px-3 py-3">
                        <DeliveryPill status={order.deliveryStatus} />
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-neutral-900">{money(order.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">Замовлень ще немає.</p>
          )}
        </Panel>

        <Panel title="Найкраще продається" description="оплачені одиниці, розміри разом">
          {overview.topProducts.length > 0 ? (
            <ol className="space-y-3">
              {overview.topProducts.map((product) => (
                <li key={product.key} className="flex items-center gap-3">
                  <span className="relative h-12 w-10 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                    {product.image && (
                      <Image src={product.image} alt="" fill sizes="40px" className="object-contain mix-blend-multiply" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <Link
                      href={`/catalog/${product.productId}`}
                      target="_blank"
                      className="line-clamp-1 text-sm font-medium text-neutral-900 underline-offset-4 hover:underline"
                    >
                      {product.title}
                    </Link>
                    <span className="mt-1 block h-1.5 rounded-full bg-neutral-100">
                      <span
                        className="block h-1.5 rounded-full bg-neutral-900"
                        style={{ width: `${Math.max(4, (product.units / overview.topProducts[0].units) * 100)}%` }}
                      />
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-900">{product.units} шт.</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-neutral-500">За цей період оплачених продажів не було.</p>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3 [&>*]:min-w-0">
        <Panel title="Спосіб оплати" description="оформлені за період">
          <ShareList rows={overview.paymentTypes} total={periodOrders} />
        </Panel>

        <Panel title="Спосіб доставки" description="оформлені за період">
          <ShareList rows={overview.deliveryMethods} total={periodOrders} />
        </Panel>

        <Panel
          title="Каталог на сайті"
          description={`оновлено ${formatDateTime(catalog.builtAt)}`}
          action={
            <button
              type="button"
              onClick={rebuild}
              disabled={isRebuilding}
              className={adminButton.secondary}
            >
              <RefreshCw className={cn("h-4 w-4", isRebuilding && "animate-spin")} aria-hidden="true" />
              {isRebuilding ? "Оновлюємо" : "Оновити каталог"}
            </button>
          }
        >
          <dl className="space-y-2 text-sm">
            {catalogFacts.map((fact) => (
              <div key={fact.label} className="flex items-baseline justify-between gap-3 border-b border-neutral-100 pb-2">
                <dt className="text-neutral-500">{fact.label}</dt>
                <dd className={cn("font-semibold tabular-nums", fact.warn && fact.value > 0 ? "text-red-700" : "text-neutral-900")}>
                  {number.format(fact.value)}
                </dd>
              </div>
            ))}
          </dl>
          <Link
            href="/catalog"
            target="_blank"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-neutral-900 underline-offset-4 hover:underline"
          >
            Відкрити каталог <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Panel>
      </div>
    </div>
  )
}

export default Dashboard
