"use client"

import type React from "react"
import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import type { ParsedElement } from "@/types/editor"

interface FlexboxEditorProps {
  element: ParsedElement
  updateElement: (element: ParsedElement) => void
  currentClasses: string[]
}

const FlexboxEditor: React.FC<FlexboxEditorProps> = ({ element, updateElement, currentClasses }) => {
  // Local state for gap value
  const [gapValue, setGapValue] = useState(getClassValue("gap-") || "0")

  // Helper to check if a class exists
  function hasClass(prefix: string) {
    return currentClasses.some((cls) => cls.startsWith(prefix))
  }

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

  function handleGapChange(value: string) {
    setGapValue(value)
  }

  function applyGapChange(value: string) {
    const newClasses = currentClasses.filter((c) => !c.startsWith("gap-"))

    if (value !== "") {
      // Check if value has units (px, rem, etc.)
      if (value.includes("px") || value.includes("rem") || value.includes("em") || value.includes("%")) {
        newClasses.push(`gap-[${value}]`) // Use arbitrary value with brackets
      } else {
        // Try to parse as number for standard Tailwind values
        const numValue = Number.parseInt(value, 10)
        if (!isNaN(numValue)) {
          newClasses.push(`gap-${numValue}`)
        } else {
          // If not a number, use as arbitrary value
          newClasses.push(`gap-[${value}]`)
        }
      }
    }

    updateElement({ ...element, className: newClasses.join(" ") })
  }

  return (
    <Card className="border border-gray-100 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium text-gray-700">Flexbox Layout</h3>
          <Switch
            checked={currentClasses.includes("flex")}
            onCheckedChange={(checked) => {
              if (checked) {
                const newClasses = [...currentClasses, "flex"]
                updateElement({
                  ...element,
                  className: newClasses.join(" "),
                })
              } else {
                // Remove flex and related classes
                const flexClasses = currentClasses.filter(
                  (cls) =>
                    ![
                      "flex",
                      "flex-row",
                      "flex-col",
                      "items-start",
                      "items-center",
                      "items-end",
                      "justify-start",
                      "justify-center",
                      "justify-end",
                      "justify-between",
                    ].includes(cls),
                )
                updateElement({
                  ...element,
                  className: flexClasses.join(" "),
                })
              }
            }}
          />
        </div>

        {currentClasses.includes("flex") && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-600 mb-2 block">Direction</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={currentClasses.includes("flex-row") ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    const filtered = currentClasses.filter((cls) => !["flex-row", "flex-col"].includes(cls))
                    updateElement({
                      ...element,
                      className: [...filtered, "flex-row"].join(" "),
                    })
                  }}
                >
                  Row
                </Button>
                <Button
                  variant={currentClasses.includes("flex-col") ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    const filtered = currentClasses.filter((cls) => !["flex-row", "flex-col"].includes(cls))
                    updateElement({
                      ...element,
                      className: [...filtered, "flex-col"].join(" "),
                    })
                  }}
                >
                  Column
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-600 mb-2 block">Align Items</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={currentClasses.includes("items-start") ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    const filtered = currentClasses.filter(
                      (cls) => !["items-start", "items-center", "items-end"].includes(cls),
                    )
                    updateElement({
                      ...element,
                      className: [...filtered, "items-start"].join(" "),
                    })
                  }}
                >
                  Start
                </Button>
                <Button
                  variant={currentClasses.includes("items-center") ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    const filtered = currentClasses.filter(
                      (cls) => !["items-start", "items-center", "items-end"].includes(cls),
                    )
                    updateElement({
                      ...element,
                      className: [...filtered, "items-center"].join(" "),
                    })
                  }}
                >
                  Center
                </Button>
                <Button
                  variant={currentClasses.includes("items-end") ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    const filtered = currentClasses.filter(
                      (cls) => !["items-start", "items-center", "items-end"].includes(cls),
                    )
                    updateElement({
                      ...element,
                      className: [...filtered, "items-end"].join(" "),
                    })
                  }}
                >
                  End
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-600 mb-2 block">Justify Content</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={currentClasses.includes("justify-start") ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    const filtered = currentClasses.filter(
                      (cls) => !["justify-start", "justify-center", "justify-end", "justify-between"].includes(cls),
                    )
                    updateElement({
                      ...element,
                      className: [...filtered, "justify-start"].join(" "),
                    })
                  }}
                >
                  Start
                </Button>
                <Button
                  variant={currentClasses.includes("justify-center") ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    const filtered = currentClasses.filter(
                      (cls) => !["justify-start", "justify-center", "justify-end", "justify-between"].includes(cls),
                    )
                    updateElement({
                      ...element,
                      className: [...filtered, "justify-center"].join(" "),
                    })
                  }}
                >
                  Center
                </Button>
                <Button
                  variant={currentClasses.includes("justify-between") ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    const filtered = currentClasses.filter(
                      (cls) => !["justify-start", "justify-center", "justify-end", "justify-between"].includes(cls),
                    )
                    updateElement({
                      ...element,
                      className: [...filtered, "justify-between"].join(" "),
                    })
                  }}
                >
                  Between
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-600 mb-2 block">Gap</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="e.g. 4, 16px, 2rem"
                  value={gapValue}
                  onChange={(e) => handleGapChange(e.target.value)}
                  onBlur={(e) => applyGapChange(e.target.value)}
                  className="w-full h-8 text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default FlexboxEditor

