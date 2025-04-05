"use client"

import type React from "react"
import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { ParsedElement } from "@/types/editor"

interface BorderEditorProps {
  element: ParsedElement
  updateElement: (element: ParsedElement) => void
  currentClasses: string[]
}

const BorderEditor: React.FC<BorderEditorProps> = ({ element, updateElement, currentClasses }) => {
  // Local state for border values
  const [borderWidth, setBorderWidth] = useState("")
  const [borderRadius, setBorderRadius] = useState("")

  // Add border width to style
  const handleBorderWidthStyleChange = (value: string) => {
    const updatedElement = {
      ...element,
      style: {
        ...(element.style || {}),
        borderWidth: value,
      },
    }
    updateElement(updatedElement)
  }

  // Handlers for border radius changes
  const handleBorderRadiusChange = (value: string) => {
    setBorderRadius(value)
    const newClasses = currentClasses.filter((c) => !c.startsWith("rounded"))
    if (value !== "") {
      newClasses.push(`rounded-${value}`)
    }
    updateElement({ ...element, className: newClasses.join(" ") })
  }

  // Preset border radius options
  const radiusOptions = [
    { label: "None", value: "" },
    { label: "SM", value: "sm" },
    { label: "MD", value: "md" },
    { label: "LG", value: "lg" },
    { label: "XL", value: "xl" },
    { label: "Full", value: "full" },
  ]

  return (
    <Card className="border border-gray-100 shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-700">Border Width</Label>
          <Input
            type="text"
            placeholder="e.g., 1px, 2px"
            value={element.style?.borderWidth || ""}
            onChange={(e) => handleBorderWidthStyleChange(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-700">Border Radius</Label>
          <div className="grid grid-cols-3 gap-2">
            {radiusOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={currentClasses.includes(`rounded-${option.value}`) ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => handleBorderRadiusChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default BorderEditor

