import type { Metadata } from "next"
import Link from "next/link"
import Breadcrumbs from "@/components/storefront/Breadcrumbs"
import { amountLabel, paragraphs } from "@/lib/content/schema"
import { getContent } from "@/lib/content/server"

export const metadata: Metadata = {
  title: "Доставка та оплата",
  description: "Як ми доставляємо замовлення по Україні та як можна оплатити покупку.",
  alternates: { canonical: "/info/delivery-payment" },
}

const sectionTitle = "heading-display text-xl"
const text = "mt-3 max-w-[68ch] text-base leading-6 text-brand-ink"
const row = "grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 py-4"

type Content = {
  freeDelivery: number
  deliveryIntro: string
  deliveryRows: { label: string; value: string }[]
  deliveryNote: string
  paymentMethods: { title: string; text: string }[]
}

/** The texts are edited in the admin: Сторінки → Доставка та оплата. */
export default async function DeliveryPaymentPage() {
  const content = await getContent<Content>("delivery")
  const rows = content.deliveryRows.filter((entry) => entry.label && entry.value)
  const methods = content.paymentMethods.filter((entry) => entry.title)

  return (
    <div className="shell pt-4 lg:pt-6">
      <Breadcrumbs crumbs={[{ label: "Доставка та оплата" }]} />
      <h1 className="heading-display mt-3 text-2xl sm:text-3xl">Доставка та оплата</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <section aria-labelledby="delivery">
          <h2 id="delivery" className={sectionTitle}>
            Доставка
          </h2>
          {paragraphs(content.deliveryIntro).map((paragraph) => (
            <p key={paragraph} className={text} data-edit="delivery:deliveryIntro">
              {paragraph}
            </p>
          ))}
          {(rows.length > 0 || content.freeDelivery > 0) && (
            <dl className="mt-5 max-w-[68ch] divide-y divide-brand-line border-y border-brand-line text-base">
              {rows.map((entry, index) => (
                <div key={entry.label} className={row} data-edit={`delivery:deliveryRows.${index}`}>
                  <dt className="text-brand-muted">{entry.label}</dt>
                  <dd>{entry.value}</dd>
                </div>
              ))}
              {content.freeDelivery > 0 && (
                <div className={row} data-edit="delivery:freeDelivery">
                  <dt className="text-brand-muted">Замовлення від {amountLabel(content.freeDelivery)}</dt>
                  <dd className="font-semibold">безкоштовно</dd>
                </div>
              )}
            </dl>
          )}
          {paragraphs(content.deliveryNote).map((paragraph) => (
            <p key={paragraph} className={text} data-edit="delivery:deliveryNote">
              {paragraph}
            </p>
          ))}
        </section>

        <section aria-labelledby="payment">
          <h2 id="payment" className={sectionTitle}>
            Оплата
          </h2>
          <dl className="mt-3 max-w-[68ch] divide-y divide-brand-line border-y border-brand-line text-base">
            {methods.map((method, index) => (
              <div key={method.title} className="py-4" data-edit={`delivery:paymentMethods.${index}`}>
                <dt className="font-semibold">{method.title}</dt>
                {method.text && <dd className="mt-1 whitespace-pre-line leading-6 text-brand-muted">{method.text}</dd>}
              </div>
            ))}
          </dl>
          <p className={text}>
            Залишилися запитання?{" "}
            <Link href="/info/contacts" className="link-quiet">
              Напишіть або зателефонуйте нам
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
