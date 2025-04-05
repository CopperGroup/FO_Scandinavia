"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import ClassNameEditor from "./editors/class-name-editor"
import TextStyleEditor from "./editors/text-style-editor"
import ColorStyleEditor from "./editors/color_style_editor"
import QuickStylesEditor from "./editors/quick-styles-editor"
import AnimationEditor from "./editors/animation-editor"
import IconEditor from "./editors/icon-editor"
import type { ParsedElement } from "@/types/editor"
import { Badge } from "@/components/ui/badge"
import AttributesEditor from "./editors/attributes-editor"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Eye } from "lucide-react"

interface PropertiesPanelProps {
  selectedElement: ParsedElement | null
  updateElement: (element: ParsedElement) => void
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedElement, updateElement }) => {
  const [activeTab, setActiveTab] = useState("styling")
  const [localTextContent, setLocalTextContent] = useState<string>("")
  const [debouncedTextUpdate, setDebouncedTextUpdate] = useState<NodeJS.Timeout | null>(null)
  const selectedElementId = useRef<string | null>(null)
  const [isHtmlModalOpen, setIsHtmlModalOpen] = useState(false)

  useEffect(() => {
    if (selectedElement) {
      selectedElementId.current = selectedElement.id
      setLocalTextContent(selectedElement.textContent || "")
    } else {
      selectedElementId.current = null
      setLocalTextContent("")
    }
  }, [selectedElement])

  const isTextElement = selectedElement?.type
    ? ["p", "h1", "h2", "h3", "h4", "h5", "h6", "span", "a", "button", "li"].includes(selectedElement.type)
    : false

  const isIconElement = selectedElement?.type === "icon"
  const isComponent = selectedElement?.componentInfo?.isComponent

  const handleTextContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalTextContent(e.target.value)

    if (debouncedTextUpdate) {
      clearTimeout(debouncedTextUpdate)
    }

    const timeout = setTimeout(() => {
      if (selectedElement) {
        const newElement = { ...selectedElement, textContent: e.target.value }
        updateElement(newElement)
      }
    }, 300)

    setDebouncedTextUpdate(timeout)
  }

  useEffect(() => {
    return () => {
      if (debouncedTextUpdate) {
        clearTimeout(debouncedTextUpdate)
      }
    }
  }, [debouncedTextUpdate])

  const getHtmlTagPreview = (element: ParsedElement): string => {
    if (!element) return ""

    // Check if this is an animated element
    const isAnimated = element.animations?.enabled === true
    let tag = `<${isAnimated ? `motion.${element.type}` : element.type}`

    // Add className if it exists
    if (element.className) {
      tag += ` class="${element.className}"`
    }

    // Add style if it exists
    if (element.style && Object.keys(element.style).length > 0) {
      const styleStr = Object.entries(element.style)
        .map(([key, value]) => `${key}: ${value}`)
        .join("; ")
      tag += ` style="${styleStr}"`
    }

    // Add attributes if they exist
    if (element.attributes) {
      Object.entries(element.attributes).forEach(([key, value]) => {
        tag += ` ${key}="${value}"`
      })
    }

    // Add animation props if it's animated
    if (isAnimated && element.animations) {
      const { type, trigger } = element.animations

      // Add a simplified version of animation props
      if (trigger === "load") {
        tag += ` animate={{ ... }}`
      } else if (trigger === "hover") {
        tag += ` whileHover={{ ... }}`
      } else if (trigger === "click") {
        tag += ` whileTap={{ ... }}`
      } else if (trigger === "inView") {
        tag += ` whileInView={{ ... }}`
      }
    }

    // Close the tag
    tag += `>`

    return tag
  }

  if (!selectedElement) {
    return (
      <div className="p-4 text-center text-gray-500 h-full flex items-center justify-center">
        <div>
          <p className="mb-2 font-medium">No Element Selected</p>
          <p className="text-sm text-gray-400">Select an element to edit its properties</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-700">{selectedElement.type}</span>
          <Badge variant="outline" className="text-xs font-normal">
            {selectedElement.id.substring(0, 8)}
          </Badge>
        </div>
        <Badge variant="secondary" className="text-xs">
          {selectedElement.className ? selectedElement.className.split(" ").length : 0} classes
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full grid grid-cols-4 p-1 bg-gray-50 border-b">
          <TabsTrigger value="styling" className="text-xs">
            Styling
          </TabsTrigger>
          {isTextElement && (
            <TabsTrigger value="text" className="text-xs">
              Text
            </TabsTrigger>
          )}
          {isIconElement && (
            <TabsTrigger value="icon" className="text-xs">
              Icon
            </TabsTrigger>
          )}
          <TabsTrigger value="attributes" className="text-xs">
            Attributes
          </TabsTrigger>
          <TabsTrigger value="animation" className="text-xs">
            Animation
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="styling" className="h-full m-0">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <h3 className="text-xs font-medium text-gray-700">Layout & Styling</h3>
                  </div>
                  <QuickStylesEditor element={selectedElement} updateElement={updateElement} useDelayedUpdate={true} />
                </div>

                <Separator className="my-3" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-gray-700">Colors & Appearance</h3>
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600 hover:text-blue-800">
                      Reset
                    </Button>
                  </div>
                  <ColorStyleEditor element={selectedElement} updateElement={updateElement} useDelayedUpdate={true} />
                </div>

                <Separator className="my-3" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-gray-700">Tailwind Classes</h3>
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600 hover:text-blue-800">
                      Clear All
                    </Button>
                  </div>
                  <ClassNameEditor element={selectedElement} updateElement={updateElement} />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {isTextElement && (
            <TabsContent value="text" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="textContent" className="text-xs font-medium">
                      Text Content
                    </Label>
                    <textarea
                      id="textContent"
                      className="w-full min-h-[100px] p-2 border rounded-md text-sm"
                      value={localTextContent}
                      onChange={handleTextContentChange}
                      placeholder="Enter text content..."
                    />
                  </div>
                  <Separator />
                  <TextStyleEditor element={selectedElement} updateElement={updateElement} useDelayedUpdate={true} />
                </div>
              </ScrollArea>
            </TabsContent>
          )}

          {isIconElement && (
            <TabsContent value="icon" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="p-3">
                  <IconEditor element={selectedElement} updateElement={updateElement} useDelayedUpdate={true} />
                </div>
              </ScrollArea>
            </TabsContent>
          )}

          <TabsContent value="attributes" className="h-full m-0">
            <ScrollArea className="h-full">
              <div className="p-3">
                <AttributesEditor element={selectedElement} updateElement={updateElement} useDelayedUpdate={true} />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="animation" className="h-full m-0">
            <ScrollArea className="h-full">
              <div className="p-3">
                <AnimationEditor element={selectedElement} updateElement={updateElement} useDelayedUpdate={true} />
              </div>
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>

      {/* HTML Tag Preview at the bottom */}
      <div className="p-2 border-t bg-gray-50">
        <Label className="text-xs font-medium text-gray-500 mb-1 block">HTML Preview</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="p-2 bg-white border border-gray-200 rounded-md font-mono text-xs overflow-hidden cursor-pointer hover:bg-gray-50 flex items-center"
                onClick={() => setIsHtmlModalOpen(true)}
              >
                <div className="truncate flex-1">{getHtmlTagPreview(selectedElement)}</div>
                <Eye className="h-3.5 w-3.5 text-gray-400 ml-1 flex-shrink-0" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Click to view full HTML</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Modal for full HTML preview */}
        <Dialog open={isHtmlModalOpen} onOpenChange={setIsHtmlModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>HTML Preview</DialogTitle>
            </DialogHeader>
            <div className="p-3 bg-gray-50 border rounded-md font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all max-h-[60vh] overflow-y-auto">
              {getHtmlTagPreview(selectedElement)}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default PropertiesPanel

