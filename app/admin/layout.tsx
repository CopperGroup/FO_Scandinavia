import type React from "react"
import type { Metadata } from "next"
import { preload } from "react-dom"
import "@/app/fonts.css"
import { PRELOAD_FONTS } from "@/lib/fonts"
import "../globals.css"
import { Toaster } from "sonner"
import { Store } from "@/constants/store"

export const metadata: Metadata = {
  title: {
    default: `Панель керування — ${Store.name}`,
    template: `%s — ${Store.name}`,
  },
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // The shop's own font files (app/fonts.css): Latin and Cyrillic are needed on every page.
  PRELOAD_FONTS.forEach((href) => preload(href, { as: "font", type: "font/woff2", crossOrigin: "anonymous" }))

  return (
    <html lang="uk" className="admin-root">
      <body className="bg-white font-sans text-sm text-neutral-900 antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
