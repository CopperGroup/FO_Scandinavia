import Link from "next/link"
import { Store } from "@/constants/store"
import { paragraphs } from "@/lib/content/schema"
import { getContent } from "@/lib/content/server"
import { getNavigation } from "@/lib/storefront/navigation"
import { getStoreContacts } from "@/lib/storefront/session"
import Logo, { NordicCross } from "./Logo"
import { NEW_HREF, SALE_HREF, departmentHref } from "./types"

const linkClass = "text-base text-white/85 hover:text-brand-sun focus-visible:outline-none focus-visible:underline"

export default async function SiteFooter() {
  const [navigation, { phone, email, hours }, content] = await Promise.all([getNavigation(), getStoreContacts(), getContent<{ about: string; tagline: string }>("footer")])

  return (
    <footer className="mt-16 bg-brand-navy text-white lg:mt-24">
      <div className="h-1 bg-brand-sun" aria-hidden="true" />

      <div className="shell grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr] lg:py-16">
        <div>
          <Logo />
          {paragraphs(content.about).map((paragraph, index) => (
            <p key={paragraph} data-edit="footer:about" className={`${index === 0 ? "mt-5" : "mt-3"} max-w-xs text-base leading-6 text-white/85`}>
              {paragraph}
            </p>
          ))}
        </div>

        <nav aria-label="Відділи">
          <h2 className="text-sm font-semibold text-brand-sun">Каталог</h2>
          <ul className="mt-4 space-y-3">
            {navigation.departments.map((department) => (
              <li key={department.key}>
                <Link href={departmentHref(department.key)} className={linkClass}>
                  {department.label}
                </Link>
              </li>
            ))}
            {navigation.showNew && (
              <li>
                <Link href={NEW_HREF} className={linkClass}>
                  Новинки
                </Link>
              </li>
            )}
            {navigation.showSale && navigation.saleCount > 0 && (
              <li>
                <Link href={SALE_HREF} className={linkClass}>
                  Знижки
                </Link>
              </li>
            )}
          </ul>
        </nav>

        <nav aria-label="Покупцям">
          <h2 className="text-sm font-semibold text-brand-sun">Покупцям</h2>
          <ul className="mt-4 space-y-3">
            <li>
              <Link href="/info/delivery-payment" className={linkClass}>
                Доставка та оплата
              </Link>
            </li>
            <li>
              <Link href="/info/warranty-services" className={linkClass}>
                Обмін і повернення
              </Link>
            </li>
            <li>
              <Link href="/info/contacts" className={linkClass}>
                Контакти
              </Link>
            </li>
            <li>
              <Link href="/info/public-offer" className={linkClass}>
                Публічна оферта
              </Link>
            </li>
            <li>
              <Link href="/info/conf-policy" className={linkClass}>
                Політика конфіденційності
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold text-brand-sun">Зв’язатися з нами</h2>
          <ul className="mt-4 space-y-3">
            {phone && (
              <li>
                <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="font-display text-xl font-semibold tracking-[-0.02em] text-white hover:text-brand-sun focus-visible:outline-none focus-visible:underline">
                  {phone}
                </a>
              </li>
            )}
            {hours && <li className="text-base text-white/85">Працюємо з {hours}</li>}
            {email && (
              <li>
                <a href={`mailto:${email}`} className={linkClass}>
                  {email}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/20">
        <div className="shell flex flex-col gap-2 py-5 text-sm text-white/75 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {Store.name}
          </p>
          {content.tagline && (
            <p className="flex items-center gap-2" data-edit="footer:tagline">
              <NordicCross className="h-3 w-5 text-brand-sun" />
              {content.tagline}
            </p>
          )}
        </div>
      </div>
    </footer>
  )
}
