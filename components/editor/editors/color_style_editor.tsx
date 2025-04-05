"use client"

import type React from "react"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import type { ParsedElement } from "@/types/editor"

interface ColorStyleEditorProps {
  element: ParsedElement
  updateElement: (element: ParsedElement) => void
}

const ColorStyleEditor: React.FC<ColorStyleEditorProps> = ({ element, updateElement }) => {
  const handleStyleChange = (key: string, value: string) => {
    // Only update the specific style property that changed
    const updatedElement = {
      ...element,
      style: {
        ...(element.style || {}),
        [key]: value,
      },
    }

    // Pass the updated element to the updateElement function
    updateElement(updatedElement)
  }

  return (
    <div className="space-y-4 py-2">
      <Card className="border border-gray-100 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">Text Color</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="text"
                placeholder="e.g., #ff0000, red"
                value={element.style?.color || ""}
                onChange={(e) => {
                  // Only update on blur, not on every keystroke
                  e.currentTarget.dataset.pendingValue = e.target.value
                }}
                onBlur={(e) => {
                  const value = e.currentTarget.dataset.pendingValue || e.currentTarget.value
                  handleStyleChange("color", value)
                }}
                className="flex-1 h-8 text-sm"
              />
              <div className="relative">
                <Input
                  type="color"
                  className="w-10 h-8 p-1 cursor-pointer opacity-0 absolute inset-0 z-10"
                  value={element.style?.color || "#000000"}
                  onChange={(e) => {
                    // Store the value in a data attribute during dragging
                    e.currentTarget.dataset.pendingValue = e.target.value
                  }}
                  onBlur={(e) => {
                    // Apply the value when the color picker loses focus
                    const value = e.currentTarget.dataset.pendingValue || e.currentTarget.value
                    handleStyleChange("color", value)
                  }}
                />
                <div
                  className="w-10 h-8 rounded border border-gray-200 overflow-hidden"
                  style={{ backgroundColor: element.style?.color || "#000000" }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">Background Color</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="text"
                placeholder="e.g., #f0f0f0, transparent"
                value={element.style?.backgroundColor || ""}
                onChange={(e) => {
                  e.currentTarget.dataset.pendingValue = e.target.value
                }}
                onBlur={(e) => {
                  const value = e.currentTarget.dataset.pendingValue || e.currentTarget.value
                  handleStyleChange("backgroundColor", value)
                }}
                className="flex-1 h-8 text-sm"
              />
              <div className="relative">
                <Input
                  type="color"
                  className="w-10 h-8 p-1 cursor-pointer opacity-0 absolute inset-0 z-10"
                  value={element.style?.backgroundColor || "#ffffff"}
                  onChange={(e) => {
                    e.currentTarget.dataset.pendingValue = e.target.value
                  }}
                  onBlur={(e) => {
                    const value = e.currentTarget.dataset.pendingValue || e.currentTarget.value
                    handleStyleChange("backgroundColor", value)
                  }}
                />
                <div
                  className="w-10 h-8 rounded border border-gray-200 overflow-hidden"
                  style={{ backgroundColor: element.style?.backgroundColor || "#ffffff" }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">Border Color</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="text"
                placeholder="e.g., #cccccc, gray"
                value={element.style?.borderColor || ""}
                onChange={(e) => {
                  e.currentTarget.dataset.pendingValue = e.target.value
                }}
                onBlur={(e) => {
                  const value = e.currentTarget.dataset.pendingValue || e.currentTarget.value
                  handleStyleChange("borderColor", value)
                  if (!element.style?.borderWidth) {
                    handleStyleChange("borderWidth", "1px")
                  }
                  if (!element.style?.borderStyle) {
                    handleStyleChange("borderStyle", "solid")
                  }
                }}
                className="flex-1 h-8 text-sm"
              />
              <div className="relative">
                <Input
                  type="color"
                  className="w-10 h-8 p-1 cursor-pointer opacity-0 absolute inset-0 z-10"
                  value={element.style?.borderColor || "#000000"}
                  onChange={(e) => {
                    e.currentTarget.dataset.pendingValue = e.target.value
                  }}
                  onBlur={(e) => {
                    const value = e.currentTarget.dataset.pendingValue || e.currentTarget.value
                    handleStyleChange("borderColor", value)
                    if (!element.style?.borderWidth) {
                      handleStyleChange("borderWidth", "1px")
                    }
                    if (!element.style?.borderStyle) {
                      handleStyleChange("borderStyle", "solid")
                    }
                  }}
                />
                <div
                  className="w-10 h-8 rounded border border-gray-200 overflow-hidden"
                  style={{ backgroundColor: element.style?.borderColor || "#000000" }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">Border Style</Label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md h-8 text-sm"
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
        </CardContent>
      </Card>
    </div>
  )
}

export default ColorStyleEditor

