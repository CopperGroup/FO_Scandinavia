"use client"

import Link from "next/link"
import { adminTable } from "@/components/admin/ui"
import { money } from "@/lib/storefront/format"
import { DeliveryPill, PaymentPill } from "./StatusPills"

/** Plain rows from the server; markup is built here so the page payload stays small. */
export type OrderTableRow = {
  id: string
  when: string
  customer: string
  contact: string
  value: number
  paymentStatus: string
  paymentType: string
  deliveryStatus: string
  units: number
  /** Already-optimised thumbnail URLs. */
  thumbs: string[]
}

export function OrdersTable({ rows }: { rows: OrderTableRow[] }) {
  return (
    <>
      <div className={`hidden md:block ${adminTable.wrap}`}>
        <table className={`${adminTable.table} min-w-[51.25rem]`}>
          <thead>
            <tr className={adminTable.headRow}>
              <th scope="col" className={adminTable.th}>Замовлення</th>
              <th scope="col" className={adminTable.th}>Клієнт</th>
              <th scope="col" className={adminTable.th}>Товари</th>
              <th scope="col" className={adminTable.th}>
                <span data-tip="Чи надійшли гроші за замовлення" className="cursor-help underline decoration-neutral-300 decoration-dotted underline-offset-4">
                  Оплата
                </span>
              </th>
              <th scope="col" className={adminTable.th}>
                <span data-tip="Що зараз із замовленням: нове, у дорозі, виконане чи скасоване" className="cursor-help underline decoration-neutral-300 decoration-dotted underline-offset-4">
                  Доставка
                </span>
              </th>
              <th scope="col" className={`${adminTable.th} pr-0 text-right`}>Сума</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((order) => (
              <tr key={order.id} className={`${adminTable.row} relative`}>
                <td className={adminTable.td}>
                  <Link
                    href={`/admin/Orders/${order.id}`}
                    className="font-semibold text-black after:absolute after:inset-0 after:content-[''] focus-visible:underline focus-visible:outline-none"
                  >
                    №{order.id}
                  </Link>
                  <p className="mt-0.5 whitespace-nowrap text-xs text-neutral-500">{order.when}</p>
                </td>
                <td className={adminTable.td}>
                  <p className="font-medium text-neutral-900">{order.customer || "Без імені"}</p>
                  <p className="mt-0.5 text-xs tabular-nums text-neutral-500">{order.contact}</p>
                </td>
                <td className={adminTable.td}>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {order.thumbs.map((src, index) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={index} src={src} alt="" width={36} height={36} loading="lazy" decoding="async" className="h-9 w-9 rounded-md border border-neutral-200 bg-white object-contain" />
                      ))}
                    </div>
                    <span className="tabular-nums text-neutral-600">{order.units} шт.</span>
                  </div>
                </td>
                <td className={adminTable.td}>
                  <PaymentPill status={order.paymentStatus} />
                  <p className="mt-1 text-xs text-neutral-500">{order.paymentType}</p>
                </td>
                <td className={adminTable.td}>
                  <DeliveryPill status={order.deliveryStatus} />
                </td>
                <td className={`${adminTable.td} pr-0 text-right font-semibold tabular-nums`}>{money(order.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-neutral-100 border-y border-neutral-100 md:hidden">
        {rows.map((order) => (
          <li key={order.id}>
            <Link href={`/admin/Orders/${order.id}`} className="block py-4 focus-visible:bg-neutral-50 focus-visible:outline-none">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold">№{order.id}</p>
                <p className="font-semibold tabular-nums">{money(order.value)}</p>
              </div>
              <p className="mt-0.5 text-sm text-neutral-600">
                {order.customer || "Без імені"}, {order.units} шт.
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">{order.when}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <DeliveryPill status={order.deliveryStatus} />
                <PaymentPill status={order.paymentStatus} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
