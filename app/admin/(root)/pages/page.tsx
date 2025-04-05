"use client"

import { useState, useEffect } from "react"
import { Home, Users } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useRouter } from "next/navigation"

export default function Page() {
  const router = useRouter()
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  // Calculate gradient positions with different coefficients for each icon
  // Home icon - faster horizontal movement, slower vertical
  const homeGradientX = Math.round(mousePosition.x * 150)
  const homeGradientY = Math.round(mousePosition.y * 70)

  // Contacts icon - slower horizontal movement, faster vertical, with offset
  const contactsGradientX = Math.round(mousePosition.x * 70 + 30)
  const contactsGradientY = Math.round(mousePosition.y * 130)

  // Define separate gradient IDs for each icon
  const homeGradientId = "home-copper-gradient"
  const contactsGradientId = "contacts-copper-gradient"

  const handleCardClick = (pageName: string) => {
    router.push(`/admin/pages/${pageName}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pt-16">
      {/* SVG Gradient Definitions - Separate for each icon */}
      <svg width="0" height="0" className="absolute">
        <defs>
          {/* Home icon gradient */}
          <linearGradient id={homeGradientId} x1={`${homeGradientX}%`} y1={`${homeGradientY}%`} x2="100%" y2="100%">
            <stop offset="0%" stopColor="#b87333" /> {/* Dark copper */}
            <stop offset="50%" stopColor="#d4a76a" /> {/* Medium copper */}
            <stop offset="100%" stopColor="#e6c19c" /> {/* Light copper/gold */}
          </linearGradient>

          {/* Contacts icon gradient */}
          <linearGradient
            id={contactsGradientId}
            x1={`${contactsGradientX}%`}
            y1={`${contactsGradientY}%`}
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#b87333" /> {/* Dark copper */}
            <stop offset="50%" stopColor="#d4a76a" /> {/* Medium copper */}
            <stop offset="100%" stopColor="#e6c19c" /> {/* Light copper/gold */}
          </linearGradient>
        </defs>
      </svg>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Home Card */}
        <div className="relative group">
          <Card
            className="h-48 flex flex-col items-center justify-center transition-all duration-300 group-hover:border-2 group-hover:border-blue-500 cursor-pointer"
            onClick={() => handleCardClick("Home")}
          >
            <Home className="h-16 w-16 mb-2" style={{ stroke: `url(#${homeGradientId})`, strokeWidth: 1.5 }} />
            <span className="text-lg font-medium">Home</span>
          </Card>
          <div className="absolute top-0 left-0 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-center -mt-8">
            <span className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm font-medium">Click to edit</span>
          </div>
        </div>

        {/* Contacts Card */}
        <div className="relative group">
          <Card
            className="h-48 flex flex-col items-center justify-center transition-all duration-300 group-hover:border-2 group-hover:border-blue-500 cursor-pointer"
            onClick={() => handleCardClick("Contacts")}
          >
            <Users className="h-16 w-16 mb-2" style={{ stroke: `url(#${contactsGradientId})`, strokeWidth: 1.5 }} />
            <span className="text-lg font-medium">Contacts</span>
          </Card>
          <div className="absolute top-0 left-0 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-center -mt-8">
            <span className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm font-medium">Click to edit</span>
          </div>
        </div>
      </div>
    </div>
  )
}

