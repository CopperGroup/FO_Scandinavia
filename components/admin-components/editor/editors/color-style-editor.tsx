"use client"

import type React from "react"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ParsedElement } from "@/lib/types/types"

interface ColorStyleEditorProps {
  element: ParsedElement
  updateElement: (element: ParsedElement) => void
}

const ColorStyleEditor: React.FC<ColorStyleEditorProps> = ({ element, updateElement }) => {
  const handleStyleChange = (key: string, value: string) => {
    const updatedStyle = { ...(element.style || {}), [key]: value }
    updateElement({ ...element, style: updatedStyle })
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
                value={element.style?.color || ""}
                onChange={(e) => handleStyleChange("color", e.target.value)}
                className="flex-1"
              />
              <Input
                type="color"
                className="w-12 h-10 p-1 cursor-pointer"
                value={element.style?.color || "#000000"}
                onChange={(e) => handleStyleChange("color", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Background Color</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="text"
                placeholder="e.g., #f0f0f0, transparent"
                value={element.style?.backgroundColor || ""}
                onChange={(e) => handleStyleChange("backgroundColor", e.target.value)}
                className="flex-1"
              />
              <Input
                type="color"
                className="w-12 h-10 p-1 cursor-pointer"
                value={element.style?.backgroundColor || "#ffffff"}
                onChange={(e) => handleStyleChange("backgroundColor", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Border Color</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="text"
                placeholder="e.g., #cccccc, gray"
                value={element.style?.borderColor || ""}
                onChange={(e) => handleStyleChange("borderColor", e.target.value)}
                className="flex-1"
              />
              <Input
                type="color"
                className="w-12 h-10 p-1 cursor-pointer"
                value={element.style?.borderColor || "#000000"}
                onChange={(e) => {
                  handleStyleChange("borderColor", e.target.value)
                  if (!element.style?.borderWidth) {
                    handleStyleChange("borderWidth", "1px")
                  }
                  if (!element.style?.borderStyle) {
                    handleStyleChange("borderStyle", "solid")
                  }
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
                value={element.style?.borderWidth || ""}
                onChange={(e) => handleStyleChange("borderWidth", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Border Style</Label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md"
                value={element.style?.borderStyle || ""}
                onChange={(e) => handleStyleChange("borderStyle", e.target.value)}
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

