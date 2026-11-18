"use client"

import Link from "next/link"
import { adminTable } from "@/components/admin/ui"
import { SortLink } from "@/components/admin-components/SortLink"
import { money } from "@/lib/storefront/format"
import { DeliveryPill, PaymentPill } from "./StatusPills"

/**
 * Rows arrive as plain data and the markup is built here, so the page payload
 * carries 30 small objects instead of 30 rendered rows twice (HTML + RSC).
 */

export type PaymentTableRow = {
  id: string
  when: string
  customer: string
  contact: string
  value: number
  paymentStatus: string
  paymentType: string
  deliveryStatus: string
}

type Sort = { href: string; active: "asc" | "desc" | null }

export function PaymentsTable({ rows, dateSort, sumSort }: { rows: PaymentTableRow[]; dateSort: Sort; sumSort: Sort }) {
  return (
    <>
      <div className={`hidden md:block ${adminTable.wrap}`}>
        <table className={`${adminTable.table} min-w-[47.5rem]`}>
          <thead>
            <tr className={adminTable.headRow}>
              <th scope="col" className={adminTable.th}>
                <SortLink label="Замовлення" {...dateSort} />
              </th>
              <th scope="col" className={adminTable.th}>Клієнт</th>
              <th scope="col" className={adminTable.th}>Спосіб оплати</th>
              <th scope="col" className={adminTable.th}>Оплата</th>
              <th scope="col" className={adminTable.th}>Доставка</th>
              <th scope="col" className={`${adminTable.th} pr-0 text-right`}>
                <SortLink label="Сума" {...sumSort} />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={`${adminTable.row} relative`}>
                <td className={adminTable.td}>
                  <Link
                    href={`/admin/Orders/${row.id}`}
                    className="font-semibold text-black after:absolute after:inset-0 after:content-[''] focus-visible:underline focus-visible:outline-none"
                  >
                    №{row.id}
                  </Link>
                  <p className="mt-0.5 whitespace-nowrap text-xs text-neutral-500">{row.when}</p>
                </td>
                <td className={adminTable.td}>
                  <p className="font-medium text-neutral-900">{row.customer || "Без імені"}</p>
                  <p className="mt-0.5 break-all text-xs text-neutral-500">{row.contact}</p>
                </td>
                <td className={`${adminTable.td} text-neutral-700`}>{row.paymentType || "—"}</td>
                <td className={adminTable.td}>
                  <PaymentPill status={row.paymentStatus} />
                </td>
                <td className={adminTable.td}>
                  <DeliveryPill status={row.deliveryStatus} />
                </td>
                <td className={`${adminTable.td} pr-0 text-right font-semibold tabular-nums`}>{money(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-neutral-100 border-y border-neutral-100 md:hidden">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={`/admin/Orders/${row.id}`} className="block py-4 focus-visible:bg-neutral-50 focus-visible:outline-none">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold">№{row.id}</p>
                <p className="font-semibold tabular-nums">{money(row.value)}</p>
              </div>
              <p className="mt-0.5 text-sm text-neutral-600">
                {row.customer || "Без імені"}
                {row.paymentType ? `, ${row.paymentType}` : ""}
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">{row.when}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <PaymentPill status={row.paymentStatus} />
                <DeliveryPill status={row.deliveryStatus} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
