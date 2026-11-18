"use client"

import Link from "next/link"
import { Pill, adminTable } from "@/components/admin/ui"
import { SortLink } from "@/components/admin-components/SortLink"
import { ROLE_LABEL } from "@/lib/admin/status"
import { money } from "@/lib/storefront/format"

export type ClientTableRow = {
  id: string
  name: string
  email: string
  phone: string
  role: string
  guest: boolean
  joined: string
  orders: number
  paid: number
  lastOrder: string
}

type Sort = { href: string; active: "asc" | "desc" | null }

function RolePill({ role, guest }: { role: string; guest: boolean }) {
  if (role === "Owner" || role === "Admin") return <Pill tone="strong">{ROLE_LABEL[role]}</Pill>
  return guest ? <Pill tone="muted">Без акаунта</Pill> : null
}

export function ClientsTable({ rows, nameSort, joinedSort, ordersSort }: { rows: ClientTableRow[]; nameSort: Sort; joinedSort: Sort; ordersSort: Sort }) {
  return (
    <>
      <div className={`hidden md:block ${adminTable.wrap}`}>
        <table className={`${adminTable.table} min-w-[47.5rem]`}>
          <thead>
            <tr className={adminTable.headRow}>
              <th scope="col" className={adminTable.th}>
                <SortLink label="Клієнт" {...nameSort} />
              </th>
              <th scope="col" className={adminTable.th}>Контакти</th>
              <th scope="col" className={adminTable.th}>
                <SortLink label="Зареєстровано" {...joinedSort} />
              </th>
              <th scope="col" className={`${adminTable.th} text-right`}>
                <SortLink label="Замовлення" {...ordersSort} />
              </th>
              <th scope="col" className={`${adminTable.th} pr-0 text-right`}>
                <span data-tip="Сума оплачених замовлень клієнта, без скасованих" className="cursor-help underline decoration-neutral-300 decoration-dotted underline-offset-4">
                  Оплачено
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={`${adminTable.row} relative`}>
                <td className={adminTable.td}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/clients/${row.id}`}
                      className="font-medium text-black after:absolute after:inset-0 after:content-[''] focus-visible:underline focus-visible:outline-none"
                    >
                      {row.name || "Без імені"}
                    </Link>
                    <RolePill role={row.role} guest={row.guest} />
                  </div>
                </td>
                <td className={adminTable.td}>
                  <p className="break-all text-neutral-900">{row.email}</p>
                  {row.phone && <p className="mt-0.5 text-xs tabular-nums text-neutral-500">{row.phone}</p>}
                </td>
                <td className={`${adminTable.td} whitespace-nowrap text-neutral-600`}>{row.joined}</td>
                <td className={`${adminTable.td} text-right tabular-nums`}>
                  {row.orders}
                  {row.lastOrder && <p className="mt-0.5 whitespace-nowrap text-xs text-neutral-500">останнє {row.lastOrder}</p>}
                </td>
                <td className={`${adminTable.td} pr-0 text-right font-semibold tabular-nums`}>{row.paid > 0 ? money(row.paid) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-neutral-100 border-y border-neutral-100 md:hidden">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={`/admin/clients/${row.id}`} className="block py-4 focus-visible:bg-neutral-50 focus-visible:outline-none">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold">{row.name || "Без імені"}</p>
                <p className="shrink-0 text-sm tabular-nums text-neutral-600">{row.orders} замовл.</p>
              </div>
              <p className="mt-0.5 break-all text-sm text-neutral-600">{row.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                <RolePill role={row.role} guest={row.guest} />
                {row.paid > 0 && <span className="tabular-nums">оплачено {money(row.paid)}</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
