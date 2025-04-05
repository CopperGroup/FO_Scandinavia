"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Smartphone, Tablet, Monitor, ArrowLeft, ArrowRight } from "lucide-react"

interface ScreenSizeControlsProps {
  onScreenSizeChange: (width: number) => void
}

const ScreenSizeControls: React.FC<ScreenSizeControlsProps> = ({ onScreenSizeChange }) => {
  const [activeSize, setActiveSize] = useState<string | null>(null)

  const handleSizeChange = (size: string, width: number) => {
    setActiveSize(size)
    onScreenSizeChange(width)
  }

  return (
    <div className="flex items-center justify-between mb-4 bg-gray-50 p-2 rounded border">
      <div className="text-sm text-gray-500">Screen Size:</div>
      <div className="flex items-center gap-2">
        <Button
          variant={activeSize === "mobile" ? "default" : "outline"}
          size="sm"
          onClick={() => handleSizeChange("mobile", 375)}
          title="Mobile (375px)"
        >
          <Smartphone className="h-4 w-4" />
        </Button>
        <Button
          variant={activeSize === "tablet" ? "default" : "outline"}
          size="sm"
          onClick={() => handleSizeChange("tablet", 768)}
          title="Tablet (768px)"
        >
          <Tablet className="h-4 w-4" />
        </Button>
        <Button
          variant={activeSize === "desktop" ? "default" : "outline"}
          size="sm"
          onClick={() => handleSizeChange("desktop", 1280)}
          title="Desktop (1280px)"
        >
          <Monitor className="h-4 w-4" />
        </Button>
        <Button
          variant={activeSize === "wide" ? "default" : "outline"}
          size="sm"
          onClick={() => handleSizeChange("wide", 1920)}
          title="Wide (1920px)"
        >
          <div className="flex items-center">
            <ArrowLeft className="h-3 w-3" />
            <Monitor className="h-4 w-4" />
            <ArrowRight className="h-3 w-3" />
          </div>
        </Button>
      </div>
    </div>
  )
}

export default ScreenSizeControls

