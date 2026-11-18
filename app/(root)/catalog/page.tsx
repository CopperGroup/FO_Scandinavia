import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import ProductCard from "@/components/cards/ProductCard"
import PaginationForCatalog from "@/components/shared/PaginationForCatalog"
import Breadcrumbs, { type Crumb } from "@/components/storefront/Breadcrumbs"
import AutoScrollRow from "@/components/storefront/catalog/AutoScrollRow"
import { CatalogLink, CatalogProvider, RESULTS_ID, ResultsRegion } from "@/components/storefront/catalog/CatalogContext"
import { CatalogToolbar, FilterSidebar, type AppliedChip, type FilterData } from "@/components/storefront/catalog/CatalogFilters"
import { NO_BRAND, brandHref } from "@/lib/brands"
import { isSizeParamName } from "@/lib/catalog/attributes"
import type { NavCategory, NavDepartment } from "@/lib/catalog/departments"
import { queryCatalog } from "@/lib/catalog/server/service"
import {
  catalogHref,
  flattenParams,
  parseSelectParams,
  parseUnitParams,
  serializeSelectParams,
  serializeUnitParams,
  splitList,
  type RawSearchParams,
} from "@/lib/storefront/catalog-url"
import { countLabel, formatPrice, PRODUCT_FORMS } from "@/lib/storefront/format"
import { findDepartment, getBrandPages, getNavigation, toCard, type StoreNavigation } from "@/lib/storefront/navigation"
import { getCurrentUser } from "@/lib/storefront/session"
import JsonLd from "@/components/seo/JsonLd"
import { absoluteUrl, breadcrumbJsonLd, catalogCanonical, departmentSearchName, listingTitle } from "@/lib/seo"

const MAX_FACET_VALUES = 40
const MAX_FACETS_IN_CATEGORY = 12
const MAX_FACETS_IN_DEPARTMENT = 5

type Scope = {
  params: Record<string, string>
  department: NavDepartment | undefined
  categoryIds: string[]
  category: NavCategory | undefined
  /** Group of the department whose categories are exactly the selected ones ("Жінкам → Взуття"). */
  group: NavDepartment["groups"][number] | undefined
  /** The one brand the whole catalog is narrowed to ("/catalog?vendor=Ellos"): the page of that brand. */
  brand: string | undefined
  heading: string
}

function resolveScope(navigation: StoreNavigation, raw: RawSearchParams): Scope {
  const params = flattenParams(raw)
  const categoryIds = splitList(params.categories, ",")

  const known = new Map<string, NavCategory>()
  for (const department of navigation.departments) {
    for (const group of department.groups) for (const category of group.categories) known.set(category.id, category)
  }
  for (const category of navigation.other) known.set(category.id, category)

  const department =
    findDepartment(navigation, params.department) ??
    (categoryIds.length > 0 ? findDepartment(navigation, navigation.departmentsByCategory[categoryIds[0]]?.[0]) : undefined)

  const category = categoryIds.length === 1 ? known.get(categoryIds[0]) : undefined
  const selected = new Set(categoryIds)
  const group =
    categoryIds.length > 1
      ? department?.groups.find((entry) => entry.categories.length === selected.size && entry.categories.every((item) => selected.has(item.id)))
      : undefined

  const vendors = splitList(params.vendor, ",")
  const brand = !department && categoryIds.length === 0 && !params.search && vendors.length === 1 && vendors[0] !== NO_BRAND ? vendors[0] : undefined

  let heading = "Каталог"
  if (category) heading = category.name
  else if (group && department) heading = `${department.label}: ${group.label.toLowerCase()}`
  else if (department) heading = department.title
  else if (brand) heading = brand
  else if (params.search) heading = "Результати пошуку"
  else if (params.sale === "1") heading = "Знижки"
  else if (params.sort === "new") heading = "Новинки"

  return { params, department, categoryIds, category, group, brand, heading }
}

/**
 * The address a department or a category is indexed under. A category belongs to its first department,
 * whichever department it was opened from, so "?categories=X" and "?department=shoes&categories=X" are one page to a search engine.
 */
function canonicalPath(navigation: StoreNavigation, scope: Scope): string {
  if (scope.brand) return brandHref(scope.brand)
  if (scope.category) return catalogCanonical({ departmentKey: navigation.departmentsByCategory[scope.category.id]?.[0], categoryIds: [scope.category.id] })
  if (scope.group && scope.department) return catalogCanonical({ departmentKey: scope.department.key, categoryIds: scope.group.categories.map((entry) => entry.id) })
  return catalogCanonical({ departmentKey: scope.department?.key, categoryIds: [] })
}

export async function generateMetadata({ searchParams }: { searchParams: RawSearchParams }): Promise<Metadata> {
  const navigation = await getNavigation()
  const scope = resolveScope(navigation, searchParams)
  // Plain department and category pages are worth indexing; filtered and searched views are not.
  const { department: _department, categories: _categories, page: pageParam, ...rest } = scope.params
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1)
  // A brand has a page of its own when the brand is all the address asks for and it has enough products.
  const brandPage = scope.brand && Object.keys(rest).join() === "vendor" ? (await getBrandPages()).find((entry) => entry.name === scope.brand) : undefined
  const plain = brandPage ? true : Object.keys(rest).length === 0 && Boolean(scope.department || scope.category)
  const indexable = plain && page === 1

  // The heading on the page stays short ("Жінкам"); the title says what the page sells.
  const listed = scope.category ? scope.category.name : scope.group ? scope.heading : scope.department ? departmentSearchName(scope.department) : scope.heading
  const groups = scope.department && !scope.category && !scope.group ? scope.department.groups.map((group) => group.label.toLowerCase()).join(", ") : ""

  return {
    title: scope.params.search ? `Пошук: ${scope.params.search}` : plain ? listingTitle(listed, page) : scope.heading,
    description: scope.category
      ? `${scope.category.name} зі Скандинавії: ${scope.category.count} в наявності. Доставка Новою поштою по Україні.`
      : brandPage
        ? `${brandPage.name}: ${countLabel(brandPage.count, PRODUCT_FORMS)} зі Скандинавії в наявності. Доставка Новою поштою по Україні.`
      : groups
        ? `${listed}: ${groups}. Доставка Новою поштою по Україні.`
        : undefined,
    alternates: indexable ? { canonical: canonicalPath(navigation, scope) } : undefined,
    robots: { index: indexable, follow: true },
  }
}

function appliedChips(params: Record<string, string>): AppliedChip[] {
  const chips: AppliedChip[] = []
  if (params.search) chips.push({ label: `«${params.search}»`, href: catalogHref(params, { search: null }) })

  const sizes = splitList(params.size, "__")
  for (const size of sizes) {
    chips.push({ label: `Розмір ${size}`, href: catalogHref(params, { size: sizes.filter((entry) => entry !== size).join("__") }) })
  }

  const vendors = splitList(params.vendor, ",")
  for (const vendor of vendors) {
    chips.push({ label: vendor, href: catalogHref(params, { vendor: vendors.filter((entry) => entry !== vendor).join(",") }) })
  }

  if (params.minPrice || params.maxPrice) {
    const from = params.minPrice ? `від ${formatPrice(Number(params.minPrice))}` : ""
    const to = params.maxPrice ? `до ${formatPrice(Number(params.maxPrice))}` : ""
    chips.push({ label: `Ціна ${[from, to].filter(Boolean).join(" ")} ₴`, href: catalogHref(params, { minPrice: null, maxPrice: null }) })
  }

  if (params.sale === "1") chips.push({ label: "Зі знижкою", href: catalogHref(params, { sale: null }) })

  const selectState = parseSelectParams(params.selectParams)
  for (const [name, values] of Object.entries(selectState)) {
    for (const value of values) {
      const next = { ...selectState, [name]: values.filter((entry) => entry !== value) }
      chips.push({ label: `${name}: ${value}`, href: catalogHref(params, { selectParams: serializeSelectParams(next) }) })
    }
  }

  const unitState = parseUnitParams(params.unitParams)
  for (const [name, range] of Object.entries(unitState)) {
    const { [name]: _removed, ...next } = unitState
    chips.push({ label: `${name}: ${range.min}–${range.max}`, href: catalogHref(params, { unitParams: serializeUnitParams(next) }) })
  }

  return chips
}

const Catalog = async ({ searchParams }: { searchParams: RawSearchParams }) => {
  const [navigation, user] = await Promise.all([getNavigation(), getCurrentUser()])
  const scope = resolveScope(navigation, searchParams)
  const { params, department, category, categoryIds } = scope

  // A department without a narrower choice means "every category of the department".
  const effective: RawSearchParams = { ...searchParams }
  if (department && categoryIds.length === 0) effective.categories = department.categoryIds.join(",")

  const catalog = await queryCatalog(effective)
  const likedIds = new Set(user?.likedIds ?? [])
  const { items, total, page, pageCount, facets, counts } = catalog

  const vendorFiltered = Boolean(params.vendor)
  const filterData: FilterData = {
    // Facet order is kept while filtering and recomputed only when the shopper moves elsewhere.
    scopeKey: [department?.key ?? "", categoryIds.join(","), params.search ?? ""].join("|"),
    sizes: facets.sizes,
    vendors: facets.vendors
      .map((name) => ({ name, count: vendorFiltered ? null : counts.vendorsCount[name] ?? 0 }))
      .filter((vendor) => vendor.count !== 0)
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0) || a.name.localeCompare(b.name, "uk")),
    priceMin: facets.minPrice,
    priceMax: facets.maxPrice,
    selectParams: Object.entries(facets.selectParams)
      .filter(([name, facet]) => !isSizeParamName(name) && facet.values.length > 1 && facet.values.length <= MAX_FACET_VALUES)
      .map(([name, facet]) => ({
        name,
        coverage: facet.values.reduce((sum, entry) => sum + entry.valueTotalProducts, 0),
        values: facet.values.map((entry) => ({ value: entry.value, count: entry.valueTotalProducts })),
      }))
      // Attributes most products have come first; rare ones would only clutter the panel.
      .sort((a, b) => b.coverage - a.coverage || a.name.localeCompare(b.name, "uk"))
      .slice(0, category ? MAX_FACETS_IN_CATEGORY : MAX_FACETS_IN_DEPARTMENT)
      .map(({ name, values }) => ({ name, values })),
    unitParams: Object.entries(facets.unitParams)
      .filter(([, facet]) => facet.max > facet.min)
      .map(([name, facet]) => ({ name, min: facet.min, max: facet.max })),
    saleAvailable: navigation.saleCount > 0,
    categoryGroups: department
      ? department.groups.map((group) => ({
          label: department.groups.length > 1 ? group.label : null,
          items: group.categories.map((entry) => ({
            id: entry.id,
            label: entry.name,
            count: entry.count,
            active: category?.id === entry.id,
            href: catalogHref(params, { department: department.key, categories: entry.id }),
          })),
        }))
      : [
          {
            label: null,
            items: [
              ...navigation.departments.map((entry) => ({
                id: entry.key,
                label: entry.label,
                count: entry.count,
                active: false,
                href: catalogHref(params, { department: entry.key, categories: null }),
              })),
              ...navigation.other.map((entry) => ({
                id: entry.id,
                label: entry.name,
                count: entry.count,
                active: category?.id === entry.id,
                href: catalogHref(params, { categories: entry.id }),
              })),
            ],
          },
        ],
    categoryResetHref: categoryIds.length > 0 ? catalogHref(params, { categories: null }) : department ? catalogHref(params, { department: null }) : null,
  }

  const crumbs: Crumb[] = [{ label: "Каталог", href: "/catalog" }]
  if (department) crumbs.push({ label: department.label, href: `/catalog?department=${department.key}` })
  if (category) crumbs.push({ label: category.name })
  else if (scope.group) crumbs.push({ label: scope.group.label })
  else if (scope.brand) crumbs.push({ label: scope.brand })
  if (crumbs.length > 0) delete crumbs[crumbs.length - 1].href

  // The brand in the heading is not repeated as a filter chip under it.
  const chips = appliedChips(params).filter((chip) => !(scope.brand && chip.label === scope.brand))

  // The owner's text about the department or the category: on its own page only, not on filtered views or further pages.
  const unfiltered = Object.keys(params).every((key) => key === "department" || key === "categories")
  const about = unfiltered && page === 1 ? (category ? category.text : !scope.group && department ? department.text : "") : ""
  const aboutParagraphs = about.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)
  const resetHref = catalogHref(params, { search: null, size: null, vendor: null, minPrice: null, maxPrice: null, sale: null, selectParams: null, unitParams: null })

  // Shortcuts beside the heading: the categories of the department, or the departments themselves.
  const shortcuts: { id: string; label: string; href: string; image: string | null; active: boolean }[] = department
    ? department.groups
        .flatMap((group) => group.categories)
        .map((entry) => ({
          id: entry.id,
          label: entry.name,
          image: entry.image ?? null,
          active: category?.id === entry.id,
          href: catalogHref(params, { department: department.key, categories: category?.id === entry.id ? null : entry.id }),
        }))
    : navigation.departments.map((entry) => ({
        id: entry.key,
        label: entry.label,
        image: null,
        active: false,
        href: catalogHref(params, { department: entry.key, categories: null }),
      }))

  return (
    <CatalogProvider>
      {(department || category || scope.brand) && <JsonLd data={breadcrumbJsonLd(crumbs, absoluteUrl(canonicalPath(navigation, scope)))} />}
      <div className="shell pt-4 lg:pt-5">
        <Breadcrumbs crumbs={crumbs} />

        {/*
          Heading and shortcuts share one row on desktop. The heading sits over the
          filter column and the shortcuts over the product grid: same columns, same gap.
        */}
        <header className="mt-3 lg:mt-4 lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:items-center lg:gap-10 xl:grid-cols-[270px_minmax(0,1fr)] xl:gap-14">
          <div className="min-w-0">
            <h1 className="heading-display break-words text-2xl sm:text-3xl lg:text-3xl">{scope.heading}</h1>
            {params.search && <p className="mt-2 break-words text-sm text-brand-muted">за запитом «{params.search}»</p>}
          </div>

          {shortcuts.length > 1 && (
            <AutoScrollRow
              label={department ? "Категорії відділу" : "Відділи"}
              className="-mx-4 mt-4 min-w-0 sm:-mx-6 lg:mx-0 lg:mt-0"
              scrollerClassName="px-4 sm:px-6 lg:px-0"
            >
              {shortcuts.map((entry) => (
                <li key={entry.id} className="shrink-0">
                  <CatalogLink
                    href={entry.href}
                    draggable={false}
                    aria-current={entry.active ? "true" : undefined}
                    className={
                      "inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 " +
                      (entry.image ? "pl-2 pr-4 " : "px-4 ") +
                      (entry.active ? "border-brand bg-brand text-white" : "border-brand-line bg-white text-brand-ink hover:border-brand-ink")
                    }
                  >
                    {entry.image && (
                      <Image src={entry.image} alt="" width={32} height={32} draggable={false} className="h-8 w-8 shrink-0 rounded-full bg-white object-contain" />
                    )}
                    {entry.label}
                  </CatalogLink>
                </li>
              ))}
            </AutoScrollRow>
          )}
        </header>

        <div className="mt-3 lg:mt-4 lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start lg:gap-10 xl:grid-cols-[270px_minmax(0,1fr)] xl:gap-14">
          <FilterSidebar data={filterData} resetHref={resetHref} />

          <div id={RESULTS_ID} className="min-w-0">
            <CatalogToolbar data={filterData} total={total} chips={chips} resetHref={resetHref} />

            <ResultsRegion className="min-h-[60vh]">
              <p className="mt-3 text-sm tabular-nums text-brand-muted lg:hidden">{countLabel(total, PRODUCT_FORMS)}</p>

              {items.length > 0 ? (
                <>
                  <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 lg:mt-5 lg:gap-x-5 lg:gap-y-10 xl:grid-cols-4">
                    {items.map(({ listing, targetId, targeted }, index) => (
                      <li key={listing.key} className="min-w-0">
                        <ProductCard
                          card={toCard(listing, { id: targetId, targeted })}
                          email={user?.email}
                          liked={listing.variants.some((variant) => likedIds.has(variant.id))}
                          priority={index < 4}
                        />
                      </li>
                    ))}
                  </ul>

                  <div className="mt-12">
                    <PaginationForCatalog page={page} pageCount={pageCount} searchParams={searchParams} />
                  </div>

                  {aboutParagraphs.length > 0 && (
                    <section
                      aria-label={category ? "Про цю категорію" : "Про цей відділ"}
                      className="mt-12 max-w-[42rem] space-y-4 border-t border-brand-line pt-8 text-base leading-6 text-brand-muted"
                    >
                      {aboutParagraphs.map((paragraph, index) => (
                        <p key={index} className="whitespace-pre-line break-words">
                          {paragraph}
                        </p>
                      ))}
                    </section>
                  )}
                </>
              ) : (
                <div className="mt-5 rounded-md bg-brand-mist px-6 py-14 text-center">
                  <h2 className="heading-display text-xl">Нічого не знайшлося</h2>
                  <p className="mx-auto mt-3 max-w-md text-base leading-6 text-brand-muted">
                    {params.search
                      ? "Перевірте написання або спробуйте назву бренду чи артикул. Фільтри теж можуть звужувати результат."
                      : "За цими фільтрами зараз немає товарів у наявності. Приберіть частину умов."}
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    {chips.length > 0 && (
                      <CatalogLink href={resetHref} className="btn-blue h-11">
                        Скинути фільтри
                      </CatalogLink>
                    )}
                    <Link href="/catalog" className="btn-secondary h-11">
                      Увесь каталог
                    </Link>
                  </div>
                </div>
              )}
            </ResultsRegion>
          </div>
        </div>
      </div>
    </CatalogProvider>
  )
}

export default Catalog
