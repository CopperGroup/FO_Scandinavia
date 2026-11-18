import type { Metadata } from "next"
import { Clock, Mail, MapPin, Phone } from "lucide-react"
import { FaTelegramPlane, FaViber } from "react-icons/fa"
import Breadcrumbs from "@/components/storefront/Breadcrumbs"
import { getStoreContacts } from "@/lib/storefront/session"

export const metadata: Metadata = {
  title: "Контакти",
  description: "Телефон, месенджери та e-mail магазину.",
  alternates: { canonical: "/info/contacts" },
}

const digits = (value: string) => value.replace(/[^+\d]/g, "")

export default async function ContactsPage() {
  const { phone, email, hours, telegram, viber, address } = await getStoreContacts()

  const handle = telegram.replace(/^@/, "")
  const telegramHref = /^\+?\d[\d\s()-]+$/.test(handle)
    ? `https://t.me/${digits(handle).startsWith("+") ? digits(handle) : `+${digits(handle)}`}`
    : `https://t.me/${handle}`

  const rowClass = "flex items-center gap-4 py-5"
  const linkClass = "text-lg font-semibold text-brand-ink hover:text-brand focus-visible:outline-none focus-visible:underline"

  return (
    <div className="shell pt-4 lg:pt-6">
      <Breadcrumbs crumbs={[{ label: "Контакти" }]} />
      <h1 className="heading-display mt-3 text-2xl sm:text-3xl">Контакти</h1>
      <p className="mt-3 max-w-[60ch] text-base leading-6 text-brand-muted">
        Виникли питання? Найшвидше відповідаємо в месенджерах.
      </p>

      <ul className="mt-6 max-w-xl divide-y divide-brand-line border-y border-brand-line">
        {telegram && (
          <li className={rowClass}>
            <FaTelegramPlane className="h-6 w-6 shrink-0 text-[#229ED9]" aria-hidden="true" />
            <div>
              <p className="text-sm text-brand-muted">Telegram</p>
              <a href={telegramHref} target="_blank" rel="noopener noreferrer" className={linkClass}>
                Написати в Telegram
              </a>
            </div>
          </li>
        )}
        {viber && (
          <li className={rowClass}>
            <FaViber className="h-6 w-6 shrink-0 text-[#7360F2]" aria-hidden="true" />
            <div>
              <p className="text-sm text-brand-muted">Viber</p>
              <a href={`viber://chat?number=${encodeURIComponent(digits(viber))}`} className={`${linkClass} tabular-nums`}>
                {viber}
              </a>
            </div>
          </li>
        )}
        {phone && (
          <li className={rowClass}>
            <Phone className="h-6 w-6 shrink-0 text-brand" aria-hidden="true" />
            <div>
              <p className="text-sm text-brand-muted">Телефон</p>
              <a href={`tel:${digits(phone)}`} className={`${linkClass} tabular-nums`}>
                {phone}
              </a>
            </div>
          </li>
        )}
        {email && (
          <li className={rowClass}>
            <Mail className="h-6 w-6 shrink-0 text-brand" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm text-brand-muted">E-mail</p>
              <a href={`mailto:${email}`} className={`${linkClass} break-all`}>
                {email}
              </a>
            </div>
          </li>
        )}
        {hours && (
          <li className={rowClass}>
            <Clock className="h-6 w-6 shrink-0 text-brand" aria-hidden="true" />
            <div>
              <p className="text-sm text-brand-muted">Працюємо з</p>
              <p className="text-lg font-semibold tabular-nums text-brand-ink">{hours}</p>
            </div>
          </li>
        )}
        {address && (
          <li className={rowClass}>
            <MapPin className="h-6 w-6 shrink-0 text-brand" aria-hidden="true" />
            <div>
              <p className="text-sm text-brand-muted">Адреса</p>
              <p className="text-lg font-semibold text-brand-ink">{address}</p>
            </div>
          </li>
        )}
      </ul>
    </div>
  )
}
