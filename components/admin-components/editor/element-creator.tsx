"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Type,
  Image,
  Link,
  Box,
  SquareStack,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  MousePointer,
} from "lucide-react"

interface ElementCreatorProps {
  onAddElement: (elementType: string) => void
}

export const ElementCreator: React.FC<ElementCreatorProps> = ({ onAddElement }) => {
  const [customTag, setCustomTag] = useState("")

  const elementGroups = [
    {
      name: "text",
      label: "Text",
      elements: [
        { type: "p", label: "Paragraph", icon: <AlignLeft className="h-4 w-4" /> },
        { type: "h1", label: "Heading 1", icon: <Heading1 className="h-4 w-4" /> },
        { type: "h2", label: "Heading 2", icon: <Heading2 className="h-4 w-4" /> },
        { type: "h3", label: "Heading 3", icon: <Heading3 className="h-4 w-4" /> },
        { type: "span", label: "Span", icon: <Type className="h-4 w-4" /> },
      ],
    },
    {
      name: "containers",
      label: "Containers",
      elements: [
        { type: "div", label: "Div", icon: <Box className="h-4 w-4" /> },
        { type: "section", label: "Section", icon: <SquareStack className="h-4 w-4" /> },
      ],
    },
    {
      name: "media",
      label: "Media",
      elements: [
        { type: "img", label: "Image", icon: <Image className="h-4 w-4" /> },
        { type: "a", label: "Link", icon: <Link className="h-4 w-4" /> },
        { type: "button", label: "Button", icon: <MousePointer className="h-4 w-4" /> },
      ],
    },
  ]

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Add Element</h3>

      <Tabs defaultValue="text">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="containers">Containers</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
        </TabsList>

        {elementGroups.map((group) => (
          <TabsContent key={group.name} value={group.name} className="mt-2">
            <div className="grid grid-cols-2 gap-2">
              {group.elements.map((element) => (
                <Button
                  key={element.type}
                  variant="outline"
                  className="justify-start"
                  onClick={() => onAddElement(element.type)}
                >
                  {element.icon}
                  <span className="ml-2">{element.label}</span>
                </Button>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <div className="pt-2 border-t">
        <Label htmlFor="custom-element" className="text-xs">
          Custom Element
        </Label>
        <div className="flex mt-1">
          <Input
            id="custom-element"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            placeholder="e.g., article, ul, li"
            className="text-sm"
          />
          <Button
            className="ml-2"
            size="sm"
            disabled={!customTag.trim()}
            onClick={() => {
              onAddElement(customTag.trim().toLowerCase())
              setCustomTag("")
            }}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  )
}

