"use client"

import type React from "react"
import { useState, useEffect } from "react"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from "lucide-react"
import type { ParsedElement } from "@/types/editor"
import { Card, CardContent } from "@/components/ui/card"

interface TextStyleEditorProps {
  element: ParsedElement
  updateElement: (element: ParsedElement) => void
  useDelayedUpdate?: boolean
}

const TextStyleEditor: React.FC<TextStyleEditorProps> = ({ element, updateElement, useDelayedUpdate = false }) => {
  // Add debouncing for style changes
  const [debouncedStyleUpdate, setDebouncedStyleUpdate] = useState<NodeJS.Timeout | null>(null)

  // Add local state for style properties
  const [localStyles, setLocalStyles] = useState<Record<string, string>>({
    fontSize: element.style?.fontSize || "",
    fontWeight: element.style?.fontWeight || "",
    textAlign: element.style?.textAlign || "",
    lineHeight: element.style?.lineHeight || "",
    textTransform: element.style?.textTransform || "",
  })

  // Update local state when element changes
  useEffect(() => {
    setLocalStyles({
      fontSize: element.style?.fontSize || "",
      fontWeight: element.style?.fontWeight || "",
      textAlign: element.style?.textAlign || "",
      lineHeight: element.style?.lineHeight || "",
      textTransform: element.style?.textTransform || "",
    })
  }, [element])

  const handleStyleChange = (key: string, value: string, immediate = false) => {
    // Update local state immediately
    setLocalStyles((prev) => ({
      ...prev,
      [key]: value,
    }))

    // Clear any existing timeout
    if (debouncedStyleUpdate) {
      clearTimeout(debouncedStyleUpdate)
    }

    // If immediate update is requested or not using delayed updates
    if (immediate || !useDelayedUpdate) {
      updateElement({
        ...element,
        style: {
          ...(element.style || {}),
          [key]: value,
        },
      })
    } else {
      // Set a new timeout to update the actual element after a delay
      const timeout = setTimeout(() => {
        updateElement({
          ...element,
          style: {
            ...(element.style || {}),
            [key]: value,
          },
        })
      }, 300) // 300ms debounce time

      setDebouncedStyleUpdate(timeout)
    }
  }

  const applyChanges = () => {
    if (useDelayedUpdate) {
      const updatedElement = {
        ...element,
        style: {
          ...(element.style || {}),
          ...localStyles,
        },
      }
      updateElement(updatedElement)
    }
  }

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (debouncedStyleUpdate) {
        clearTimeout(debouncedStyleUpdate)
      }
    }
  }, [debouncedStyleUpdate])

  return (
    <div className="space-y-4 py-2">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Font Size</Label>
            <Input
              type="text"
              placeholder="e.g., 16px, 1.2rem"
              value={localStyles.fontSize}
              onChange={(e) => handleStyleChange("fontSize", e.target.value)}
              onBlur={applyChanges}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Font Weight</Label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={localStyles.fontWeight}
              onChange={(e) => {
                handleStyleChange("fontWeight", e.target.value, true)
              }}
            >
              <option value="">Default</option>
              <option value="normal">Normal</option>
              <option value="500">Medium (500)</option>
              <option value="600">Semibold (600)</option>
              <option value="bold">Bold</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Text Alignment</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  handleStyleChange("textAlign", "left", true)
                }}
                className={localStyles.textAlign === "left" ? "border-blue-500 bg-blue-50" : ""}
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  handleStyleChange("textAlign", "center", true)
                }}
                className={localStyles.textAlign === "center" ? "border-blue-500 bg-blue-50" : ""}
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  handleStyleChange("textAlign", "right", true)
                }}
                className={localStyles.textAlign === "right" ? "border-blue-500 bg-blue-50" : ""}
              >
                <AlignRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  handleStyleChange("textAlign", "justify", true)
                }}
                className={localStyles.textAlign === "justify" ? "border-blue-500 bg-blue-50" : ""}
              >
                <AlignJustify className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Line Height</Label>
            <Input
              type="text"
              placeholder="e.g., 1.5, 24px"
              value={localStyles.lineHeight}
              onChange={(e) => handleStyleChange("lineHeight", e.target.value)}
              onBlur={applyChanges}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Text Transform</Label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={localStyles.textTransform}
              onChange={(e) => {
                handleStyleChange("textTransform", e.target.value, true)
              }}
            >
              <option value="">None</option>
              <option value="uppercase">UPPERCASE</option>
              <option value="lowercase">lowercase</option>
              <option value="capitalize">Capitalize</option>
            </select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default TextStyleEditor

