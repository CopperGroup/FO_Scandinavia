"use client"

import type React from "react"
import { useState, useEffect } from "react"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import type { ParsedElement } from "@/types/editor"

interface ColorStyleEditorProps {
  element: ParsedElement
  updateElement: (element: ParsedElement) => void
  useDelayedUpdate?: boolean
}

const ColorStyleEditor: React.FC<ColorStyleEditorProps> = ({ element, updateElement, useDelayedUpdate = false }) => {
  const [localStyles, setLocalStyles] = useState<Record<string, string>>({
    color: element.style?.color || "",
    backgroundColor: element.style?.backgroundColor || "",
    borderColor: element.style?.borderColor || "",
    borderWidth: element.style?.borderWidth || "",
    borderStyle: element.style?.borderStyle || "",
  })

  // Update local state when element changes
  useEffect(() => {
    setLocalStyles({
      color: element.style?.color || "",
      backgroundColor: element.style?.backgroundColor || "",
      borderColor: element.style?.borderColor || "",
      borderWidth: element.style?.borderWidth || "",
      borderStyle: element.style?.borderStyle || "",
    })
  }, [element])

  const handleStyleChange = (key: string, value: string) => {
    // Update local state immediately
    setLocalStyles((prev) => ({
      ...prev,
      [key]: value,
    }))

    // If not using delayed updates, update the element immediately
    if (!useDelayedUpdate) {
      const updatedElement = {
        ...element,
        style: {
          ...(element.style || {}),
          [key]: value,
        },
      }
      updateElement(updatedElement)
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

  return (
    <div className="space-y-4 py-2">
      <Card>
        <CardContent className="p-4 space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Text Color</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="text"
                placeholder="e.g., #ff0000, red"
                value={localStyles.color}
                onChange={(e) => handleStyleChange("color", e.target.value)}
                onBlur={applyChanges}
                className="flex-1"
              />
              <Input
                type="color"
                className="w-12 h-10 p-1 cursor-pointer"
                value={localStyles.color || "#000000"}
                onChange={(e) => handleStyleChange("color", e.target.value)}
                onBlur={applyChanges}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Background Color</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="text"
                placeholder="e.g., #f0f0f0, transparent"
                value={localStyles.backgroundColor}
                onChange={(e) => handleStyleChange("backgroundColor", e.target.value)}
                onBlur={applyChanges}
                className="flex-1"
              />
              <Input
                type="color"
                className="w-12 h-10 p-1 cursor-pointer"
                value={localStyles.backgroundColor || "#ffffff"}
                onChange={(e) => handleStyleChange("backgroundColor", e.target.value)}
                onBlur={applyChanges}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Border Color</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="text"
                placeholder="e.g., #cccccc, gray"
                value={localStyles.borderColor}
                onChange={(e) => handleStyleChange("borderColor", e.target.value)}
                onBlur={applyChanges}
                className="flex-1"
              />
              <Input
                type="color"
                className="w-12 h-10 p-1 cursor-pointer"
                value={localStyles.borderColor || "#000000"}
                onChange={(e) => handleStyleChange("borderColor", e.target.value)}
                onBlur={applyChanges}
                onMouseUp={() => {
                  if (!element.style?.borderWidth) {
                    handleStyleChange("borderWidth", "1px")
                  }
                  if (!element.style?.borderStyle) {
                    handleStyleChange("borderStyle", "solid")
                  }
                  applyChanges()
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Border Width</Label>
              <Input
                type="text"
                placeholder="e.g., 1px, 2px"
                value={localStyles.borderWidth}
                onChange={(e) => handleStyleChange("borderWidth", e.target.value)}
                onBlur={applyChanges}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Border Style</Label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md"
                value={localStyles.borderStyle}
                onChange={(e) => {
                  handleStyleChange("borderStyle", e.target.value)
                  applyChanges()
                }}
              >
                <option value="">Select style</option>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
                <option value="double">Double</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ColorStyleEditor

