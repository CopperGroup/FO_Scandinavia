import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import Breadcrumbs from "@/components/storefront/Breadcrumbs"
import CopyCode from "@/components/storefront/CopyCode"
import type { CustomerPromo } from "@/lib/promo"
import { formatPromoDay, getMyPromoCodes, promoDaysLabel, promoUsesLabel } from "@/lib/storefront/promo"

export const metadata: Metadata = {
  title: "Мої промокоди",
  robots: { index: false, follow: false },
}

/** Days before the end when the card starts counting them down. */
const ENDS_SOON_DAYS = 7

function ActiveCode({ promo }: { promo: CustomerPromo }) {
  const endsSoon = promo.daysLeft <= ENDS_SOON_DAYS
  return (
    <li className="rounded-md border border-brand-line bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="heading-display text-3xl tabular-nums">−{promo.percent}%</p>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${endsSoon ? "bg-brand-sale-tint text-brand-sale" : "bg-brand-ok-tint text-brand-ok"}`}>
          {endsSoon ? promoDaysLabel(promo.daysLeft) : "діє"}
        </span>
      </div>
      <p className="mt-2 text-sm text-brand-muted">
        Знижка {promoUsesLabel(promo.usesLeft)}.{promo.lastDay ? ` Діє по ${formatPromoDay(promo.lastDay)} включно.` : ""}
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <p className="flex min-h-11 min-w-0 flex-1 select-all items-center break-all rounded-md border border-dashed border-brand-ink/40 bg-brand-mist px-4 py-2 font-mono text-base font-semibold text-brand-ink">
          {promo.code}
        </p>
        <CopyCode code={promo.code} className="w-full sm:w-auto" />
      </div>
    </li>
  )
}

function pastNote(promo: CustomerPromo): string {
  if (promo.state === "used") return "Використано"
  return promo.lastDay ? `Термін дії минув ${formatPromoDay(promo.lastDay)}` : "Більше не діє"
}

const Page = async () => {
  const codes = await getMyPromoCodes()
  if (!codes) redirect("/login")

  const active = codes.filter((promo) => promo.state === "active")
  const past = codes.filter((promo) => promo.state !== "active")

  return (
    <div className="shell pt-4 lg:pt-6">
      <Breadcrumbs crumbs={[{ label: "Мої промокоди" }]} />
      <h1 className="heading-display mt-3 text-2xl sm:text-3xl">Мої промокоди</h1>
      <p className="mt-2 max-w-2xl text-base text-brand-muted">
        Під час оформлення замовлення введіть код у полі «Промокод» або оберіть його під цим полем, і знижка одразу з’явиться в сумі до сплати. Коди особисті:
        вони діють лише у вашому акаунті.
      </p>

      {active.length > 0 ? (
        <ul className="mt-6 grid gap-4 lg:grid-cols-2">
          {active.map((promo) => (
            <ActiveCode key={promo.code} promo={promo} />
          ))}
        </ul>
      ) : (
        <div className="mt-6 rounded-md bg-brand-mist px-6 py-12 text-center">
          <h2 className="heading-display text-xl">Зараз чинних промокодів немає</h2>
          <p className="mx-auto mt-2 max-w-sm text-base text-brand-muted">Коли ми надішлемо вам новий код, він з’явиться на цій сторінці.</p>
          <Link href="/catalog" className="btn-blue mt-6">
            Перейти до каталогу
          </Link>
        </div>
      )}

      {past.length > 0 && (
        <section aria-labelledby="past-codes" className="mt-10">
          <h2 id="past-codes" className="heading-display text-xl">
            Використані та завершені
          </h2>
          <ul className="mt-4 divide-y divide-brand-line border-y border-brand-line">
            {past.map((promo) => (
              <li key={promo.code} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <p className="min-w-0 break-all font-mono text-sm text-brand-muted">{promo.code}</p>
                <p className="shrink-0 text-sm text-brand-muted">
                  {promo.percent !== null && <span className="font-semibold tabular-nums text-brand-ink">−{promo.percent}%</span>}
                  {promo.percent !== null && " "}
                  {pastNote(promo)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export default Page
