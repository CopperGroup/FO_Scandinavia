"use client"

import type React from "react"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TextStyleEditor from "./editors/text-style-editor"
import ColorStyleEditor from "./editors/color-style-editor"
import ClassNameEditor from "./editors/class-name-editor"
import AttributeEditor from "./editors/attribute-editor"
import { Badge } from "@/components/ui/badge"
import { getElementIcon } from "@/lib/editor-utils"
import { ParsedElement } from "@/lib/types/types"

interface PropertiesPanelProps {
  selectedElement: ParsedElement
  updateElement: (element: ParsedElement) => void
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedElement, updateElement }) => {
  const [activeTab, setActiveTab] = useState("content")

  // Determine which tabs should be available based on element type
  const showContentTab = selectedElement.type !== "img"
  const showImageTab = selectedElement.type === "img"
  const showLinkTab = selectedElement.type === "a"

  // Set initial active tab based on element type
  useState(() => {
    if (selectedElement.type === "img") {
      setActiveTab("image")
    } else if (selectedElement.type === "a") {
      setActiveTab("link")
    } else {
      setActiveTab("content")
    }
  })

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {getElementIcon(selectedElement.type)}
          <h3 className="text-base font-medium text-gray-800">{selectedElement.type}</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          {selectedElement.id}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList
          className="grid w-full"
          style={{
            gridTemplateColumns: `${showContentTab ? "1fr " : ""}1fr 1fr 1fr${showImageTab ? " 1fr" : ""}${showLinkTab ? " 1fr" : ""}`,
          }}
        >
          {showContentTab && <TabsTrigger value="content">Content</TabsTrigger>}
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          {showImageTab && <TabsTrigger value="image">Image</TabsTrigger>}
          {showLinkTab && <TabsTrigger value="link">Link</TabsTrigger>}
        </TabsList>

        {showContentTab && (
          <TabsContent value="content">
            <AttributeEditor element={selectedElement} updateElement={updateElement} attributeType="content" />
          </TabsContent>
        )}

        <TabsContent value="text">
          <TextStyleEditor element={selectedElement} updateElement={updateElement} />
        </TabsContent>

        <TabsContent value="colors">
          <ColorStyleEditor element={selectedElement} updateElement={updateElement} />
        </TabsContent>

        <TabsContent value="classes">
          <ClassNameEditor element={selectedElement} updateElement={updateElement} />
        </TabsContent>

        {showImageTab && (
          <TabsContent value="image">
            <AttributeEditor element={selectedElement} updateElement={updateElement} attributeType="image" />
          </TabsContent>
        )}

        {showLinkTab && (
          <TabsContent value="link">
            <AttributeEditor element={selectedElement} updateElement={updateElement} attributeType="link" />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

export default PropertiesPanel

