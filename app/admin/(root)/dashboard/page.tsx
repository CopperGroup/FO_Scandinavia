import type { Metadata } from "next"
import Link from "next/link"
import { AdminPage } from "@/components/admin/ui"
import Dashboard from "@/components/admin-components/Dashboard"
import { DASHBOARD_RANGES, getDashboardOverview, parseDashboardRange, type DashboardRange } from "@/lib/dashboard/overview"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Огляд" }
// Live numbers: never served from a build-time or cached render.
export const dynamic = "force-dynamic"

const RANGE_LABELS: Record<DashboardRange, string> = {
  "7d": "7 днів",
  "30d": "30 днів",
  "90d": "90 днів",
  "12m": "12 місяців",
}

const longDate = new Intl.DateTimeFormat("uk-UA", { timeZone: "Europe/Kiev", day: "numeric", month: "long", year: "numeric" })

const Page = async ({ searchParams }: { searchParams: { range?: string | string[] } }) => {
  const overview = await getDashboardOverview(parseDashboardRange(searchParams.range))

  return (
    <AdminPage
      title="Огляд"
      description={`${longDate.format(new Date(overview.from))} – ${longDate.format(new Date(overview.to)).replace(/\.$/, "")}. Зміни показано відносно попередніх ${RANGE_LABELS[overview.range]}.`}
      actions={
        <nav aria-label="Період" className="inline-flex rounded-md border border-neutral-300 bg-white p-0.5">
          {DASHBOARD_RANGES.map((range) => (
            <Link
              key={range}
              href={`/admin/dashboard?range=${range}`}
              scroll={false}
              aria-current={overview.range === range ? "page" : undefined}
              className={cn(
                "inline-flex h-9 items-center rounded px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black",
                overview.range === range ? "bg-black text-white" : "text-neutral-600 hover:bg-neutral-100 hover:text-black",
              )}
            >
              {RANGE_LABELS[range]}
            </Link>
          ))}
        </nav>
      }
    >
      <Dashboard overview={overview} />
    </AdminPage>
  )
}

export default Page
