import Link from "next/link"
import { EmptyState, Panel, Pill, StatTile, adminTable } from "@/components/admin/ui"
import { formatAdminDateTime } from "@/lib/admin/status"
import type { PromoDetail, PromoUse } from "@/lib/promo/admin"
import { money } from "@/lib/storefront/format"
import { cn } from "@/lib/utils"

/** The three numbers of a code: orders with it, what was paid, what the customers saved. Uncancelled orders only. */
export function PromoStats({ totals }: { totals: PromoDetail["totals"] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatTile label="Замовлень з кодом" value={totals.orders} hint="без скасованих" />
      <StatTile label="Оплачено з ним" value={money(totals.paid)} hint="сума цих замовлень" />
      <StatTile label="Знижка покупцям" value={money(totals.saved)} hint="на скільки дешевше вийшли товари" />
    </div>
  )
}

function Customer({ use }: { use: PromoUse }) {
  if (!use.customer) return <span className="text-neutral-500">Покупця видалено</span>
  return (
    <Link href={`/admin/clients/${use.customer.id}`} className="block min-w-0 hover:underline focus-visible:underline focus-visible:outline-none">
      <span className="block truncate text-neutral-900">{use.customer.name || use.customer.email || "Без імені"}</span>
      {use.customer.name && use.customer.email && <span className="block truncate text-xs text-neutral-500">{use.customer.email}</span>}
    </Link>
  )
}

function OrderLink({ use }: { use: PromoUse }) {
  if (!use.order) {
    return (
      <span data-tip="Код використали до того, як магазин почав записувати замовлення до кожного коду" className="cursor-help text-neutral-500 underline decoration-neutral-300 decoration-dotted underline-offset-4">
        без номера
      </span>
    )
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Link href={`/admin/Orders/${use.order}`} className="font-medium tabular-nums text-black hover:underline focus-visible:underline focus-visible:outline-none">
        №{use.order}
      </Link>
      {use.canceled && (
        <Pill tone="muted" tip="Замовлення скасовано: його не враховано в сумах угорі">
          Скасовано
        </Pill>
      )}
    </span>
  )
}

const amount = (value: number | null) => (value === null ? "—" : money(value))

/** Who used the code, the latest first. */
export function PromoUses({ uses, usedCount, shown }: { uses: PromoUse[]; usedCount: number; shown: number }) {
  if (uses.length === 0) {
    return <EmptyState title="Кодом ще ніхто не скористався" text="Коли покупець оформить замовлення з цим кодом, воно з’явиться тут: дата, номер замовлення, покупець і сума знижки." />
  }

  return (
    <Panel
      title="Хто скористався"
      description={usedCount > shown ? `Останні ${shown} з ${usedCount}` : `Замовлень: ${uses.length}`}
      padded={false}
    >
      <div className={cn("hidden md:block", adminTable.wrap)}>
        <table className={adminTable.table}>
          <thead>
            <tr className={adminTable.headRow}>
              <th scope="col" className={cn(adminTable.th, "pl-4")}>
                Дата
              </th>
              <th scope="col" className={adminTable.th}>
                Замовлення
              </th>
              <th scope="col" className={adminTable.th}>
                Покупець
              </th>
              <th scope="col" className={cn(adminTable.th, "text-right")}>
                <span data-tip="Скільки покупець заплатив за замовлення, зі знижкою" className="cursor-help underline decoration-neutral-300 decoration-dotted underline-offset-4">
                  Оплачено
                </span>
              </th>
              <th scope="col" className={cn(adminTable.th, "pr-4 text-right")}>
                <span data-tip="На скільки дешевше вийшли товари завдяки коду" className="cursor-help underline decoration-neutral-300 decoration-dotted underline-offset-4">
                  Знижка
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {uses.map((use) => (
              <tr key={use.id} className={adminTable.row}>
                <td className={cn(adminTable.td, "whitespace-nowrap pl-4 tabular-nums text-neutral-600")}>{formatAdminDateTime(use.at) || "—"}</td>
                <td className={adminTable.td}>
                  <OrderLink use={use} />
                </td>
                <td className={cn(adminTable.td, "max-w-60")}>
                  <Customer use={use} />
                </td>
                <td className={cn(adminTable.td, "whitespace-nowrap text-right tabular-nums", use.canceled && "text-neutral-400 line-through")}>{amount(use.paid)}</td>
                <td className={cn(adminTable.td, "whitespace-nowrap pr-4 text-right tabular-nums", use.canceled && "text-neutral-400 line-through")}>{amount(use.saved)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-neutral-100 md:hidden">
        {uses.map((use) => (
          <li key={use.id} className="space-y-1 px-4 py-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <OrderLink use={use} />
              <span className={cn("shrink-0 font-semibold tabular-nums", use.canceled && "text-neutral-400 line-through")}>{amount(use.paid)}</span>
            </div>
            <Customer use={use} />
            <p className="flex flex-wrap justify-between gap-x-3 text-xs text-neutral-500">
              <span className="tabular-nums">{formatAdminDateTime(use.at) || "—"}</span>
              {use.saved !== null && <span className="tabular-nums">знижка {money(use.saved)}</span>}
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
