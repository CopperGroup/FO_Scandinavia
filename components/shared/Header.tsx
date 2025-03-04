"use client"

import { useRef } from "react"
import Link from "next/link"
import Auth from "./Auth"
import AdminLink from "./AdminLink"
import { TransitionLink } from "../interface/TransitionLink"
import { usePathname } from "next/navigation"
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar"
import BurgerMenu from "./BurgerMenu"
import { trackFacebookEvent } from "@/helpers/pixel"
import { Store } from "@/constants/store"

const Links = [
  { label: "Головна", href: "/" },
  { label: "Каталог", href: "/catalog?page=1&sort=default" },
  { label: "Уподобані", href: "/liked" },
  // { label: "Про нас", href: "/aboutUs"},
  { label: "Мої замовлення", href: "/myOrders" },
  { label: "Інформація", href: "/info" },
]

const infoNames = ["Контакти", "Доставка та оплата", "Гаратнія та сервіси"]

export default function Header({ email, user }: { email: string; user: string }) {
  const pathname = usePathname()
  const headerRef = useRef<HTMLElement>(null)
  const userInfo = JSON.parse(user)

  const handleLead = (label: string) => {
    trackFacebookEvent("Lead", {
      lead_type: label,
    })
  }

  return (
    <header ref={headerRef} className="w-full min-w-[320px] bg-black shadow-md border-b border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
        <div className="relative group">
          <Link href="/" className="w-fit flex gap-2 justify-center items-center">
            <p className="text-base-semibold text-white group-hover:text-yellow-400 transition-colors duration-300">
              {Store.name}
            </p>
          </Link>
        </div>

        <nav className="w-fit h-11 flex gap-2 justify-center items-center rounded-full bg-[#1f1f1f] border border-sky-800 px-2 max-lg:hidden shadow-md">
          <AdminLink />
          {Links.map(({ label, href }, index) => {
            const isActive = (pathname.includes(href) && href.length > 1) || pathname === href

            if (["Уподобані", "Мої замовлення"].includes(label)) {
              if (!email) return null

              return (
                <div key={label} className="relative group">
                  <div
                    className={`w-fit h-8 flex justify-center items-center rounded-full px-[0.885rem] transition-colors duration-300 ${
                      isActive ? "bg-yellow-600 text-white shadow-sm" : "text-neutral-400 hover:text-sky-500"
                    }`}
                  >
                    <TransitionLink
                      href={`${href}${label === "Уподобані" ? "/" + userInfo?._id : ""}`}
                      className="text-small-medium font-normal transition-colors duration-300"
                      onClick={() => handleLead(label)}
                    >
                      {label}
                    </TransitionLink>
                  </div>
                </div>
              )
            } else if (label === "Інформація") {
              return (
                <div key={label} className="relative group">
                  <Menubar className="h-8 border-0 p-0 space-x-0">
                    <MenubarMenu>
                      <MenubarTrigger
                        className={`w-fit h-8 flex justify-center items-center rounded-full cursor-pointer px-[0.885rem] transition-colors duration-300 ${
                          isActive ? "bg-yellow-600 text-white shadow-sm" : "text-neutral-400 hover:text-sky-500 "
                        }`}
                      >
                        <p className="text-small-medium font-normal transition-colors duration-300">{label}</p>
                      </MenubarTrigger>
                      <MenubarContent className="min-w-[9rem] bg-[#1f1f1f] text-neutral-400 border border-gray-800 rounded-lg shadow-md">
                        {["contacts", "delivery-payment", "warranty-services"].map((subItem, subIndex) => (
                          <MenubarItem
                            key={subItem}
                            className="text-small-medium font-normal cursor-pointer hover:text-white transition-colors duration-300"
                          >
                            <TransitionLink
                              href={`/info/${subItem}`}
                              onClick={() => handleLead(`/info/${subItem}`)}
                              className="block w-full px-2 py-1"
                            >
                              {infoNames[subIndex]
                                .split("-")
                                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(" ")}
                            </TransitionLink>
                          </MenubarItem>
                        ))}
                      </MenubarContent>
                    </MenubarMenu>
                  </Menubar>
                </div>
              )
            } else {
              return (
                <div key={label} className="relative group">
                  <div
                    className={`w-fit h-8 flex justify-center items-center rounded-full px-[0.885rem] transition-colors duration-300 ${
                      isActive ? "bg-yellow-600 text-white shadow-sm" : "text-neutral-400 hover:text-sky-500 "
                    }`}
                  >
                    <TransitionLink
                      href={href}
                      className="text-small-medium font-normal transition-colors duration-300"
                      onClick={() => handleLead(label)}
                    >
                      {label}
                    </TransitionLink>
                  </div>
                </div>
              )
            }
          })}
        </nav>

        <div className="w-fit flex justify-center items-center max-lg:hidden">
          <Auth email={email} user={user} />
        </div>

        <div className="w-fit h-8 hidden mt-1 max-lg:flex">
          <BurgerMenu email={email} user={user} />
        </div>
      </div>
    </header>
  )
}

