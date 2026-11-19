import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"
import { AdminPage, EmptyState, Pagination, Panel, SearchForm, Tabs, adminButton } from "@/components/admin/ui"
import { ListPosition } from "@/components/admin-components/ListPosition"
import { PromoKindFilter } from "@/components/admin-components/promo/PromoKindFilter"
import { PromoRewardsForm } from "@/components/admin-components/promo/PromoRewardsForm"
import { PromoTable } from "@/components/admin-components/promo/PromoTable"
import { listHref, parseChoice, parsePage, parseQuery } from "@/lib/admin/list"
import { formatAdminDateTime } from "@/lib/admin/status"
import { getSetting } from "@/lib/content/server"
import { PROMO_KINDS, PROMO_KIND_KEYS, PROMO_PAGE_SIZE, PROMO_TABS, PROMO_TAB_KEYS, listPromoCodes, type PromoKind, type PromoTab } from "@/lib/promo/admin"
import { PROMO_REWARDS_KEY } from "@/lib/promo/rules"
import { getPromoRewards } from "@/lib/promo/server"
import { formatPrice, plural } from "@/lib/storefront/format"

export const metadata: Metadata = { title: "Промокоди" }
export const dynamic = "force-dynamic"

type SearchParams = { view?: string; tab?: string; kind?: string; q?: string; page?: string }

const BASE = "/admin/promocodes"
const VIEWS = ["list", "rewards"] as const
const DEFAULTS = { view: "list", tab: "all", kind: "any" }

const KIND_HINT: Record<PromoKind, string> = {
  any: "Усі коди",
  shared: "Діють для всіх, хто знає код",
  personal: "Належать одному покупцеві",
}

/** What each empty tab means, when nothing is searched for. */
const EMPTY_TAB: Record<Exclude<PromoTab, "all">, { title: string; text: string }> = {
  active: { title: "Зараз не діє жоден код", text: "Тут будуть коди, якими покупці можуть скористатися сьогодні." },
  scheduled: { title: "Запланованих кодів немає", text: "Тут будуть коди з першим днем у майбутньому: до нього їх не можна застосувати." },
  used: { title: "Використаних кодів немає", text: "Тут будуть коди, якими вже скористалися стільки разів, скільки дозволено." },
  ended: { title: "Прострочених кодів немає", text: "Тут будуть коди, у яких минув останній день, а покупець так ними й не скористався." },
  off: { title: "Вимкнених кодів немає", text: "Тут будуть коди, які ви вимкнули вручну. Їх можна ввімкнути знову." },
}

const codesWord = (count: number) => plural(count, ["промокод", "промокоди", "промокодів"])

async function RewardsView() {
  const [rewards, setting] = await Promise.all([getPromoRewards(), getSetting(PROMO_REWARDS_KEY).catch(() => null)])
  const changed = setting?.updatedAt ? [formatAdminDateTime(setting.updatedAt), setting.updatedBy].filter(Boolean).join(", ") : ""
  return <PromoRewardsForm initial={rewards} changed={changed} />
}

const Page = async ({ searchParams }: { searchParams: SearchParams }) => {
  const view = parseChoice(searchParams.view, VIEWS, "list")
  const tab = parseChoice(searchParams.tab, PROMO_TAB_KEYS, "all")
  const kind = parseChoice(searchParams.kind, PROMO_KIND_KEYS, "any")
  const query = parseQuery(searchParams.q)

  const viewTabs = (
    <Tabs
      label="Розділи промокодів"
      items={[
        { key: "list", label: "Промокоди", href: BASE, active: view === "list", tip: "Коди, які ви створили, і особисті коди покупців" },
        {
          key: "rewards",
          label: "Автоматичні промокоди",
          href: listHref(BASE, { view: "rewards" }, {}, DEFAULTS),
          active: view === "rewards",
          tip: "Коди, які магазин видає сам: за реєстрацію і за відгук",
        },
      ]}
    />
  )

  if (view === "rewards") {
    return (
      <AdminPage title="Промокоди" description="Знижки, які магазин дає покупцям сам: за реєстрацію і за відгук про куплений товар.">
        {viewTabs}
        <RewardsView />
      </AdminPage>
    )
  }

  const { rows, total, page, pageCount, counts } = await listPromoCodes({ tab, kind, query, page: parsePage(searchParams.page) })

  const current = { view, tab, kind, q: query, page: String(page) }
  const href = (changes: Record<string, string | undefined>) => listHref(BASE, current, changes, DEFAULTS)
  const keep = { tab: tab === "all" ? undefined : tab, kind: kind === "any" ? undefined : kind, q: query || undefined }

  const kindLabel = kind === "shared" ? "Спільних" : kind === "personal" ? "Особистих" : ""
  const description = query
    ? `Знайдено за запитом «${query}»: ${formatPrice(counts.all)}`
    : counts.all === 0
      ? kindLabel
        ? `${kindLabel} промокодів немає`
        : "Промокодів ще немає"
      : kindLabel
        ? `${kindLabel}: ${formatPrice(counts.all)}, з них діють зараз: ${formatPrice(counts.active)}`
        : `${formatPrice(counts.all)} ${codesWord(counts.all)}, з них діють зараз: ${formatPrice(counts.active)}`

  let empty: React.ReactNode = null
  if (rows.length === 0) {
    if (query) {
      empty = (
        <EmptyState
          title="Нічого не знайдено"
          text={`Немає кодів за запитом «${query}»${tab !== "all" ? " у цій вкладці" : ""}. Спробуйте частину коду, ім’я покупця, адресу e-mail або останні цифри телефону.`}
          action={
            <Link href={href({ q: undefined, page: "1" })} className={adminButton.secondary}>
              Скинути пошук
            </Link>
          }
        />
      )
    } else if (counts.all === 0 && kind === "any") {
      empty = (
        <EmptyState
          title="Промокодів ще немає"
          text="Промокод дає покупцю знижку на замовлення: для акції в соцмережах, розсилки чи подарунка одному покупцю."
          action={
            <Link href={`${BASE}/new`} className={adminButton.primary}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Створити промокод
            </Link>
          }
        />
      )
    } else if (counts.all === 0) {
      empty = (
        <EmptyState
          title={kind === "shared" ? "Спільних кодів немає" : "Особистих кодів немає"}
          text={kind === "shared" ? "Спільний код діє для всіх, хто його знає. Створіть такий для акції." : "Особисті коди належать одному покупцеві: магазин видає їх за реєстрацію і відгук, або ви — вручну."}
          action={
            <Link href={href({ kind: "any", page: "1" })} className={adminButton.secondary}>
              Показати всі коди
            </Link>
          }
        />
      )
    } else {
      const words = tab !== "all" ? EMPTY_TAB[tab] : { title: "Нічого немає", text: "" }
      empty = (
        <EmptyState
          title={words.title}
          text={words.text}
          action={
            <Link href={href({ tab: "all", page: "1" })} className={adminButton.secondary}>
              Показати всі коди
            </Link>
          }
        />
      )
    }
  }

  return (
    <AdminPage
      title="Промокоди"
      description={description}
      actions={
        <>
          <SearchForm action={BASE} defaultValue={query} placeholder="Код, ім’я, e-mail або телефон" label="Пошук промокодів" hidden={{ ...keep, q: undefined }} />
          <Link href={`${BASE}/new`} className={adminButton.primary}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Створити промокод
          </Link>
        </>
      }
    >
      {viewTabs}

      <Panel padded={false}>
        {/* The filter sits beside the tabs where both fit in full, under them otherwise. */}
        <div className="flex flex-col gap-3 px-4 pt-3 xl:flex-row xl:items-end xl:justify-between xl:gap-4">
          <div className="min-w-0 xl:flex-1">
            <Tabs
              label="Стан промокодів"
              items={PROMO_TABS.map((entry) => ({
                key: entry.key,
                label: entry.label,
                tip: entry.tip,
                count: counts[entry.key],
                href: href({ tab: entry.key, page: "1" }),
                active: entry.key === tab,
              }))}
            />
          </div>
          <div className="xl:pb-2">
            <PromoKindFilter
              value={kind}
              options={PROMO_KINDS.map((entry) => ({ value: entry.key, label: entry.label, hint: KIND_HINT[entry.key], href: href({ kind: entry.key, page: "1" }) }))}
            />
          </div>
        </div>

        {empty ? (
          <div className="p-4">{empty}</div>
        ) : (
          <>
            <div className="px-4 pt-3">
              <ListPosition page={page} pageSize={PROMO_PAGE_SIZE} total={total} pageCount={pageCount} />
            </div>
            <PromoTable rows={rows} key={`${tab}|${kind}|${query}|${page}`} />
          </>
        )}

        {!empty && pageCount > 1 && (
          <div className="border-t border-neutral-200 px-4 py-3">
            <Pagination page={page} pageCount={pageCount} total={total} pageSize={PROMO_PAGE_SIZE} hrefFor={(next) => href({ page: String(next) })} jump={{ action: BASE, hidden: keep }} />
          </div>
        )}
      </Panel>
    </AdminPage>
  )
}

export default Page
