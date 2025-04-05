import type React from "react"
import { Inter } from "next/font/google"
import "../globals.css"

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
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}

