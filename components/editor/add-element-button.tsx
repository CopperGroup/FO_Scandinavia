"use client"

import type React from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Layout,
  Layers,
  ListChecks,
  ListOrdered,
  Minus,
  AlignHorizontalJustifyCenter,
  Heading,
  Video,
  Music,
  Link2,
  Box,
  Image,
  Square,
  Table,
} from "lucide-react"
import { Heading1, Heading2, Text, TextCursor, Bold, Italic, Quote, Code } from "lucide-react"

interface AddElementButtonProps {
  onAddElement: (parentId: string, elementType: string) => void
  parentId: string
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  children?: React.ReactNode
}

const AddElementButton: React.FC<AddElementButtonProps> = ({
  onAddElement,
  parentId,
  variant = "outline",
  size = "default",
  className = "",
  children,
}) => {
  const handleAddElement = (elementType: string) => {
    onAddElement(parentId, elementType)
    const dialogClose = document.querySelector('[data-state="open"][role="dialog"] button[data-state="closed"]')
    if (dialogClose) (dialogClose as HTMLButtonElement).click()
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          {children || <Plus className="h-3.5 w-3.5" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add Element</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="text">
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="lists">Lists</TabsTrigger>
            <TabsTrigger value="tables">Tables</TabsTrigger>
          </TabsList>
          <ScrollArea className="h-[350px] pr-3">
            <TabsContent value="text" className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="justify-start h-auto py-2" onClick={() => handleAddElement("h1")}>
                  <div className="flex items-center">
                    <Heading1 className="h-4 w-4 mr-2" />
                    <span>Heading 1</span>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-2" onClick={() => handleAddElement("h2")}>
                  <div className="flex items-center">
                    <Heading2 className="h-4 w-4 mr-2" />
                    <span>Heading 2</span>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-2" onClick={() => handleAddElement("h3")}>
                  <div className="flex items-center">
                    <Heading className="h-4 w-4 mr-2" />
                    <span>Heading 3</span>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-2" onClick={() => handleAddElement("h4")}>
                  <div className="flex items-center">
                    <Heading className="h-4 w-4 mr-2" />
                    <span>Heading 4</span>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-2" onClick={() => handleAddElement("p")}>
                  <div className="flex items-center">
                    <Text className="h-4 w-4 mr-2" />
                    <span>Paragraph</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-auto py-2"
                  onClick={() => handleAddElement("span")}
                >
                  <div className="flex items-center">
                    <TextCursor className="h-4 w-4 mr-2" />
                    <span>Span</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-auto py-2"
                  onClick={() => handleAddElement("strong")}
                >
                  <div className="flex items-center">
                    <Bold className="h-4 w-4 mr-2" />
                    <span>Strong</span>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-2" onClick={() => handleAddElement("em")}>
                  <div className="flex items-center">
                    <Italic className="h-4 w-4 mr-2" />
                    <span>Emphasis</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-auto py-2"
                  onClick={() => handleAddElement("blockquote")}
                >
                  <div className="flex items-center">
                    <Quote className="h-4 w-4 mr-2" />
                    <span>Blockquote</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-auto py-2"
                  onClick={() => handleAddElement("code")}
                >
                  <div className="flex items-center">
                    <Code className="h-4 w-4 mr-2" />
                    <span>Code</span>
                  </div>
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="layout" className="mt-0">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="justify-start h-auto py-2" onClick={() => handleAddElement("div")}>
                  <div className="flex items-center">
                    <div className="bg-primary/10 p-1.5 rounded mr-3">
                      <Box className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">Div</div>
                      <div className="text-xs text-gray-500">Generic container</div>
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-auto py-2"
                  onClick={() => handleAddElement("section")}
                >
                  <div className="flex items-center">
                    <div className="bg-primary/10 p-1.5 rounded mr-3">
                      <Layout className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">Section</div>
                      <div className="text-xs text-gray-500">Thematic grouping</div>
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-auto py-2"
                  onClick={() => handleAddElement("header")}
                >
                  <div className="flex items-center">
                    <div className="bg-primary/10 p-1.5 rounded mr-3">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">Header</div>
                      <div className="text-xs text-gray-500">Page header</div>
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-auto py-2"
                  onClick={() => handleAddElement("footer")}
                >
                  <div className="flex items-center">
                    <div className="bg-primary/10 p-1.5 rounded mr-3">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">Footer</div>
                      <div className="text-xs text-gray-500">Page footer</div>
                    </div>
                  </div>
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="media" className="mt-0">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="justify-start h-auto py-2" onClick={() => handleAddElement("img")}>
                  <div className="flex items-center">
                    <div className="bg-primary/10 p-1.5 rounded mr-3">
                      <Image className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">Image</div>
                      <div className="text-xs text-gray-500">Image element</div>
                    </div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-2" onClick={() => handleAddElement("a")}>
                  <div className="flex items-center">
                    <div className="bg-primary/10 p-1.5 rounded mr-3">
                      <Link2 className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">Link</div>
                      <div className="text-xs text-gray-500">Hyperlink</div>
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-auto py-2"
                  onClick={() => handleAddElement("video")}
                >
                  <div className="flex items-center">
                    <div className="bg-primary/10 p-1.5 rounded mr-3">
                      <Video className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">Video</div>
                      <div className="text-xs text-gray-500">Video element</div>
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-auto py-2"
                  onClick={() => handleAddElement("audio")}
                >
                  <div className="flex items-center">
                    <div className="bg-primary/10 p-1.5 rounded mr-3">
                      <Music className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">Audio</div>
                      <div className="text-xs text-gray-500">Audio element</div>
                    </div>
                  </div>
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="lists" className="mt-0">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="justify-start h-auto py-2" onClick={() => handleAddElement("ul")}>
                  <div className="flex items-center">
                    <div className="bg-primary/10 p-1.5 rounded mr-3">
                      <ListChecks className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">Unordered List</div>
                      <div className="text-xs text-gray-500">Bulleted list</div>
                    </div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-2" onClick={() => handleAddElement("ol")}>
                  <div className="flex items-center">
                    <div className="bg-primary/10 p-1.5 rounded mr-3">
                      <ListOrdered className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">Ordered List</div>
                      <div className="text-xs text-gray-500">Numbered list</div>
                    </div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-2" onClick={() => handleAddElement("li")}>
                  <div className="flex items-center">
                    <div className="bg-primary/10 p-1.5 rounded mr-3">
                      <Minus className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">List Item</div>
                      <div className="text-xs text-gray-500">List item</div>
                    </div>
                  </div>
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="tables" className="mt-0">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="justify-start h-auto py-2"
                  onClick={() => handleAddElement("table")}
                >
                  <div className="flex items-center">
                    <div className="bg-primary/10 p-1.5 rounded mr-3">
                      <Table className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">Table</div>
                      <div className="text-xs text-gray-500">Table container</div>
                    </div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-2" onClick={() => handleAddElement("tr")}>
                  <div className="flex items-center">
                    <div className="bg-primary/10 p-1.5 rounded mr-3">
                      <AlignHorizontalJustifyCenter className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">Table Row</div>
                      <div className="text-xs text-gray-500">Table row</div>
                    </div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-2" onClick={() => handleAddElement("td")}>
                  <div className="flex items-center">
                    <div className="bg-primary/10 p-1.5 rounded mr-3">
                      <Square className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">Table Cell</div>
                      <div className="text-xs text-gray-500">Table data cell</div>
                    </div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-2" onClick={() => handleAddElement("th")}>
                  <div className="flex items-center">
                    <div className="bg-primary/10 p-1.5 rounded mr-3">
                      <Heading className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">Table Header</div>
                      <div className="text-xs text-gray-500">Table header cell</div>
                    </div>
                  </div>
                </Button>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default AddElementButton

