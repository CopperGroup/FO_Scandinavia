"use client"

import { useRef, useEffect } from "react"
import { motion, useAnimation, useInView } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { ChevronRight } from "lucide-react"
import { transformPageDataInputs } from "@/lib/utils"

export default function Categories({ stringifiedData }: { stringifiedData: string }) {
  const data = transformPageDataInputs(JSON.parse(stringifiedData).dataInputs)
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
      className="w-full bg-gradient-to-b from-white to-[#f9fafb] py-20 relative overflow-hidden -mt-28"
      initial="hidden"
      animate={controls}
      variants={{
        visible: { opacity: 1 },
        hidden: { opacity: 0 },
      }}
      transition={{ duration: 0.8 }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10" id="categories">

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
                  <Link href={data["Продукти"]} className="block h-full">
                    <div className="relative h-72 lg:h-full overflow-hidden">
                      <Image
                        src="/assets/3.jpg"
                        alt="Продукти"
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
                        <h3 className="text-heading2-bold text-white mb-2 drop-shadow-sm">Продукти</h3>
                      </div>
                    </div>
                  </Link>
                </div>

                <div className="lg:w-2/5 p-8 flex flex-col justify-center">
                  <div className="space-y-4 mb-6">
                    <Link
                      href={data["Консерви"]}
                      className="flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group"
                    >
                      <span className="w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300">
                        <ChevronRight className="w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100" />
                      </span>
                      <span>Консерви</span>
                    </Link>
                    <Link
                      href={data["Напої"]}
                      className="flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group"
                    >
                      <span className="w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300">
                        <ChevronRight className="w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100" />
                      </span>
                      <span>Напої</span>
                    </Link>
                    <Link
                      href={data["Солодощі"]}
                      className="flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group"
                    >
                      <span className="w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300">
                        <ChevronRight className="w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100" />
                      </span>
                      <span>Солодощі</span>
                    </Link>
                  </div>

                  <Link
                    href={data["Продукти"]}
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
              <Link href={data["Взуття"]} className="block">
                <div className="relative h-56 overflow-hidden">
                  <Image
                    src="/assets/2.jpg"
                    alt="Взуття"
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
                    <h3 className="text-heading3-bold text-white mb-1 drop-shadow-sm">Взуття</h3>
                  </div>
                </div>
              </Link>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href={data["Дитяче"]}
                    className="flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group"
                  >
                    <span className="w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300">
                      <ChevronRight className="w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100" />
                    </span>
                    <span>Дитяче</span>
                  </Link>
                  <Link
                    href={data["Жіноче"]}
                    className="flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group"
                  >
                    <span className="w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300">
                      <ChevronRight className="w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100" />
                    </span>
                    <span>Жіноче</span>
                  </Link>
                  <Link
                    href={data["Чоловіче"]}
                    className="flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group"
                  >
                    <span className="w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300">
                      <ChevronRight className="w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100" />
                    </span>
                    <span>Чоловіче</span>
                  </Link>
                </div>

                <Link
                  href={data["Взуття"]}
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
              <Link href={data["Одяг"]} className="block">
                <div className="relative h-56 overflow-hidden">
                  <Image
                    src="/assets/1.jpg"
                    alt="Одяг"
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
                    <h3 className="text-heading3-bold text-white mb-1 drop-shadow-sm">Одяг</h3>
                  </div>
                </div>
              </Link>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href={data["Жіночий одяг"]}
                    className="flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group"
                  >
                    <span className="w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300">
                      <ChevronRight className="w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100" />
                    </span>
                    <span>Жіночий одяг</span>
                  </Link>
                  <Link
                    href={data["Чоловічий одяг"]}
                    className="flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group"
                  >
                    <span className="w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300">
                      <ChevronRight className="w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100" />
                    </span>
                    <span>Чоловічий одяг</span>
                  </Link>
                  <Link
                    href={data["Дитячий одяг"]}
                    className="flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group"
                  >
                    <span className="w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300">
                      <ChevronRight className="w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100" />
                    </span>
                    <span>Дитячий одяг</span>
                  </Link>
                </div>

                <Link
                  href={data["Одяг"]}
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
                    <Link
                      href={data["Постільна білизна"]}
                      className="flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group"
                    >
                      <span className="w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300">
                        <ChevronRight className="w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100" />
                      </span>
                      <span>Постільна білизна</span>
                    </Link>
                    <Link
                      href={data["Декор"]}
                      className="flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group"
                    >
                      <span className="w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300">
                        <ChevronRight className="w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100" />
                      </span>
                      <span>Декор</span>
                    </Link>
                    <Link
                      href={data["Домашній текстиль"]}
                      className="flex items-center text-base-medium text-[#4a5568] hover:text-[#006AA7] transition-colors duration-300 group"
                    >
                      <span className="w-5 h-5 rounded-full border border-[#e2e8f0] flex items-center justify-center mr-3 group-hover:border-[#006AA7] transition-colors duration-300">
                        <ChevronRight className="w-3 h-3 text-[#FECC02] opacity-0 transform transition-all duration-300 group-hover:opacity-100" />
                      </span>
                      <span>Домашній текстиль</span>
                    </Link>
                  </div>

                  <Link
                    href={data["Все для дому"]}
                    className="text-base-semibold text-[#006AA7] hover:text-[#005a8e] transition-colors duration-300 inline-flex items-center"
                  >
                    <span>Переглянути всі</span>
                    <ChevronRight className="ml-1 w-4 h-4" />
                  </Link>
                </div>

                <div className="lg:w-3/5 relative order-1 lg:order-2">
                  <Link href={data["Все для дому"]} className="block h-full">
                    <div className="relative h-72 lg:h-full overflow-hidden">
                      <Image
                        src="/assets/4.jpg"
                        alt="Все для дому"
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
                        <h3 className="text-heading2-bold text-white mb-2 drop-shadow-sm">Все для дому</h3>
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
            title="Каталог"
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

