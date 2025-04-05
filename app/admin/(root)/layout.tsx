import type React from "react"
import { Inter } from "next/font/google"
import { Toaster } from "react-hot-toast"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import Provider from "../../Provider"
import "../../globals.css"
import { AdminSidebar } from "@/components/shared/AdminSidebar"

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
    <Provider>
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-2 h-4" />
          </header>
          <main className="flex-1">{children}</main>
        </SidebarInset>
        <Toaster />
      </SidebarProvider>
    </Provider>
  )
}

