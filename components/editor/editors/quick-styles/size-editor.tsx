"use client"

import type React from "react"
import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import type { ParsedElement } from "@/types/editor"

interface SizeEditorProps {
  element: ParsedElement
  updateElement: (element: ParsedElement) => void
  currentClasses: string[]
  useDelayedUpdate?: boolean
}

const SizeEditor: React.FC<SizeEditorProps> = ({
  element,
  updateElement,
  currentClasses,
  useDelayedUpdate = false,
}) => {
  // Local state for width and height
  const [widthClass, setWidthClass] = useState(getClassValue("w-") || "auto")
  const [heightClass, setHeightClass] = useState(getClassValue("h-") || "auto")
  const [customWidth, setCustomWidth] = useState(element.style?.width?.replace("px", "") || "")
  const [customHeight, setCustomHeight] = useState(element.style?.height?.replace("px", "") || "")

  // Helper to get class value
  function getClassValue(prefix: string, defaultValue = "") {
    const cls = currentClasses.find((cls) => cls.startsWith(prefix))

    // Check if it's an arbitrary value with brackets
    if (cls && cls.includes("[") && cls.includes("]")) {
      const match = cls.match(new RegExp(`${prefix}\\[(.*?)\\]`))
      return match ? match[1] : defaultValue
    }

    return cls ? cls.replace(prefix, "") : defaultValue
  }

  function handleWidthClassChange(value: string) {
    setWidthClass(value)

    if (!useDelayedUpdate) {
      const newClasses = currentClasses.filter((c) => !c.startsWith("w-"))
      if (value !== "auto") {
        newClasses.push(`w-${value}`)
      }
      updateElement({ ...element, className: newClasses.join(" ") })
    } else {
      // Apply immediately for select changes even with delayed updates
      const newClasses = currentClasses.filter((c) => !c.startsWith("w-"))
      if (value !== "auto") {
        newClasses.push(`w-${value}`)
      }
      updateElement({ ...element, className: newClasses.join(" ") })
    }
  }

  function handleHeightClassChange(value: string) {
    setHeightClass(value)

    if (!useDelayedUpdate) {
      const newClasses = currentClasses.filter((c) => !c.startsWith("h-"))
      if (value !== "auto") {
        newClasses.push(`h-${value}`)
      }
      updateElement({ ...element, className: newClasses.join(" ") })
    } else {
      // Apply immediately for select changes even with delayed updates
      const newClasses = currentClasses.filter((c) => !c.startsWith("h-"))
      if (value !== "auto") {
        newClasses.push(`h-${value}`)
      }
      updateElement({ ...element, className: newClasses.join(" ") })
    }
  }

  function handleCustomWidthChange(value: string) {
    setCustomWidth(value)
  }

  function applyCustomWidthChange(value: string) {
    if (value) {
      // Check if value has units
      if (!value.includes("px") && !value.includes("rem") && !value.includes("em") && !value.includes("%")) {
        value = `${value}px` // Default to px if no unit specified
      }

      const updatedStyle = { ...(element.style || {}), width: value }
      updateElement({
        ...element,
        style: updatedStyle,
      })
    } else {
      const updatedStyle = { ...(element.style || {}) }
      delete updatedStyle.width
      updateElement({
        ...element,
        style: updatedStyle,
      })
    }
  }

  function handleCustomHeightChange(value: string) {
    setCustomHeight(value)
  }

  function applyCustomHeightChange(value: string) {
    if (value) {
      // Check if value has units
      if (!value.includes("px") && !value.includes("rem") && !value.includes("em") && !value.includes("%")) {
        value = `${value}px` // Default to px if no unit specified
      }

      const updatedStyle = { ...(element.style || {}), height: value }
      updateElement({
        ...element,
        style: updatedStyle,
      })
    } else {
      const updatedStyle = { ...(element.style || {}) }
      delete updatedStyle.height
      updateElement({
        ...element,
        style: updatedStyle,
      })
    }
  }

  return (
    <Card className="border border-gray-100 shadow-sm">
      <CardContent className="p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Size</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-gray-600 mb-2 block">Width</Label>
            <div className="flex gap-2">
              <Select value={widthClass} onValueChange={handleWidthClassChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select width" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="full">Full (100%)</SelectItem>
                  <SelectItem value="1/2">Half (50%)</SelectItem>
                  <SelectItem value="1/3">One Third (33%)</SelectItem>
                  <SelectItem value="2/3">Two Thirds (66%)</SelectItem>
                  <SelectItem value="1/4">One Quarter (25%)</SelectItem>
                  <SelectItem value="3/4">Three Quarters (75%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-2">
              <Label className="text-xs text-gray-600">Custom Width (px, rem, em, %)</Label>
              <Input
                type="text"
                placeholder="e.g., 200px, 10rem, 50%"
                value={customWidth}
                onChange={(e) => handleCustomWidthChange(e.target.value)}
                onBlur={(e) => applyCustomWidthChange(e.target.value)}
                className="w-full mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-600 mb-2 block">Height</Label>
            <div className="flex gap-2">
              <Select value={heightClass} onValueChange={handleHeightClassChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select height" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="full">Full (100%)</SelectItem>
                  <SelectItem value="screen">Screen Height</SelectItem>
                  <SelectItem value="10">Small (40px)</SelectItem>
                  <SelectItem value="20">Medium (80px)</SelectItem>
                  <SelectItem value="40">Large (160px)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-2">
              <Label className="text-xs text-gray-600">Custom Height (px, rem, em, %)</Label>
              <Input
                type="text"
                placeholder="e.g., 200px, 10rem, 50%"
                value={customHeight}
                onChange={(e) => handleCustomHeightChange(e.target.value)}
                onBlur={(e) => applyCustomHeightChange(e.target.value)}
                className="w-full mt-1"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default SizeEditor

