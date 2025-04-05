"use client"

import type React from "react"
import { useState } from "react"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import PaddingMarginEditor from "./quick-styles/padding-margin-editor"
import BorderEditor from "./quick-styles/border-editor"
import ShadowEditor from "./quick-styles/shadow-editor"
import FlexboxEditor from "./quick-styles/flexbox-editor"
import SizeEditor from "./quick-styles/size-editor"
import type { ParsedElement } from "@/types/editor"
import { Button } from "@/components/ui/button"

interface QuickStylesEditorProps {
  element: ParsedElement
  updateElement: (element: ParsedElement) => void
}

const QuickStylesEditor: React.FC<QuickStylesEditorProps> = ({ element, updateElement }) => {
  const [activeTab, setActiveTab] = useState("spacing")

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">Style Category</span>
          </div>
          <div className="flex flex-wrap gap-1">
            <Button
              variant={activeTab === "spacing" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setActiveTab("spacing")}
            >
              Spacing
            </Button>
            <Button
              variant={activeTab === "border" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setActiveTab("border")}
            >
              Border
            </Button>
            <Button
              variant={activeTab === "size" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setActiveTab("size")}
            >
              Size
            </Button>
            <Button
              variant={activeTab === "shadow" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setActiveTab("shadow")}
            >
              Effects
            </Button>
            <Button
              variant={activeTab === "flexbox" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setActiveTab("flexbox")}
            >
              Flexbox
            </Button>
          </div>
        </div>

        <TabsContent value="spacing" className="mt-2">
          <PaddingMarginEditor
            element={element}
            updateElement={updateElement}
            currentClasses={element.className ? element.className.split(" ") : []}
          />
        </TabsContent>

        <TabsContent value="border" className="mt-2">
          <BorderEditor
            element={element}
            updateElement={updateElement}
            currentClasses={element.className ? element.className.split(" ") : []}
          />
        </TabsContent>

        <TabsContent value="size" className="mt-2">
          <SizeEditor
            element={element}
            updateElement={updateElement}
            currentClasses={element.className ? element.className.split(" ") : []}
          />
        </TabsContent>

        <TabsContent value="shadow" className="mt-2">
          <ShadowEditor
            element={element}
            updateElement={updateElement}
            currentClasses={element.className ? element.className.split(" ") : []}
          />
        </TabsContent>

        <TabsContent value="flexbox" className="mt-2">
          <FlexboxEditor
            element={element}
            updateElement={updateElement}
            currentClasses={element.className ? element.className.split(" ") : []}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default QuickStylesEditor

