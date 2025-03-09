"use client"

import { useRef, useEffect } from "react"
import { motion, useAnimation, useInView } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { ChevronRight } from "lucide-react"

const categories = [
  {
    name: "Одяг",
    image: "/assets/1.jpg",
    href: "/catalog",
    subcategories: ["Жіночий одяг", "Чоловічий одяг", "Дитячий одяг"],
    featured: true,
  },
  {
    name: "Взуття",
    image: "/assets/2.jpg",
    href: "/catalog",
    subcategories: ["Дитяче", "Жіноче", "Чоловіче"],
    featured: false,
  },
  {
    name: "Продукти",
    image: "/assets/3.jpg",
    href: "/catalog",
    subcategories: ["Консерви", "Напої", "Солодощі"],
    featured: false,
  },
  {
    name: "Все для дому",
    image: "/assets/4.jpg",
    href: "/catalog",
    subcategories: ["Постільна білизна", "Декор", "Домашній тескстиль"],
    featured: true,
  },
]

export default function Categories() {
  const controls = useAnimation()
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 })

  useEffect(() => {
    if (isInView) {
      controls.start("visible")
    }
  }, [controls, isInView])

  return (
    <motion.section
      ref={sectionRef}
      className="w-full bg-[#f9fafb] py-20 relative overflow-hidden"
      initial="hidden"
      animate={controls}
      variants={{
        visible: { opacity: 1 },
        hidden: { opacity: 0 },
      }}
      transition={{ duration: 0.8 }}
    >
      {/* Refined background elements */}
      {/* <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <svg className="absolute top-0 left-0 w-full h-full opacity-5" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0,0 L100,0 L100,100 L0,100 Z" fill="none" stroke="#006AA7" strokeWidth="0.5" />
          <path d="M0,50 L100,50" stroke="#006AA7" strokeWidth="0.2" strokeDasharray="1,3" />
          <path d="M50,0 L50,100" stroke="#FECC02" strokeWidth="0.2" strokeDasharray="1,3" />
        </svg>
        <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-[#006AA7] opacity-5 blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-[#FECC02] opacity-5 blur-3xl"></div>
      </div> */}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10" id="categories">
        {/* <motion.div
          className="text-center mb-16"
          variants={{
            visible: { opacity: 1, y: 0 },
            hidden: { opacity: 0, y: 20 },
          }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block text-small-semibold text-[#006AA7] bg-[#006AA7]/10 px-4 py-1.5 rounded-full mb-3">
            Наш асортимент
          </span>
          <h2 className="text-heading2-bold text-[#1a202c] mb-4">Категорії товарів</h2>
          <p className="text-body-normal text-[#4a5568] max-w-2xl mx-auto">
            Знайдіть все необхідне для вашого комфорту та стилю у нашому ретельно підібраному асортименті
          </p>
        </motion.div> */}

        <div className="grid grid-cols-12 gap-6 lg:gap-8">
          {/* First featured category - spans 7 columns on large screens */}
          <motion.div
            className="col-span-12 lg:col-span-7 relative"
            variants={{
              visible: { opacity: 1, x: 0 },
              hidden: { opacity: 0, x: -30 },
            }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 h-full border border-[#e2e8f0]">
              <div className="flex flex-col lg:flex-row h-full">
                <div className="lg:w-3/5 relative">
                  <Link href={categories[0].href} className="block h-full">
                    <div className="relative h-72 lg:h-full overflow-hidden">
                      <Image
                        src={categories[0].image || "/placeholder.svg?height=500&width=400"}
                        alt={categories[0].name}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover transition-transform duration-700 ease-out hover:scale-105"
                        priority
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#006AA7]/80 via-[#006AA7]/40 to-transparent"></div>

                      <div className="absolute bottom-0 left-0 p-8">
                        <div className="flex items-center mb-3">
                          <div className="w-8 h-1 bg-[#FECC02] mr-3"></div>
                          <span className="text-small-semibold uppercase tracking-wider text-white opacity-90">
                            Категорія
                          </span>
                        </div>
                        <h3 className="text-heading2-bold text-white mb-2 drop-shadow-sm">{categories[0].name}</h3>
                      </div>
                    </div>
                  </Link>
                </div>

                <div className="lg:w-2/5 p-8 flex flex-col justify-center">
                  <div className="space-y-4 mb-6">
                    {categories[0].subcategories.map((subcategory, subIndex) => (
                      <Link
                        key={subIndex}
                        href={`${categories[0].href}`}
                        className="flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group"
                      >
                        <span className="w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300">
                          <ChevronRight className="w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100" />
                        </span>
                        <span>{subcategory}</span>
                      </Link>
                    ))}
                  </div>

                  <Link
                    href={categories[0].href}
                    className="text-base-semibold text-[#006AA7] hover:text-[#005a8e] transition-colors duration-300 inline-flex items-center"
                  >
                    <span>Переглянути всі</span>
                    <ChevronRight className="ml-1 w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Second category - spans 5 columns on large screens */}
          <motion.div
            className="col-span-12 lg:col-span-5 relative"
            variants={{
              visible: { opacity: 1, x: 0 },
              hidden: { opacity: 0, x: 30 },
            }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 h-full border border-[#e2e8f0]">
              <Link href={categories[1].href} className="block">
                <div className="relative h-56 overflow-hidden">
                  <Image
                    src={categories[1].image || "/placeholder.svg?height=500&width=400"}
                    alt={categories[1].name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 ease-out hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#006AA7]/90 via-[#006AA7]/50 to-transparent"></div>

                  <div className="absolute bottom-0 left-0 p-6">
                    <div className="flex items-center mb-2">
                      <div className="w-6 h-0.5 bg-[#FECC02] mr-2"></div>
                      <span className="text-subtle-semibold uppercase tracking-wider text-white opacity-90">
                        Категорія
                      </span>
                    </div>
                    <h3 className="text-heading3-bold text-white mb-1 drop-shadow-sm">{categories[1].name}</h3>
                  </div>
                </div>
              </Link>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-3">
                  {categories[1].subcategories.map((subcategory, subIndex) => (
                    <Link
                      key={subIndex}
                      href={`${categories[1].href}`}
                      className="flex items-center text-small-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group"
                    >
                      <span className="w-4 h-4 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-2 group-hover:border-[#006AA7] transition-colors duration-300">
                        <ChevronRight className="w-2 h-2 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100" />
                      </span>
                      <span>{subcategory}</span>
                    </Link>
                  ))}
                </div>

                <Link
                  href={categories[1].href}
                  className="text-small-semibold text-[#006AA7] hover:text-[#005a8e] transition-colors duration-300 inline-flex items-center mt-4"
                >
                  <span>Переглянути всі</span>
                  <ChevronRight className="ml-1 w-3 h-3" />
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Third category - spans 5 columns on large screens */}
          <motion.div
            className="col-span-12 lg:col-span-5 relative"
            variants={{
              visible: { opacity: 1, y: 0 },
              hidden: { opacity: 0, y: 30 },
            }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 h-full border border-[#e2e8f0]">
              <Link href={categories[2].href} className="block">
                <div className="relative h-56 overflow-hidden">
                  <Image
                    src={categories[2].image || "/placeholder.svg?height=500&width=400"}
                    alt={categories[2].name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 ease-out hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#006AA7]/90 via-[#006AA7]/50 to-transparent"></div>

                  <div className="absolute bottom-0 left-0 p-6">
                    <div className="flex items-center mb-2">
                      <div className="w-6 h-0.5 bg-[#FECC02] mr-2"></div>
                      <span className="text-subtle-semibold uppercase tracking-wider text-white opacity-90">
                        Категорія
                      </span>
                    </div>
                    <h3 className="text-heading3-bold text-white mb-1 drop-shadow-sm">{categories[2].name}</h3>
                  </div>
                </div>
              </Link>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-3">
                  {categories[2].subcategories.map((subcategory, subIndex) => (
                    <Link
                      key={subIndex}
                      href={`${categories[2].href}`}
                      className="flex items-center text-small-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group"
                    >
                      <span className="w-4 h-4 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-2 group-hover:border-[#006AA7] transition-colors duration-300">
                        <ChevronRight className="w-2 h-2 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100" />
                      </span>
                      <span>{subcategory}</span>
                    </Link>
                  ))}
                </div>

                <Link
                  href={categories[2].href}
                  className="text-small-semibold text-[#006AA7] hover:text-[#005a8e] transition-colors duration-300 inline-flex items-center mt-4"
                >
                  <span>Переглянути всі</span>
                  <ChevronRight className="ml-1 w-3 h-3" />
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Fourth featured category - spans 7 columns on large screens */}
          <motion.div
            className="col-span-12 lg:col-span-7 relative"
            variants={{
              visible: { opacity: 1, x: 0 },
              hidden: { opacity: 0, x: -30 },
            }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 h-full border border-[#e2e8f0]">
              <div className="flex flex-col lg:flex-row h-full">
                <div className="lg:w-2/5 p-8 flex flex-col justify-center order-2 lg:order-1">
                  <div className="space-y-4 mb-6">
                    {categories[3].subcategories.map((subcategory, subIndex) => (
                      <Link
                        key={subIndex}
                        href={`${categories[3].href}`}
                        className="flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group"
                      >
                        <span className="w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300">
                          <ChevronRight className="w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100" />
                        </span>
                        <span>{subcategory}</span>
                      </Link>
                    ))}
                  </div>

                  <Link
                    href={categories[3].href}
                    className="text-base-semibold text-[#006AA7] hover:text-[#005a8e] transition-colors duration-300 inline-flex items-center"
                  >
                    <span>Переглянути всі</span>
                    <ChevronRight className="ml-1 w-4 h-4" />
                  </Link>
                </div>

                <div className="lg:w-3/5 relative order-1 lg:order-2">
                  <Link href={categories[3].href} className="block h-full">
                    <div className="relative h-72 lg:h-full overflow-hidden">
                      <Image
                        src={categories[3].image || "/placeholder.svg?height=500&width=400"}
                        alt={categories[3].name}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover transition-transform duration-700 ease-out hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-l from-[#006AA7]/80 via-[#006AA7]/40 to-transparent"></div>

                      <div className="absolute bottom-0 right-0 p-8 text-right">
                        <div className="flex items-center justify-end mb-3">
                          <span className="text-small-semibold uppercase tracking-wider text-white opacity-90">
                            Категорія
                          </span>
                          <div className="w-8 h-1 bg-[#FECC02] ml-3"></div>
                        </div>
                        <h3 className="text-heading2-bold text-white mb-2 drop-shadow-sm">{categories[3].name}</h3>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="text-center mt-16"
          variants={{
            visible: { opacity: 1, y: 0 },
            hidden: { opacity: 0, y: 20 },
          }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Link
            href="/catalog?page=1&sort=default"
            className="inline-block text-base-semibold text-white bg-[#006AA7] hover:bg-[#005a8e] px-8 py-4 rounded-full transition-colors duration-300 shadow-sm"
          >
            <span className="flex items-center">
              Переглянути всі категорії
              <ChevronRight className="ml-2 w-4 h-4" />
            </span>
          </Link>
        </motion.div>
      </div>
    </motion.section>
  )
}

