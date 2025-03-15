"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Transition } from "@headlessui/react"
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from "@/components/ui/menubar"
import { TransitionLink } from "../interface/TransitionLink"
import AdminLink from "./AdminLink"
import Auth from "./Auth"

export default function BurgerMenu({ email, user }: { email: string; user: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const userInfo = JSON.parse(user)

  const Links = [
    { label: "Головна", href: "/" },
    { label: "Каталог", href: "/catalog?page=1&sort=default" },
    { label: "Уподобані", href: `/liked/${userInfo?._id}` },
    { label: "Мої замовлення", href: "/myOrders" },
    { label: "Контакти", href: "/info/contacts" },
    { label: "Доставка та оплата", href: "/info/delivery-payment" },
    { label: "Гарантія та сервіси", href: "/info/warranty-services" },
    { label: "Презентації", href: "/info/presentations" },
  ]

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-white focus:outline-none relative w-6 h-6 z-50"
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        <span
          className={`block absolute h-0.5 w-6 bg-current transform transition duration-500 ease-in-out ${isOpen ? "rotate-45" : "-translate-y-2"}`}
        />
        <span
          className={`block absolute h-0.5 w-6 bg-current transform transition duration-500 ease-in-out ${isOpen ? "opacity-0" : "opacity-100"}`}
        />
        <span
          className={`block absolute h-0.5 w-6 bg-current transform transition duration-500 ease-in-out ${isOpen ? "-rotate-45" : "translate-y-2"}`}
        />
      </button>

      <Transition
        show={isOpen}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 -translate-y-full"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 -translate-y-full"
      >
        <div className="fixed inset-x-0 top-20 bottom-0 bg-[#006AA7] z-[9999]">
          <div className="h-full overflow-y-auto py-6 px-4 flex flex-col items-center">
            <nav className="flex flex-col items-center space-y-4 w-full">
              <AdminLink
                className="pt-2 hover:bg-transparent hover:text-[#FECC02]"
                linkDecoration="text-base-regular"
              />
              {Links.map(({ label, href }) => {
                const isActive = (pathname.includes(href) && href.length > 1) || pathname === href

                if (["Уподобані", "Мої замовлення"].includes(label) && !email) {
                  return null
                }

                if (label === "Інформація") {
                  return (
                    <Menubar key={label} className="border-0 p-0 w-full">
                      <MenubarMenu>
                        <MenubarTrigger className="w-full flex justify-center items-center text-white hover:text-[#FECC02] focus:text-[#FECC02]">
                          <span className={`text-center ${isActive ? "text-[#FECC02]" : ""}`}>{label}</span>
                        </MenubarTrigger>
                        <MenubarContent className="bg-[#005a8e] text-white border-0 rounded-xl shadow-md">
                          <MenubarItem>
                            <TransitionLink
                              href="/info/contacts"
                              title="Контакти"
                              className="block py-2 w-full text-center hover:text-[#FECC02] transition-colors"
                            >
                              Контакти
                            </TransitionLink>
                          </MenubarItem>
                          <MenubarItem>
                            <TransitionLink
                              href="/info/delivery-payment"
                              title="Доставка та оплата"
                              className="block py-2 w-full text-center hover:text-[#FECC02] transition-colors"
                            >
                              Доставка та оплата
                            </TransitionLink>
                          </MenubarItem>
                          <MenubarItem>
                            <TransitionLink
                              href="/info/warranty-services"
                              title="Гарантія та сервіси"
                              className="block py-2 w-full text-center hover:text-[#FECC02] transition-colors"
                            >
                              Гарантія та сервіси
                            </TransitionLink>
                          </MenubarItem>
                          <MenubarItem>
                            <TransitionLink
                              href="/info/presentations"
                              title="Презентації"
                              className="block py-2 w-full text-center hover:text-[#FECC02] transition-colors"
                            >
                              Презентації
                            </TransitionLink>
                          </MenubarItem>
                        </MenubarContent>
                      </MenubarMenu>
                    </Menubar>
                  )
                }

                return (
                  <TransitionLink
                    key={label}
                    href={href}
                    title={label}
                    className={`text-white hover:text-[#FECC02] transition-colors ${isActive ? "text-[#FECC02]" : ""} w-full text-center py-2`}
                    onClick={() => setIsOpen(false)}
                  >
                    {label}
                  </TransitionLink>
                )
              })}
            </nav>
            <div className="mt-6 w-full flex justify-center items-center">
              <div className="inline-block">
                <Auth email={email} user={user} />
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  )
}

