"use client"

import Link from "next/link"
import { Store } from "@/constants/store"
import { useEffect, useState } from "react"
import { transformPageDataInputs } from "@/lib/utils"

interface FooterProps {
  stringifiedData: string
}

const Footer = ({ stringifiedData }: FooterProps) => {
  const [is404, setIs404] = useState(false)
  const currentYear = new Date().getFullYear()

  // Transform the stringified data into a usable object
  const data = transformPageDataInputs(JSON.parse(stringifiedData).dataInputs)

  useEffect(() => {
    const meta404 = document.querySelector('meta[name="isNotFoundPage"]')?.getAttribute("content")
    setIs404(meta404 === "true")
  }, [])

  if (is404) return null

  return (
    <footer className="bg-[#006AA7] text-white z-40 pt-16 pb-8 w-full min-w-[320px]">
      <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <div className="w-full">
            <h3 className="text-heading4-medium font-semibold mb-4 text-[#FECC02]">Фіз. особам</h3>
            <ul className="space-y-3">
              <li>
                <Link href="info/contacts" className="text-white hover:text-[#FECC02] transition-colors duration-300">
                  Контакти
                </Link>
              </li>
            </ul>
          </div>

          <div className="w-full">
            <h3 className="text-heading4-medium font-semibold mb-4 text-[#FECC02]">Каталоги</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href={data["Каталог 'Продукти'"]}
                  className="hover:text-[#FECC02] transition-colors duration-300"
                  title="Каталог"
                >
                  Продукти
                </Link>
              </li>
              <li>
                <Link
                  href={data["Каталог 'Взуття'"]}
                  className="text-white hover:text-[#FECC02] transition-colors duration-300"
                  title="Каталог"
                >
                  Взуття
                </Link>
              </li>
              <li>
                <Link
                  href={data["Каталог 'Одяг'"]}
                  className="hover:text-[#FECC02] transition-colors duration-300"
                  title="Каталог"
                >
                  Одяг
                </Link>
              </li>
              <li>
                <Link
                  href={data["Каталог 'Все для дому'"]}
                  className="hover:text-[#FECC02] transition-colors duration-300"
                  title="Каталог"
                >
                  Все для дому
                </Link>
              </li>
            </ul>
          </div>

          <div className="w-full">
            <h3 className="text-heading4-medium font-semibold mb-4 text-[#FECC02]">Контакти</h3>
            <div className="space-y-3">
              <p className="flex items-center gap-2">
                <span className="font-medium">Телефон:</span> {data["'Телефон'"]}
              </p>
              <p className="flex items-center gap-2">
                <span className="font-medium">Email:</span> {data["'Email'"]}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-[#004d7a] pt-8 mt-8 w-full">
          <div className="flex flex-col lg:flex-row justify-between items-center">
            <p className="text-small-regular text-[#e0e0e0] mb-4 lg:mb-0 text-center lg:text-left">
              © {currentYear} <span className="font-semibold text-[#FECC02]">{Store.name}</span>. Всі права захищені.
            </p>
            <div className="flex flex-col items-center lg:items-end space-y-2 lg:space-y-0">
              <p className="text-xs text-[#e0e0e0] mt-1">Розроблено з ❤️ в Україні</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
