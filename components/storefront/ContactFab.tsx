"use client"

import { usePathname } from "next/navigation"
import { MessageCircle, Phone } from "lucide-react"
import { FaTelegramPlane, FaViber } from "react-icons/fa"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { trackFacebookEvent } from "@/helpers/pixel"

type Props = { phone: string; telegram: string; viber: string; hours: string }

const digits = (value: string) => value.replace(/[^+\d]/g, "")

function telegramHref(value: string): string {
  const handle = value.trim().replace(/^@/, "")
  return /^\+?\d[\d\s()-]+$/.test(handle) ? `https://t.me/${digits(handle).startsWith("+") ? digits(handle) : `+${digits(handle)}`}` : `https://t.me/${handle}`
}

/** Floating "write to us" button: most questions here are answered in a messenger. */
export default function ContactFab({ phone, telegram, viber, hours }: Props) {
  const pathname = usePathname()
  if (pathname.startsWith("/order")) return null

  const rowClass =
    "flex items-center gap-3 rounded-sm px-3 py-3 text-base font-medium text-brand-ink hover:bg-brand-mist focus-visible:outline-none focus-visible:bg-brand-mist"
  const track = (channel: string) => trackFacebookEvent("Contact", { channel })
  const onProductPage = /^\/catalog\/[^/]+/.test(pathname)

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Написати нам"
        className={`fixed right-4 z-30 flex h-12 min-w-12 items-center justify-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-white shadow-[0_6px_20px_-6px_rgba(0,74,122,0.7)] transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 lg:bottom-6 lg:right-6 min-[1880px]:px-5 ${
          onProductPage ? "max-lg:hidden" : "bottom-[calc(var(--bottom-bar)+1rem)]"
        }`}
      >
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only min-[1880px]:not-sr-only">Написати нам</span>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-72 rounded-md border-brand-line bg-white p-2 text-brand-ink">
        <p className="px-3 pb-2 pt-2 text-sm text-brand-muted">
          Відповімо на запитання про товар, розмір чи доставку{hours ? `. Працюємо з ${hours}` : ""}.
        </p>
        {telegram && (
          <a href={telegramHref(telegram)} target="_blank" rel="noopener noreferrer" onClick={() => track("telegram")} className={rowClass}>
            <FaTelegramPlane className="h-5 w-5 text-[#229ED9]" aria-hidden="true" />
            Telegram
          </a>
        )}
        {viber && (
          <a href={`viber://chat?number=${encodeURIComponent(digits(viber))}`} onClick={() => track("viber")} className={rowClass}>
            <FaViber className="h-5 w-5 text-[#7360F2]" aria-hidden="true" />
            Viber
          </a>
        )}
        {phone && (
          <a href={`tel:${digits(phone)}`} onClick={() => track("phone")} className={rowClass}>
            <Phone className="h-5 w-5 text-brand" aria-hidden="true" />
            <span className="tabular-nums">{phone}</span>
          </a>
        )}
      </PopoverContent>
    </Popover>
  )
}
