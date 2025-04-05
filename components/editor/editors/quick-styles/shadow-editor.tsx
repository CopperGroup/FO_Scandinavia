"use client"

import type React from "react"
import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import type { ParsedElement } from "@/types/editor"

interface ShadowEditorProps {
  element: ParsedElement
  updateElement: (element: ParsedElement) => void
  currentClasses: string[]
}

const ShadowEditor: React.FC<ShadowEditorProps> = ({ element, updateElement, currentClasses }) => {
  // Local state for shadow values
  const [shadowValue, setShadowValue] = useState(getShadowValue())
  const [hoverShadowValue, setHoverShadowValue] = useState(getHoverShadowValue())

  // Shadow Helpers
  function getShadowValue() {
    return currentClasses.find((c) => c.startsWith("shadow")) || ""
  }

  function getHoverShadowValue() {
    return currentClasses.find((c) => c.startsWith("hover:shadow")) || ""
  }

  function handleShadowChange(value: string) {
    setShadowValue(value)
    const newClasses = currentClasses.filter((c) => !c.startsWith("shadow"))
    if (value !== "") {
      newClasses.push(value)
    }
    updateElement({ ...element, className: newClasses.join(" ") })
  }

  function handleHoverShadowChange(value: string) {
    setHoverShadowValue(value)
    const newClasses = currentClasses.filter((c) => !c.startsWith("hover:shadow") && c !== "transition-shadow")
    if (value !== "") {
      newClasses.push(value)
      newClasses.push("transition-shadow")
    }
    updateElement({ ...element, className: newClasses.join(" ") })
  }

  // Shadow options
  const shadowOptions = [
    { label: "None", value: "" },
    { label: "SM", value: "shadow-sm" },
    { label: "Default", value: "shadow" },
    { label: "MD", value: "shadow-md" },
    { label: "LG", value: "shadow-lg" },
    { label: "XL", value: "shadow-xl" },
    { label: "2XL", value: "shadow-2xl" },
    { label: "Inner", value: "shadow-inner" },
  ]

  return (
    <Card className="border border-gray-100 shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-700">Shadow</Label>
          <div className="grid grid-cols-4 gap-2">
            {shadowOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={shadowValue === option.value ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => handleShadowChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center mt-3 pt-2 border-t">
          <Checkbox
            id="hover-shadow"
            checked={hoverShadowValue !== ""}
            onCheckedChange={(checked) => {
              if (checked) {
                handleHoverShadowChange(shadowValue === "" ? "hover:shadow-md" : `hover:${shadowValue}`)
              } else {
                handleHoverShadowChange("")
              }
            }}
          />
          <Label htmlFor="hover-shadow" className="ml-2 text-xs text-gray-700">
            Add hover shadow effect
          </Label>
        </div>
      </CardContent>
    </Card>
  )
}

export default ShadowEditor

