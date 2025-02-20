"use client"

import { useRef, useEffect } from "react"
import { motion, useAnimation, useInView } from "framer-motion"
import Link from "next/link"
import Image from "next/image"

const categories = [
  {
    name: "Одяг",
    image: "/assets/1.jpg",
    href: "/catalog?page=1&sort=default&categories=67ae0c905abd6535671c5cd2%2C67ae0c905abd6535671c5cd3%2C67ae0c905abd6535671c5cd4%2C67ae0c905abd6535671c5cd5%2C67ae0c905abd6535671c5cd7%2C67ae0c905abd6535671c5cd6%2C67ae0c905abd6535671c5cd8%2C67ae0c905abd6535671c5cd9%2C67ae0c905abd6535671c5cda%2C67ae0c905abd6535671c5cde%2C67ae0c905abd6535671c5cd0%2C67ae0c905abd6535671c5ccf%2C67ae0c905abd6535671c5ce2%2C67ae0c905abd6535671c5ce1%2C67ae0c905abd6535671c5ce6%2C67ae0c905abd6535671c5ce3%2C67ae0c905abd6535671c5ce4%2C67ae0c905abd6535671c5ce8%2C67ae0c905abd6535671c5ce9%2C67ae0c905abd6535671c5cea%2C67ae0c905abd6535671c5ce7%2C67ae0c905abd6535671c5ceb%2C67ae0c905abd6535671c5ced%2C67ae0c905abd6535671c5cdd%2C67ae0c905abd6535671c5cf1%2C67ae0c905abd6535671c5cf2%2C67ae0c905abd6535671c5cf3%2C67ae0c905abd6535671c5cf4%2C67ae0c905abd6535671c5cf5%2C67ae0c905abd6535671c5cf6%2C67ae0c905abd6535671c5cf8%2C67ae0c905abd6535671c5cf7%2C67ae0c905abd6535671c5cf9%2C67ae0c905abd6535671c5cfa%2C67ae0c905abd6535671c5cfc%2C67ae0c905abd6535671c5cfe%2C67ae0c905abd6535671c5cfd%2C67ae0c905abd6535671c5cfb%2C67ae0c905abd6535671c5cff%2C67ae0c905abd6535671c5d00%2C67ae0c905abd6535671c5d01%2C67ae0c905abd6535671c5d03%2C67ae0c905abd6535671c5d02%2C67ae0c905abd6535671c5d04%2C67ae0c905abd6535671c5d06%2C67ae0c905abd6535671c5d05%2C67ae0c905abd6535671c5d07%2C67ae0c905abd6535671c5d08%2C67ae0c905abd6535671c5d0a%2C67ae0c905abd6535671c5d09%2C67ae0c905abd6535671c5d0c%2C67ae0c905abd6535671c5d0b%2C67ae0c905abd6535671c5d0e%2C67ae0c905abd6535671c5d10%2C67ae0c905abd6535671c5d13%2C67ae0c905abd6535671c5d11%2C67ae0c905abd6535671c5d0f%2C67ae0c905abd6535671c5cf0%2C67ae0c905abd6535671c5cef%2C67ae0c905abd6535671c5d14%2C67ae0c905abd6535671c5d17%2C67ae0c905abd6535671c5d18%2C67ae0c905abd6535671c5d1a%2C67ae0c905abd6535671c5d19%2C67ae0c905abd6535671c5d1c%2C67ae0c905abd6535671c5d1b%2C67ae0c905abd6535671c5d16%2C67ae0c905abd6535671c5d15%2C67ae0c905abd6535671c5d20%2C67ae0c905abd6535671c5d1f%2C67ae0c905abd6535671c5d1e%2C67ae0c905abd6535671c5d1d%2C67ae0c905abd6535671c5d24%2C67ae0c905abd6535671c5d23%2C67ae0c905abd6535671c5d22%2C67ae0c905abd6535671c5d21%2C67ae0c905abd6535671c5d25%2C67ae0c905abd6535671c5d28%2C67ae0c905abd6535671c5d26%2C67ae0c905abd6535671c5d27%2C67ae0c905abd6535671c5d2c%2C67ae0c905abd6535671c5d2b%2C67ae0c905abd6535671c5d29%2C67ae0c905abd6535671c5d2d%2C67ae0c905abd6535671c5d2f%2C67ae0c905abd6535671c5d2e%2C67ae0c905abd6535671c5d34%2C67ae0c905abd6535671c5d32%2C67ae0c905abd6535671c5d33%2C67ae0c905abd6535671c5d35%2C67ae0c905abd6535671c5d36%2C67ae0c905abd6535671c5d37%2C67ae0c905abd6535671c5d38%2C67ae0c905abd6535671c5d3c%2C67ae0c905abd6535671c5d3d%2C67ae0c905abd6535671c5d3b%2C67ae0c905abd6535671c5d0d%2C67ae0c905abd6535671c5d12%2C67ae0c905abd6535671c5d3f%2C67ae0c905abd6535671c5d42%2C67ae0c905abd6535671c5d43%2C67ae0c905abd6535671c5d45%2C67ae0c905abd6535671c5d44%2C67ae0c905abd6535671c5d47%2C67ae0c905abd6535671c5d46%2C67ae0c905abd6535671c5d48%2C67ae0c905abd6535671c5d49%2C67ae0c905abd6535671c5d4a%2C67ae0c905abd6535671c5d4c%2C67ae0c905abd6535671c5d4b%2C67ae0c905abd6535671c5d50%2C67ae0c905abd6535671c5d4d%2C67ae0c905abd6535671c5d59%2C67ae0c905abd6535671c5d5a%2C67ae0c905abd6535671c5d61%2C67ae0c905abd6535671c5d63%2C67ae0c905abd6535671c5d5b%2C67ae0c905abd6535671c5d66%2C67ae0c905abd6535671c5d67%2C67ae0c905abd6535671c5d65%2C67ae0c905abd6535671c5d39%2C67ae0c905abd6535671c5d6e%2C67ae0c905abd6535671c5d64%2C67ae0c905abd6535671c5d6d%2C67ae0c905abd6535671c5d6f%2C67ae0c905abd6535671c5d70%2C67ae0c905abd6535671c5d74%2C67ae0c905abd6535671c5d71%2C67ae0c905abd6535671c5d3a%2C67ae0c905abd6535671c5d75%2C67ae0c905abd6535671c5d7b%2C67ae0c905abd6535671c5d7c%2C67ae0c905abd6535671c5d7e%2C67ae0c905abd6535671c5d7d%2C67ae0c905abd6535671c5d85%2C67ae0c905abd6535671c5d81%2C67ae0c905abd6535671c5d86%2C67ae0c905abd6535671c5d7f%2C67ae0c905abd6535671c5d82%2C67ae0c905abd6535671c5d80%2C67ae0c905abd6535671c5d8d%2C67ae0c905abd6535671c5d8c%2C67ae0c905abd6535671c5d8e%2C67ae0c905abd6535671c5d8b%2C67ae0c905abd6535671c5d92%2C67ae0c905abd6535671c5d91%2C67ae0c905abd6535671c5d8f%2C67ae0c905abd6535671c5d90%2C67ae0c905abd6535671c5d93%2C67ae0c905abd6535671c5d95%2C67ae0c905abd6535671c5d94%2C67ae0c905abd6535671c5d98%2C67ae0c905abd6535671c5d9b%2C67ae0c905abd6535671c5d99%2C67ae0c905abd6535671c5d9a%2C67ae0c905abd6535671c5d69%2C67ae0c905abd6535671c5d77%2C67b452796dab8c57b7c234ef%2C67b4a5e64ce83747a340aedf",
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
    subcategories: ["Постільна білизна", "Декор", "Віконний тескстиль"],
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
      className="w-full py-12 sm:py-16 md:py-24 bg-neutral-100"
      initial="hidden"
      animate={controls}
      variants={{
        visible: { opacity: 1, y: 0 },
        hidden: { opacity: 0, y: 20 },
      }}
      transition={{ duration: 0.8 }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8" id="categories">
        <motion.div
          className="text-center mb-8 sm:mb-12 md:mb-16"
          variants={{
            visible: { opacity: 1, y: 0 },
            hidden: { opacity: 0, y: 20 },
          }}
        >
          <h2 className="text-heading1-bold text-neutral-900 mb-4">Explore Our Categories</h2>
          <div className="w-16 sm:w-20 md:w-24 h-1 bg-neutral-900 mx-auto mb-4 sm:mb-6" />
          <p className="text-body-medium text-neutral-600 max-w-xl mx-auto">
            Discover our curated selection of Scandinavian-inspired products
          </p>
        </motion.div>

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
                <div className="relative aspect-[4/5] overflow-hidden rounded-lg">
                  <Image
                    src={category.image || "/placeholder.svg"}
                    alt={category.name}
                    layout="fill"
                    objectFit="cover"
                    className="transition-transform duration-700 ease-in-out group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 transition-opacity duration-300 group-hover:bg-opacity-60" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                    <h3 className="text-heading3-bold text-white text-center mb-2 sm:mb-4 transform transition-transform duration-300 group-hover:translate-y-[-10px]">
                      {category.name}
                    </h3>
                    <span className="text-small-semibold uppercase tracking-wider text-white border border-white px-3 py-1 sm:px-4 sm:py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Explore Now
                    </span>
                  </div>
                </div>
              </Link>
              <div className="mt-4 space-y-2">
                {category.subcategories.map((subcategory, subIndex) => (
                  <Link
                    key={subIndex}
                    href={`${category.href}/${subcategory.toLowerCase()}`}
                    className="block text-base-medium text-neutral-600 hover:text-neutral-900 transition-colors duration-300"
                  >
                    <span className="inline-block border-b border-transparent hover:border-neutral-900 pb-1">
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
            className="inline-block text-body-semibold text-neutral-900 hover:text-neutral-700 transition-colors duration-300 relative group"
          >
            <span className="relative z-10">View All Categories</span>
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-neutral-900 transform origin-left transition-all duration-300 group-hover:scale-x-100 scale-x-0"></span>
          </Link>
        </motion.div>
      </div>
    </motion.section>
  )
}

