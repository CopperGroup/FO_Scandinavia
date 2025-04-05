"use client"

import type React from "react"
import { useState } from "react"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { ParsedElement } from "@/types/editor"

interface AttributeEditorProps {
  element: ParsedElement
  updateElement: (element: ParsedElement) => void
  attributeType: "content" | "image" | "link" | "component"
}

const AttributeEditor: React.FC<AttributeEditorProps> = ({ element, updateElement, attributeType }) => {
  const [newAttributeName, setNewAttributeName] = useState("")
  const [newAttributeValue, setNewAttributeValue] = useState("")

  const handleTextChange = (value: string) => {
    updateElement({ ...element, textContent: value })
  }

  const handleAttributeChange = (key: string, value: string) => {
    const updatedAttributes = { ...(element.attributes || {}), [key]: value }
    updateElement({ ...element, attributes: updatedAttributes })
  }

  const addAttribute = () => {
    if (!newAttributeName.trim()) return

    const newAttributes = { ...(element.attributes || {}) }
    newAttributes[newAttributeName] = newAttributeValue

    updateElement({
      ...element,
      attributes: newAttributes,
    })

    setNewAttributeName("")
    setNewAttributeValue("")
  }

  // Content editor
  if (attributeType === "content" && element.textContent !== undefined) {
    return (
      <div className="space-y-4 py-2">
        <Card>
          <CardContent className="p-4">
            <Label htmlFor="text-content" className="text-sm font-medium mb-2 block">
              Text Content
            </Label>
            <textarea
              id="text-content"
              className="w-full p-2 border border-gray-300 rounded-md min-h-[150px]"
              value={element.textContent}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Enter text content here..."
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Image editor
  if (attributeType === "image" && element.type === "img") {
    return (
      <div className="space-y-4 py-2">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <Label htmlFor="img-src" className="text-sm font-medium mb-2 block">
                Image Source (URL)
              </Label>
              <Input
                id="img-src"
                value={element.attributes?.src || ""}
                onChange={(e) => handleAttributeChange("src", e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <Label htmlFor="img-alt" className="text-sm font-medium mb-2 block">
                Alt Text
              </Label>
              <Input
                id="img-alt"
                value={element.attributes?.alt || ""}
                onChange={(e) => handleAttributeChange("alt", e.target.value)}
                placeholder="Description of the image"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="img-width" className="text-sm font-medium mb-2 block">
                  Width
                </Label>
                <Input
                  id="img-width"
                  type="number"
                  value={element.attributes?.width || ""}
                  onChange={(e) => handleAttributeChange("width", e.target.value)}
                  placeholder="Width in pixels"
                />
              </div>

              <div>
                <Label htmlFor="img-height" className="text-sm font-medium mb-2 block">
                  Height
                </Label>
                <Input
                  id="img-height"
                  type="number"
                  value={element.attributes?.height || ""}
                  onChange={(e) => handleAttributeChange("height", e.target.value)}
                  placeholder="Height in pixels"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Image Preview</Label>
              <div className="border rounded-md p-2 bg-white flex items-center justify-center">
                <img
                  src={element.attributes?.src || "/placeholder.svg?height=200&width=300"}
                  alt={element.attributes?.alt || "Preview"}
                  className="max-w-full max-h-[200px] object-contain"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Link editor
  if (attributeType === "link" && element.type === "a") {
    return (
      <div className="space-y-4 py-2">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <Label htmlFor="link-text" className="text-sm font-medium mb-2 block">
                Link Text
              </Label>
              <Input
                id="link-text"
                value={element.textContent || ""}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Link text"
              />
            </div>

            <div>
              <Label htmlFor="link-href" className="text-sm font-medium mb-2 block">
                URL
              </Label>
              <div className="flex">
                <Input
                  id="link-href"
                  value={element.attributes?.href || ""}
                  onChange={(e) => handleAttributeChange("href", e.target.value)}
                  placeholder="https://example.com"
                  className="flex-grow"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="ml-2"
                  onClick={() => window.open(element.attributes?.href, "_blank")}
                  disabled={!element.attributes?.href}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="link-target" className="text-sm font-medium mb-2 block">
                Target
              </Label>
              <select
                id="link-target"
                value={element.attributes?.target || ""}
                onChange={(e) => handleAttributeChange("target", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Same window</option>
                <option value="_blank">New window (_blank)</option>
                <option value="_self">Same frame (_self)</option>
                <option value="_parent">Parent frame (_parent)</option>
                <option value="_top">Full body of the window (_top)</option>
              </select>
            </div>

            <div>
              <Label htmlFor="link-rel" className="text-sm font-medium mb-2 block">
                Rel
              </Label>
              <Input
                id="link-rel"
                value={element.attributes?.rel || ""}
                onChange={(e) => handleAttributeChange("rel", e.target.value)}
                placeholder="e.g. nofollow noopener"
              />
              <p className="text-xs text-gray-500 mt-1">Common values: nofollow, noopener, noreferrer, etc.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Component editor
  if (attributeType === "component") {
    return (
      <div className="space-y-4 py-2">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Component Attributes</Label>
              <p className="text-sm text-gray-500 mb-2">Add or modify attributes for this component.</p>

              {/* Generic attribute editor */}
              <div className="space-y-4">
                {Object.entries(element.attributes || {}).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-3 gap-2 items-center">
                    <Label className="text-sm">{key}</Label>
                    <Input
                      className="col-span-2"
                      value={value}
                      onChange={(e) => {
                        const newAttributes = { ...(element.attributes || {}) }
                        newAttributes[key] = e.target.value
                        updateElement({
                          ...element,
                          attributes: newAttributes,
                        })
                      }}
                    />
                  </div>
                ))}

                {/* Add new attribute */}
                <div className="pt-4 border-t">
                  <div className="flex gap-2 mb-4">
                    <Input
                      placeholder="Attribute name"
                      value={newAttributeName}
                      onChange={(e) => setNewAttributeName(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Value"
                      value={newAttributeValue}
                      onChange={(e) => setNewAttributeValue(e.target.value)}
                      className="flex-1"
                    />
                    <Button variant="outline" onClick={addAttribute} disabled={!newAttributeName.trim()}>
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}

export default AttributeEditor

