"use client"

import { useEffect, useState } from "react"
import NextImage from "next/image"
import { X } from "lucide-react"

interface Product {
  id: string
  name: string
  image: string
}

interface PurchaseNotificationProps {
  products: Product[]
  minInterval?: number
  maxInterval?: number
  maxNotifications?: number
}

const preloadImages = (images: string[]) => {
  if (typeof window === "undefined") return
  images.forEach((src) => {
    const img = new Image()
    img.src = src
  })
}

const ukrainianNames = ["Олександр", "Сергій", "Андрій", "Микола", "Петро", "Іван", "Василь", "Юрій", "Володимир", "Тарас", "Олена", "Оксана", "Наталія", "Тетяна", "Ірина", "Марія", "Анна", "Катерина", "Софія"]
const ukrainianSurnames = ["Шевченко", "Коваленко", "Бондаренко", "Ткаченко", "Мельник", "Кравченко", "Олійник", "Шевчук", "Поліщук", "Бойко"]
const ukrainianLocations = ["Київська обл.", "Львівська обл.", "Харківська обл.", "Одеська обл.", "Дніпропетровська обл.", "Вінницька обл.", "Запорізька обл.", "Івано-Франківська обл."]

const getRandomInterval = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min)

export default function PurchaseNotification({
  products,
  minInterval = 3000,
  maxInterval = 10000,
  maxNotifications = 5,
}: PurchaseNotificationProps) {
  const [notifications, setNotifications] = useState<Array<{ id: string; name: string; surname?: string; location: string; product: Product; timestamp: number }>>([])

  // Get last notification timestamp from session storage
  const getLastNotificationTime = () => {
    if (typeof window !== "undefined") {
      return parseInt(sessionStorage.getItem("lastNotificationTime") || "0", 10)
    }
    return 0
  }

  // Save last notification timestamp to session storage
  const setLastNotificationTime = (timestamp: number) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("lastNotificationTime", timestamp.toString())
    }
  }

  const generateNotification = () => {
    if (!products.length) return null

    const product = products[Math.floor(Math.random() * products.length)]
    const name = ukrainianNames[Math.floor(Math.random() * ukrainianNames.length)]
    const location = ukrainianLocations[Math.floor(Math.random() * ukrainianLocations.length)]
    const includeSurname = Math.random() > 0.4
    const surname = includeSurname ? ukrainianSurnames[Math.floor(Math.random() * ukrainianSurnames.length)] : undefined

    return {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      surname,
      location,
      product,
      timestamp: Date.now(),
    }
  }

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))
  }

  const scheduleNextNotification = (delay: number) => {
    setTimeout(() => {
      let newNotifications = [generateNotification()].filter(Boolean) as any[]

      // 30% chance to show two pop-ups at the same time
      if (Math.random() < 0.3) {
        const secondNotification = generateNotification()
        if (secondNotification) newNotifications.push(secondNotification)
      }

      setNotifications((prev) => {
        const updated = [...newNotifications, ...prev].slice(0, maxNotifications)
        return updated
      })

      setLastNotificationTime(Date.now())

      scheduleNextNotification(getRandomInterval(minInterval, maxInterval))
    }, delay)
  }

  useEffect(() => {
    if (products.length) preloadImages(products.map((product) => product.image))
    if (!products.length) return

    const lastNotificationTime = getLastNotificationTime()
    const now = Date.now()
    const timeSinceLastNotification = now - lastNotificationTime

    const nextInterval = getRandomInterval(minInterval, maxInterval)
    const delay = timeSinceLastNotification < nextInterval ? nextInterval - timeSinceLastNotification : 0

    console.log(`Next notification in: ${delay}ms`)

    scheduleNextNotification(delay)

    const cleanupTimer = setInterval(() => {
      const eightSecondsAgo = Date.now() - 8000
      setNotifications((prev) => prev.filter((notification) => notification.timestamp > eightSecondsAgo))
    }, 1000)

    return () => clearInterval(cleanupTimer)
  }, [products, minInterval, maxInterval, maxNotifications])

  const femaleNames = new Set([
    "Олена", "Оксана", "Наталія", "Тетяна", "Ірина", "Марія", 
    "Анна", "Катерина", "Софія", "Юлія", "Валентина", "Людмила", "Світлана",
    "Алла", "Галина", "Зоя", "Лідія", "Ніна", "Роксолана"
  ])
  
  const maleNames = new Set([
    "Микита", "Ілля", "Саша", "Женя", "Леонід", "Анатолій", "Богдан"
  ])
  
  const isFemaleName = (name: string) => {
    if (femaleNames.has(name)) return true
    if (maleNames.has(name)) return false
  }
  
  if (!notifications.length) return null

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 max-w-[320px]">
      {notifications.map((notification) => (
        <div key={notification.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 flex items-center gap-3 animate-in slide-in-from-left duration-300 border border-gray-200 dark:border-gray-700">
          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md">
            <NextImage
              src={notification.product.image || "/placeholder.svg?height=48&width=48"}
              alt={notification.product.name}
              width={48}
              height={48}
              className="h-full w-full object-cover"
              priority={true}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {notification.name} {notification.surname && notification.surname}{" "}
              придбав{isFemaleName(notification.name) ? "ла" : ""} {notification.product.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{notification.location}</p>
          </div>
          <button onClick={() => removeNotification(notification.id)} className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400">
            <X className="h-4 w-4" />
            <span className="sr-only">Закрити</span>
          </button>
        </div>
      ))}
    </div>
  )
}
