import type React from "react"
import type { Metadata } from "next"
import { Golos_Text, Unbounded } from "next/font/google"
import "../globals.css"
import { Toaster } from "sonner"
import { Store } from "@/constants/store"

// The same faces as the shop: a Cyrillic-first text face and a display face for headings.
const textFont = Golos_Text({ subsets: ["latin", "cyrillic"], display: "swap", variable: "--font-text" })
const displayFont = Unbounded({ subsets: ["latin", "cyrillic"], weight: ["500", "600"], display: "swap", variable: "--font-display" })

export const metadata: Metadata = {
  title: {
    default: `Панель керування — ${Store.name}`,
    template: `%s — ${Store.name}`,
  },
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={`admin-root ${textFont.variable} ${displayFont.variable}`}>
      <body className="bg-white font-sans text-sm text-neutral-900 antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
