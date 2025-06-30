import type React from "react"
import { Inter } from "next/font/google"
import "../globals.css"
import { Toaster } from "sonner"

export const metadata = {
  title: "Admin Dashboard",
  description: "Admin dashboard for your application",
}

const inter = Inter({ subsets: ["latin"] })

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uk">
      <body className={inter.className}>
        {children}
        <Toaster/>
      </body>
    </html>
  )
}

