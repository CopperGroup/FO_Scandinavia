"use client"

import { useRef, useEffect } from "react"
import { motion, useAnimation, useInView } from "framer-motion"
import Link from "next/link"
import Image from "next/image"

const categories = [
  {
    name: "Одяг",
    image: "/assets/1.jpg",
    href: "/catalog/clothing",
    subcategories: ["Жіночий одяг", "Чоловічий одяг", "Дитячий одяг"],
  },
  {
    name: "Взуття",
    image: "/assets/1.jpg",
    href: "/catalog/bottoms",
    subcategories: ["Дитяче", "Жіноче", "Чоловіче"],
  },
  {
    name: "Продукти",
    image: "/assets/1.jpg",
    href: "/catalog/outerwear",
    subcategories: ["Консерви", "Напої", "Солодощі"],
  },
  {
    name: "Все для дому",
    image: "/assets/1.jpg",
    href: "/catalog/accessories",
    subcategories: ["Постільна білизна", "Декор", "Домашній тескстиль"],
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
      className="w-full bg-white"
      initial="hidden"
      animate={controls}
      variants={{
        visible: { opacity: 1, y: 0 },
        hidden: { opacity: 0, y: 20 },
      }}
      transition={{ duration: 0.8 }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12" id="categories">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 md:gap-10">
          {categories.map((category, index) => (
            <motion.div
              key={category.name}
              variants={{
                visible: { opacity: 1, y: 0 },
                hidden: { opacity: 0, y: 50 },
              }}
              transition={{ duration: 0.6, delay: 0.1 * index }}
              className="relative group"
            >
              <Link href={category.href} className="block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-lg border-2 border-gray-200 group-hover:border-sky-500 transition-colors duration-300 shadow-sm">
                  <Image
                    src={category.image || "/placeholder.svg?height=500&width=400"}
                    alt={category.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    className="object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-white bg-opacity-10 transition-opacity duration-300 group-hover:bg-opacity-20" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                    <h3 className="text-2xl font-bold text-gray-800 text-center mb-2 sm:mb-4 transform transition-transform duration-300 group-hover:translate-y-[-10px] bg-white bg-opacity-80 px-4 py-2 rounded-md">
                      {category.name}
                    </h3>
                    <span className="text-sm font-semibold uppercase tracking-wider text-gray-800 bg-yellow-400 px-3 py-1 sm:px-4 sm:py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md">
                      Explore Now
                    </span>
                  </div>
                </div>
              </Link>
              <div className="mt-4 space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                {category.subcategories.map((subcategory, subIndex) => (
                  <Link
                    key={subIndex}
                    href={`${category.href}/${subcategory.toLowerCase().replace(/\s+/g, "-")}`}
                    className="block text-gray-600 hover:text-sky-600 transition-colors duration-300"
                  >
                    <span className="inline-block border-b border-transparent hover:border-sky-600 pb-1">
                      {subcategory}
                    </span>
                  </Link>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="text-center mt-10 sm:mt-14 md:mt-20"
          variants={{
            visible: { opacity: 1, y: 0 },
            hidden: { opacity: 0, y: 20 },
          }}
        >
          <Link
            href="/catalog?page=1&sort=default"
            className="inline-block font-semibold text-yellow-600 hover:text-yellow-700 transition-colors duration-300 relative group px-6 py-3 border-2 border-yellow-600 hover:border-yellow-700 rounded-md"
          >
            <span className="relative z-10">View All Categories</span>
          </Link>
        </motion.div>
      </div>
    </motion.section>
  )
}

