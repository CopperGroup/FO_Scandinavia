import type { Metadata } from "next"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { EmptyState, Pagination, SearchForm, SplitView, Tabs, adminButton } from "@/components/admin/ui"
import CategoryTreeNav from "@/components/admin-components/Categories/CategoryTreeNav"
import CategoryGeneralForm from "@/components/admin-components/Categories/CategoryGeneralForm"
import CategoryProductsPane from "@/components/admin-components/Categories/CategoryProductsPane"
import CategoryChildren from "@/components/admin-components/Categories/CategoryChildren"
import CategoriesOverview from "@/components/admin-components/Categories/CategoriesOverview"
import DamagedCategories from "@/components/admin-components/Categories/DamagedCategories"
import { PaneBody, PaneShell, StatStrip } from "@/components/admin-components/Categories/Pane"
import { ancestorsOf, descendantIds, subtreeTotals } from "@/components/admin-components/Categories/tree-model"
import {
  countUncategorizedProducts,
  getCategoryDetail,
  getCategoryTree,
  listDamagedCategories,
  optionsFromTree,
  type TreeCategory,
} from "@/lib/admin/categories"
import { PRODUCT_PAGE_SIZES, listProducts, parsePageSize } from "@/lib/admin/products"
import { isObjectIdLike, pluralUk, productsWord } from "@/lib/admin/catalog-shared"

export const metadata: Metadata = { title: "Категорії" }
export const dynamic = "force-dynamic"

type SearchParams = { id?: string; tab?: string; q?: string; page?: string; size?: string }
type Option = { id: string; name: string; path: string }

const TABS = [
  { key: "general", label: "Загальне" },
  { key: "products", label: "Товари" },
  { key: "children", label: "Підкатегорії" },
] as const

const number = new Intl.NumberFormat("uk-UA")

/**
 * The categories admin: the tree on the left, the chosen category on the
 * right with short tabs. Everything is in the URL (?id=…&tab=…), so a reload
 * or the back button keeps the place. Every right-pane view uses <PaneShell>.
 */
export default async function CategoriesPage({ searchParams }: { searchParams: SearchParams }) {
  const id =
    searchParams.id === "uncategorized" || searchParams.id === "damaged" ? searchParams.id : isObjectIdLike(searchParams.id) ? searchParams.id.toLowerCase() : ""
  const [tree, uncategorized] = await Promise.all([getCategoryTree(), countUncategorizedProducts()])
  const damaged = await listDamagedCategories(tree)
  const options = optionsFromTree(tree)

  const list = <CategoryTreeNav nodes={tree} selected={id} uncategorized={uncategorized} damaged={damaged.length} options={options} />

  let detail: React.ReactNode
  if (id === "damaged") {
    detail = (
      <PaneShell
        title="Пошкоджені категорії"
        meta="Категорії з однаковими назвами і категорії, у яких замість назви службовий код. Такі категорії приховано зі списків вибору, доки їх не виправлено."
      >
        <PaneBody>
          <DamagedCategories items={damaged} targets={options} />
        </PaneBody>
      </PaneShell>
    )
  } else if (id === "uncategorized") {
    detail = await productsView({ searchParams, id, options, mode: "uncategorized" })
  } else if (id) {
    detail = await categoryView({ searchParams, id, tree, options })
  } else {
    detail = overview({ tree, options, uncategorized, damaged: damaged.length })
  }

  return <SplitView listLabel="Дерево категорій" list={list} detail={detail} showDetailOnMobile={Boolean(id)} />
}

/* -------------------------------------------------------------------------- */
/*                               Nothing selected                             */
/* -------------------------------------------------------------------------- */

function overview({ tree, options, uncategorized, damaged }: { tree: TreeCategory[]; options: Option[]; uncategorized: number; damaged: number }) {
  const usable = tree.filter((node) => !node.damaged)
  const totals = subtreeTotals(usable)
  const pathOf = new Map(options.map((option) => [option.id, option.path]))
  const entry = (node: TreeCategory) => ({ id: node.id, name: node.name, path: pathOf.get(node.id) ?? "", products: node.products })
  const empty = options.filter((option) => (totals.get(option.id) ?? 0) === 0).map((option) => ({ ...option, products: 0 }))
  const biggest = [...usable]
    .filter((node) => node.products > 0)
    .sort((a, b) => b.products - a.products)
    .slice(0, 8)
    .map(entry)
  const withProducts = usable.length - empty.length

  return (
    <PaneShell
      home
      title="Категорії"
      meta={`${number.format(usable.length)} ${pluralUk(usable.length, "категорія", "категорії", "категорій")}, з них ${number.format(withProducts)} з товарами. Оберіть категорію ліворуч, щоб змінити її.`}
      stats={
        <StatStrip
          items={[
            { label: "Категорій", value: number.format(usable.length) },
            { label: "Порожніх", value: number.format(empty.length), hint: empty.length ? "без товарів" : undefined },
            {
              label: "Товарів без категорії",
              value: number.format(uncategorized),
              tone: uncategorized ? "problem" : undefined,
              hint: uncategorized ? "призначити →" : undefined,
              href: uncategorized ? "/admin/categories?id=uncategorized" : undefined,
            },
            {
              label: "Пошкоджених",
              value: number.format(damaged),
              tone: damaged ? "problem" : undefined,
              hint: damaged ? "виправити →" : undefined,
              href: damaged ? "/admin/categories?id=damaged" : undefined,
            },
          ]}
        />
      }
    >
      <PaneBody>
        <CategoriesOverview empty={empty} biggest={biggest} />
      </PaneBody>
    </PaneShell>
  )
}

/* -------------------------------------------------------------------------- */
/*                         Products (a category or none)                      */
/* -------------------------------------------------------------------------- */

async function productsView({
  searchParams,
  id,
  options,
  mode,
  categoryName,
  shell,
}: {
  searchParams: SearchParams
  id: string
  options: Option[]
  mode: "category" | "uncategorized"
  categoryName?: string
  /** For a category: its header and tabs around the panel. */
  shell?: (body: React.ReactNode) => React.ReactNode
}) {
  const query = (searchParams.q ?? "").trim().slice(0, 80)
  const pageSize = parsePageSize(searchParams.size, 25)
  const list = await listProducts({
    filter: mode === "category" ? { tab: "all", query, category: id } : { tab: "uncategorized", query, category: "" },
    sort: "name",
    page: Number.parseInt(searchParams.page ?? "1") || 1,
    pageSize,
  })
  const tab = mode === "category" ? "products" : undefined
  const hrefFor = (changes: { page?: number; size?: number }) => {
    const params = new URLSearchParams({ id })
    if (tab) params.set("tab", tab)
    if (query) params.set("q", query)
    const size = changes.size ?? pageSize
    if (size !== 25) params.set("size", String(size))
    const page = changes.page ?? list.page
    if (page > 1) params.set("page", String(page))
    return `/admin/categories?${params}`
  }
  const keep = { id, tab, q: query || undefined, size: pageSize !== 25 ? String(pageSize) : undefined }
  const position = list.total ? `${number.format((list.page - 1) * pageSize + 1)}–${number.format(Math.min(list.total, list.page * pageSize))} з ${number.format(list.total)}` : undefined

  const panel = (
    <CategoryProductsPane
      mode={mode}
      categoryId={mode === "category" ? id : undefined}
      categoryName={categoryName}
      rows={list.rows}
      targets={options}
      query={query}
      position={list.pageCount > 1 ? position : undefined}
      search={
        <SearchForm
          action="/admin/categories"
          defaultValue={query}
          placeholder={mode === "category" ? "Знайти в цій категорії" : "Знайти серед цих товарів"}
          label="Пошук товарів"
          hidden={{ id, tab, size: keep.size }}
          className="sm:w-72"
        />
      }
      pagination={
        list.total > 0 ? (
          <Pagination
            page={list.page}
            pageCount={list.pageCount}
            total={list.total}
            pageSize={pageSize}
            hrefFor={(page) => hrefFor({ page })}
            jump={{ action: "/admin/categories", hidden: keep }}
            sizes={{ options: [...PRODUCT_PAGE_SIZES], hrefFor: (size) => hrefFor({ size, page: 1 }) }}
          />
        ) : undefined
      }
    />
  )

  if (shell) return shell(<PaneBody>{panel}</PaneBody>)
  return (
    <PaneShell
      title="Товари без категорії"
      meta={
        list.total || query
          ? `${number.format(list.total)} ${productsWord(list.total)}${query ? " за запитом" : ""}. Покупці не знайдуть їх у меню каталогу: виберіть товари і призначте їм категорію.`
          : "Усі товари мають категорію."
      }
    >
      <PaneBody>{panel}</PaneBody>
    </PaneShell>
  )
}

/* -------------------------------------------------------------------------- */
/*                               A chosen category                            */
/* -------------------------------------------------------------------------- */

async function categoryView({ searchParams, id, tree, options }: { searchParams: SearchParams; id: string; tree: TreeCategory[]; options: Option[] }) {
  const detail = await getCategoryDetail(id)
  if (!detail) {
    return (
      <PaneShell title="Такої категорії немає">
        <PaneBody>
          <EmptyState
            title="Категорію не знайдено"
            text="Можливо, її видалили або об’єднали з іншою. Оберіть категорію ліворуч."
            action={
              <Link href="/admin/categories" className={adminButton.secondary}>
                До всіх категорій
              </Link>
            }
          />
        </PaneBody>
      </PaneShell>
    )
  }

  const tab = (TABS.some((entry) => entry.key === searchParams.tab) ? searchParams.tab : "general") as (typeof TABS)[number]["key"]
  const node = tree.find((entry) => entry.id === id)
  const children = tree.filter((entry) => entry.parentId === id)
  const path = ancestorsOf(tree, id)
  const below = descendantIds(tree, id)
  const above = new Set(path.map((entry) => entry.id))
  const { stats } = detail

  // The breadcrumb already names the parent; the meta line says what the breadcrumb cannot.
  const placeAndChildren = [
    path.length ? "" : "Верхній рівень меню",
    children.length ? `${children.length} ${pluralUk(children.length, "підкатегорія", "підкатегорії", "підкатегорій")}` : "без підкатегорій",
  ]
    .filter(Boolean)
    .join(" · ")
  const meta = (
    <>
      {placeAndChildren.charAt(0).toLocaleUpperCase("uk-UA") + placeAndChildren.slice(1)}
      {" · "}
      <Link href={`/admin/filter?id=${id}`} className="underline decoration-neutral-300 underline-offset-2 hover:text-black hover:decoration-black">
        {detail.inFilter ? `фільтр: ${detail.inFilter} ${pluralUk(detail.inFilter, "характеристика", "характеристики", "характеристик")}` : "налаштувати фільтр"}
      </Link>
    </>
  )

  const shell = (body: React.ReactNode) => (
    <PaneShell
      crumbs={path.map((entry) => ({ href: `/admin/categories?id=${entry.id}`, label: entry.name }))}
      title={detail.name}
      meta={meta}
      actions={
        <>
          <a href={`/catalog?categories=${id}`} target="_blank" rel="noreferrer" className={adminButton.secondary}>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            <span className="sm:hidden">У магазині</span>
            <span className="hidden sm:inline">Переглянути в магазині</span>
          </a>
          <Link href={`/admin/products?category=${id}`} className={adminButton.secondary}>
            <span className="sm:hidden">У «Товарах»</span>
            <span className="hidden sm:inline">Відкрити в «Товарах»</span>
          </Link>
        </>
      }
      stats={
        <StatStrip
          items={[
            { label: "Товарів", value: number.format(stats.products) },
            { label: "В наявності", value: number.format(stats.available), hint: stats.products ? `${Math.round((stats.available / stats.products) * 100)}%` : undefined },
            {
              label: "Середня ціна",
              value: stats.products ? `${number.format(stats.averagePrice)} ₴` : "—",
              hint: stats.averageDiscount ? `−${stats.averageDiscount}%` : undefined,
            },
            { label: "Продано, шт.", value: number.format(stats.sales) },
          ]}
        />
      }
      tabs={
        <Tabs
          label="Розділи категорії"
          items={TABS.map((entry) => ({
            key: entry.key,
            label: entry.label,
            href: entry.key === "general" ? `/admin/categories?id=${id}` : `/admin/categories?id=${id}&tab=${entry.key}`,
            count: entry.key === "products" ? stats.products : entry.key === "children" ? children.length : undefined,
            active: entry.key === tab,
          }))}
        />
      }
    >
      {body}
    </PaneShell>
  )

  if (tab === "products") {
    return productsView({ searchParams, id, options, mode: "category", categoryName: detail.name, shell })
  }

  if (tab === "children") {
    return shell(
      <PaneBody>
        <CategoryChildren
          categoryId={id}
          categoryName={detail.name}
          items={children.map((child) => ({
            id: child.id,
            name: child.name,
            products: child.products,
            children: tree.filter((entry) => entry.parentId === child.id).length,
          }))}
          moveTargets={options}
          attachable={options.filter((option) => option.id !== id && !above.has(option.id) && !children.some((child) => child.id === option.id))}
          allOptions={options}
        />
      </PaneBody>,
    )
  }

  return shell(
    <CategoryGeneralForm
      key={id}
      category={{
        id,
        name: detail.name,
        parentId: node?.parentId ?? null,
        products: stats.products,
        averageDiscount: stats.averageDiscount,
        children: children.length,
        text: detail.text,
      }}
      parentOptions={options.filter((option) => option.id !== id && !below.has(option.id))}
      allOptions={options}
    />,
  )
}
