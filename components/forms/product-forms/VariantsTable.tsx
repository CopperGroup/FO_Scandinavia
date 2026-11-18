import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Pill } from "@/components/admin/ui"
import type { ProductVariantsView } from "@/lib/admin/products"
import { cn } from "@/lib/utils"
import { formatUah } from "./ProductPreview"

/**
 * Every SKU of the model this product belongs to (all sizes of all colours),
 * so the admin sees the model as a whole: photo, colour, size, article,
 * price and stock, the current one marked, the others one click away.
 */
export function VariantsTable({ variants }: { variants: ProductVariantsView }) {
  // A column whose value is the same in every row tells nothing: leave it out.
  const hasColor = new Set(variants.rows.map((row) => row.color ?? "")).size > 1
  const hasOption = variants.rows.some((row) => row.option)
  const th = "h-9 whitespace-nowrap px-3 text-left text-xs font-medium text-neutral-500"
  const td = "px-3 py-2 align-middle"

  return (
    <div>
      <div className="relative overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200">
              <th scope="col" className={cn(th, "w-14 pl-4 sm:pl-4")}>
                <span className="sr-only">Фото</span>
              </th>
              {hasColor && (
                <th scope="col" className={th}>
                  Колір
                </th>
              )}
              {hasOption && (
                <th scope="col" className={th}>
                  {variants.optionLabel}
                </th>
              )}
              <th scope="col" className={cn(th, "hidden sm:table-cell")}>
                Артикул
              </th>
              <th scope="col" className={cn(th, "text-right")}>
                Ціна
              </th>
              <th scope="col" className={cn(th, "text-right")}>
                На складі
              </th>
              <th scope="col" className={cn(th, "w-10 pr-4 sm:w-32 sm:pr-4")}>
                <span className="sr-only">Відкрити</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {variants.rows.map((row) => {
              const discounted = row.priceToShow < row.price
              return (
                <tr key={row.productId} className={cn("border-b border-neutral-100 last:border-b-0", row.current ? "bg-neutral-50" : "hover:bg-neutral-50")}>
                  <td className={cn(td, "pl-4 sm:pl-4")}>
                    <span className="block h-12 w-9 overflow-hidden rounded border border-neutral-200 bg-white">
                      {row.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.image} alt="" loading="lazy" className="h-full w-full object-contain" />
                      )}
                    </span>
                  </td>
                  {hasColor && <td className={cn(td, row.current && "font-medium")}>{row.color ?? "—"}</td>}
                  {hasOption && <td className={cn(td, "tabular-nums", row.current && "font-medium")}>{row.option ?? "—"}</td>}
                  <td className={cn(td, "hidden max-w-[11.25rem] truncate text-neutral-600 sm:table-cell")} data-tip={row.articleNumber}>
                    {row.articleNumber || "—"}
                  </td>
                  <td className={cn(td, "whitespace-nowrap text-right tabular-nums")}>
                    {formatUah(row.priceToShow)}
                    {discounted && <span className="block text-xs text-neutral-400 line-through sm:ml-2 sm:inline">{formatUah(row.price)}</span>}
                  </td>
                  <td className={cn(td, "whitespace-nowrap text-right tabular-nums", !row.purchasable && "text-red-700")}>
                    {row.quantity > 0 ? `${row.quantity} шт.` : "немає"}
                    {row.quantity > 0 && !row.purchasable && <span className="block text-xs">не продається</span>}
                  </td>
                  <td className={cn(td, "pr-4 text-right sm:pr-4")}>
                    {row.current ? (
                      <>
                        <span className="hidden sm:inline">
                          <Pill tone="strong">Цей товар</Pill>
                        </span>
                        <span className="inline-block h-2 w-2 rounded-full bg-black sm:hidden" role="img" data-tip="Цей товар" aria-label="Цей товар" />
                      </>
                    ) : (
                      <Link
                        href={`/admin/createProduct/list/${row.productId}`}
                        className="inline-flex h-control-sm items-center gap-1 whitespace-nowrap rounded-md px-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                        aria-label={`Відкрити варіант ${[row.color, row.option].filter(Boolean).join(", ") || row.articleNumber}`}
                      >
                        <span className="hidden sm:inline">Відкрити</span>
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {variants.total > variants.rows.length && (
        <p className="border-t border-neutral-200 px-4 py-3 text-xs text-neutral-500">
          Показано {variants.rows.length} з {variants.total} варіантів.
        </p>
      )}
    </div>
  )
}
