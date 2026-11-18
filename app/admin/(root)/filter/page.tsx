import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { EmptyState, Panel, SplitView, StatTile, adminButton } from "@/components/admin/ui"
import FilterCategoryNav from "@/components/admin-components/filter/FilterCategoryNav"
import FilterDelayForm from "@/components/admin-components/filter/FilterDelayForm"
import FilterParamsForm from "@/components/admin-components/filter/FilterParamsForm"
import { getFilterCategory, getFilterOverview } from "@/lib/admin/categories"
import { isObjectIdLike, productsWord } from "@/lib/admin/catalog-shared"

export const metadata: Metadata = { title: "Фільтр каталогу" }
export const dynamic = "force-dynamic"

/**
 * Filter of the storefront catalog: categories on the left, the chosen
 * category's characteristics on the right (?id=…). Without a choice the right
 * pane holds the general settings.
 */
export default async function FilterPage({ searchParams }: { searchParams: { id?: string } }) {
  const id = isObjectIdLike(searchParams.id) ? searchParams.id.toLowerCase() : ""
  const [overview, detail] = await Promise.all([getFilterOverview({ query: "", page: 1, show: "all", pageSize: 100000 }), id ? getFilterCategory(id) : null])

  const list = <FilterCategoryNav rows={overview.rows.map((row) => ({ id: row.id, name: row.name, products: row.products, configured: row.configured.length }))} selected={id} />

  const back = (
    <div className="border-b border-neutral-200 px-4 py-3 lg:hidden">
      <Link href="/admin/filter" className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-black">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Усі категорії
      </Link>
    </div>
  )

  let pane: React.ReactNode
  if (id && !detail) {
    pane = (
      <div className="p-6">
        {back}
        <EmptyState title="Такої категорії немає" text="Можливо, її видалили. Оберіть іншу ліворуч." />
      </div>
    )
  } else if (detail) {
    pane = (
      <div>
        {back}
        <div className="flex flex-wrap items-end justify-between gap-3 px-4 pb-4 pt-4 sm:px-6">
          <div className="min-w-0">
            <h1 className="break-words font-display text-xl font-semibold tracking-[-0.02em]">{detail.name}</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {detail.products} {productsWord(detail.products)}. Позначте характеристики, які покупці зможуть обирати у фільтрі цієї категорії.
            </p>
          </div>
          <Link href={`/admin/categories?id=${detail.id}`} className={adminButton.secondary}>
            Відкрити категорію
          </Link>
        </div>
        {detail.params.length === 0 ? (
          <div className="px-4 pb-4 sm:px-6">
            <EmptyState
              title="У товарів немає характеристик"
              text="Додайте товарам цієї категорії характеристики (розмір, колір тощо), і їх можна буде вивести у фільтр."
              action={
                <Link href={`/admin/products?category=${detail.id}`} className={adminButton.secondary}>
                  Товари категорії
                </Link>
              }
            />
          </div>
        ) : (
          <div className="border-t border-neutral-200">
            <FilterParamsForm key={detail.id} categoryId={detail.id} params={detail.params} products={detail.products} />
          </div>
        )}
      </div>
    )
  } else {
    pane = (
      <div className="space-y-4 p-4 sm:p-6 lg:p-8">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-[-0.02em]">Фільтр каталогу</h1>
          <p className="mt-1 text-sm text-neutral-500">Які характеристики покупці можуть обирати у фільтрі кожної категорії. Оберіть категорію ліворуч.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile label="Категорій з товарами" value={overview.counts.all} />
          <StatTile label="Фільтр налаштовано" value={overview.counts.configured} />
          <StatTile label="Без фільтра" value={overview.counts.empty} />
        </div>
        <Panel title="Швидкість оновлення" description="Скільки каталог чекає після кліку у фільтрі, перш ніж оновити товари. Коротша затримка — швидша відповідь, довша — менше зайвих оновлень, коли покупець ставить кілька позначок поспіль.">
          <FilterDelayForm delay={overview.delay} />
        </Panel>
      </div>
    )
  }

  return <SplitView listLabel="Категорії фільтра" list={list} detail={pane} showDetailOnMobile={Boolean(id)} />
}
