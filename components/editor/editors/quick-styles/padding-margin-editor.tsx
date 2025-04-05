"use client"

import type React from "react"
import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import type { ParsedElement } from "@/types/editor"

interface PaddingMarginEditorProps {
  element: ParsedElement
  updateElement: (element: ParsedElement) => void
  currentClasses: string[]
}

const PaddingMarginEditor: React.FC<PaddingMarginEditorProps> = ({ element, updateElement, currentClasses }) => {
  // Local state for input values
  const [paddingValues, setPaddingValues] = useState({
    pt: getPaddingValue("pt"),
    pr: getPaddingValue("pr"),
    pb: getPaddingValue("pb"),
    pl: getPaddingValue("pl"),
  })

  const [marginValues, setMarginValues] = useState({
    mt: getMarginValue("mt"),
    mr: getMarginValue("mr"),
    mb: getMarginValue("mb"),
    ml: getMarginValue("ml"),
  })

  // Padding and Margin Helpers
  function getPaddingValue(side: string) {
    if (!currentClasses || !Array.isArray(currentClasses)) return ""

    const paddingClass = currentClasses.find((c) => c.startsWith(`${side}-`))
    if (!paddingClass) return ""

    // Handle arbitrary values with brackets
    if (paddingClass.includes("[") && paddingClass.includes("]")) {
      const match = paddingClass.match(/\[(.*?)\]/)
      return match ? match[1] : ""
    }

    return paddingClass.split("-")[1]
  }

  function getMarginValue(side: string) {
    if (!currentClasses || !Array.isArray(currentClasses)) return ""

    const marginClass = currentClasses.find((c) => c.startsWith(`${side}-`))
    if (!marginClass) return ""

    // Handle arbitrary values with brackets
    if (marginClass.includes("[") && marginClass.includes("]")) {
      const match = marginClass.match(/\[(.*?)\]/)
      return match ? match[1] : ""
    }

    return marginClass.split("-")[1]
  }

  function handlePaddingChange(side: string, value: string) {
    // Update local state immediately for responsive UI
    setPaddingValues((prev) => ({
      ...prev,
      [side]: value,
    }))
  }

  function handleMarginChange(side: string, value: string) {
    // Update local state immediately for responsive UI
    setMarginValues((prev) => ({
      ...prev,
      [side]: value,
    }))
  }

  function applyPaddingChange(side: string, value: string) {
    const newClasses = currentClasses.filter((c) => !c.startsWith(`${side}-`))

    if (value !== "") {
      // Check if value has units (px, rem, etc.)
      if (value.includes("px") || value.includes("rem") || value.includes("em") || value.includes("%")) {
        newClasses.push(`${side}-[${value}]`) // Use arbitrary value with brackets
      } else {
        // Try to parse as number for standard Tailwind values
        const numValue = Number.parseInt(value, 10)
        if (!isNaN(numValue)) {
          newClasses.push(`${side}-${numValue}`)
        } else {
          // If not a number, use as arbitrary value
          newClasses.push(`${side}-[${value}]`)
        }
      }
    }

    updateElement({ ...element, className: newClasses.join(" ") })
  }

  function applyMarginChange(side: string, value: string) {
    const newClasses = currentClasses.filter((c) => !c.startsWith(`${side}-`))

    if (value !== "") {
      // Check if value has units (px, rem, etc.)
      if (value.includes("px") || value.includes("rem") || value.includes("em") || value.includes("%")) {
        newClasses.push(`${side}-[${value}]`) // Use arbitrary value with brackets
      } else {
        // Try to parse as number for standard Tailwind values
        const numValue = Number.parseInt(value, 10)
        if (!isNaN(numValue)) {
          newClasses.push(`${side}-${numValue}`)
        } else {
          // If not a number, use as arbitrary value
          newClasses.push(`${side}-[${value}]`)
        }
      }
    }

    updateElement({ ...element, className: newClasses.join(" ") })
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-gray-700">Padding</Label>
          <span className="text-xs text-gray-500">px, rem, em, %</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Top</Label>
            <Input
              type="text"
              placeholder="4, 16px, 2rem"
              value={paddingValues.pt}
              onChange={(e) => handlePaddingChange("pt", e.target.value)}
              onBlur={(e) => applyPaddingChange("pt", e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Right</Label>
            <Input
              type="text"
              placeholder="4, 16px, 2rem"
              value={paddingValues.pr}
              onChange={(e) => handlePaddingChange("pr", e.target.value)}
              onBlur={(e) => applyPaddingChange("pr", e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bottom</Label>
            <Input
              type="text"
              placeholder="4, 16px, 2rem"
              value={paddingValues.pb}
              onChange={(e) => handlePaddingChange("pb", e.target.value)}
              onBlur={(e) => applyPaddingChange("pb", e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Left</Label>
            <Input
              type="text"
              placeholder="4, 16px, 2rem"
              value={paddingValues.pl}
              onChange={(e) => handlePaddingChange("pl", e.target.value)}
              onBlur={(e) => applyPaddingChange("pl", e.target.value)}
              className="h-7 text-xs"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-gray-700">Margin</Label>
          <span className="text-xs text-gray-500">px, rem, em, %</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Top</Label>
            <Input
              type="text"
              placeholder="4, 16px, 2rem"
              value={marginValues.mt}
              onChange={(e) => handleMarginChange("mt", e.target.value)}
              onBlur={(e) => applyMarginChange("mt", e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Right</Label>
            <Input
              type="text"
              placeholder="4, 16px, 2rem"
              value={marginValues.mr}
              onChange={(e) => handleMarginChange("mr", e.target.value)}
              onBlur={(e) => applyMarginChange("mr", e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bottom</Label>
            <Input
              type="text"
              placeholder="4, 16px, 2rem"
              value={marginValues.mb}
              onChange={(e) => handleMarginChange("mb", e.target.value)}
              onBlur={(e) => applyMarginChange("mb", e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Left</Label>
            <Input
              type="text"
              placeholder="4, 16px, 2rem"
              value={marginValues.ml}
              onChange={(e) => handleMarginChange("ml", e.target.value)}
              onBlur={(e) => applyMarginChange("ml", e.target.value)}
              className="h-7 text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaddingMarginEditor

