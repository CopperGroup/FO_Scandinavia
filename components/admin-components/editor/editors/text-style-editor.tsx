"use client"

import type React from "react"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { ParsedElement } from "@/lib/types/types"

interface TextStyleEditorProps {
  element: ParsedElement
  updateElement: (element: ParsedElement) => void
}

const TextStyleEditor: React.FC<TextStyleEditorProps> = ({ element, updateElement }) => {
  const handleStyleChange = (key: string, value: string) => {
    const updatedStyle = { ...(element.style || {}), [key]: value }
    updateElement({ ...element, style: updatedStyle })
  }

  return (
    <div className="space-y-4 py-2">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Font Size</Label>
            <Input
              type="text"
              placeholder="e.g., 16px, 1.2rem"
              value={element.style?.fontSize || ""}
              onChange={(e) => handleStyleChange("fontSize", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Font Weight</Label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={element.style?.fontWeight || ""}
              onChange={(e) => handleStyleChange("fontWeight", e.target.value)}
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
                onClick={() => handleStyleChange("textAlign", "left")}
                className={element.style?.textAlign === "left" ? "border-blue-500 bg-blue-50" : ""}
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleStyleChange("textAlign", "center")}
                className={element.style?.textAlign === "center" ? "border-blue-500 bg-blue-50" : ""}
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleStyleChange("textAlign", "right")}
                className={element.style?.textAlign === "right" ? "border-blue-500 bg-blue-50" : ""}
              >
                <AlignRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleStyleChange("textAlign", "justify")}
                className={element.style?.textAlign === "justify" ? "border-blue-500 bg-blue-50" : ""}
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
              value={element.style?.lineHeight || ""}
              onChange={(e) => handleStyleChange("lineHeight", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Text Transform</Label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={element.style?.textTransform || ""}
              onChange={(e) => handleStyleChange("textTransform", e.target.value)}
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

