import type { Metadata } from "next"
import Link from "next/link"
import { NordicCross } from "@/components/storefront/Logo"

export const metadata: Metadata = {
  title: "Сторінку не знайдено",
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <div className="shell flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <NordicCross className="h-10 w-16 text-brand-sun" />
      <h1 className="heading-display mt-6 text-2xl sm:text-4xl">Такої сторінки немає</h1>
      <p className="mt-3 max-w-md text-base leading-6 text-brand-muted">
        Можливо, товар уже розкупили або посилання застаріло. Спробуйте знайти потрібне через пошук чи каталог.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/catalog" className="btn-blue">
          Перейти до каталогу
        </Link>
        <Link href="/" className="btn-secondary">
          На головну
        </Link>
      </div>
    </div>
  )
}
