"use client"

// Replace the entire ElementCreator component with a modal-based approach
import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Plus } from "lucide-react"
import {
  Type,
  Image,
  Link,
  Box,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  MousePointer,
  ListOrdered,
  ListChecks,
  Table,
  FileIcon,
  Layout,
  Layers,
  Grid,
  Columns,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface ElementCreatorProps {
  onAddElement: (elementType: string) => void
  triggerButton?: React.ReactNode
}

export const ElementCreator: React.FC<ElementCreatorProps> = ({ onAddElement, triggerButton }) => {
  const [customTag, setCustomTag] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()

  const elementGroups = [
    {
      name: "layout",
      label: "Layout",
      elements: [
        { type: "div", label: "Div", icon: <Box className="h-4 w-4" />, description: "Generic container" },
        { type: "section", label: "Section", icon: <Layout className="h-4 w-4" />, description: "Thematic grouping" },
        {
          type: "article",
          label: "Article",
          icon: <FileIcon className="h-4 w-4" />,
          description: "Self-contained content",
        },
        { type: "header", label: "Header", icon: <Layers className="h-4 w-4" />, description: "Introductory content" },
        { type: "footer", label: "Footer", icon: <Layers className="h-4 w-4" />, description: "Footer section" },
        { type: "main", label: "Main", icon: <Layout className="h-4 w-4" />, description: "Main content" },
        { type: "aside", label: "Aside", icon: <Columns className="h-4 w-4" />, description: "Sidebar content" },
        { type: "nav", label: "Nav", icon: <Grid className="h-4 w-4" />, description: "Navigation links" },
      ],
    },
    {
      name: "text",
      label: "Text",
      elements: [
        { type: "p", label: "Paragraph", icon: <AlignLeft className="h-4 w-4" />, description: "Paragraph of text" },
        { type: "h1", label: "Heading 1", icon: <Heading1 className="h-4 w-4" />, description: "Main heading" },
        { type: "h2", label: "Heading 2", icon: <Heading2 className="h-4 w-4" />, description: "Subheading" },
        { type: "h3", label: "Heading 3", icon: <Heading3 className="h-4 w-4" />, description: "Sub-subheading" },
        { type: "span", label: "Span", icon: <Type className="h-4 w-4" />, description: "Inline text container" },
        { type: "strong", label: "Strong", icon: <Type className="h-4 w-4" />, description: "Important text" },
        { type: "em", label: "Emphasis", icon: <Type className="h-4 w-4" />, description: "Emphasized text" },
      ],
    },
    {
      name: "media",
      label: "Media",
      elements: [
        { type: "img", label: "Image", icon: <Image className="h-4 w-4" />, description: "Image element" },
        { type: "a", label: "Link", icon: <Link className="h-4 w-4" />, description: "Hyperlink" },
        {
          type: "button",
          label: "Button",
          icon: <MousePointer className="h-4 w-4" />,
          description: "Clickable button",
        },
        { type: "icon", label: "Icon", icon: <FileIcon className="h-4 w-4" />, description: "Icon element" },
        { type: "video", label: "Video", icon: <FileIcon className="h-4 w-4" />, description: "Video element" },
        { type: "audio", label: "Audio", icon: <FileIcon className="h-4 w-4" />, description: "Audio element" },
      ],
    },
    {
      name: "lists",
      label: "Lists",
      elements: [
        { type: "ul", label: "Unordered List", icon: <ListChecks className="h-4 w-4" />, description: "Bulleted list" },
        { type: "ol", label: "Ordered List", icon: <ListOrdered className="h-4 w-4" />, description: "Numbered list" },
        { type: "li", label: "List Item", icon: <ListChecks className="h-4 w-4" />, description: "List item" },
        {
          type: "dl",
          label: "Definition List",
          icon: <ListChecks className="h-4 w-4" />,
          description: "Definition list",
        },
        {
          type: "dt",
          label: "Definition Term",
          icon: <ListChecks className="h-4 w-4" />,
          description: "Definition term",
        },
        {
          type: "dd",
          label: "Definition Description",
          icon: <ListChecks className="h-4 w-4" />,
          description: "Definition description",
        },
      ],
    },
    {
      name: "tables",
      label: "Tables",
      elements: [
        { type: "table", label: "Table", icon: <Table className="h-4 w-4" />, description: "Table container" },
        {
          type: "thead",
          label: "Table Head",
          icon: <Table className="h-4 w-4" />,
          description: "Table header section",
        },
        { type: "tbody", label: "Table Body", icon: <Table className="h-4 w-4" />, description: "Table body section" },
        { type: "tr", label: "Table Row", icon: <Table className="h-4 w-4" />, description: "Table row" },
        { type: "td", label: "Table Cell", icon: <Table className="h-4 w-4" />, description: "Table data cell" },
        { type: "th", label: "Table Header", icon: <Table className="h-4 w-4" />, description: "Table header cell" },
      ],
    },
  ]

  // Filter elements based on search query
  const filteredElements = searchQuery
    ? elementGroups.flatMap((group) =>
        group.elements.filter(
          (el) =>
            el.type.includes(searchQuery.toLowerCase()) ||
            el.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (el.description && el.description.toLowerCase().includes(searchQuery.toLowerCase())),
        ),
      )
    : []

  // Update the handleElementSelect function to directly add the element
  const handleElementSelect = (elementType: string) => {
    onAddElement(elementType)
    setIsOpen(false)
    // Show toast notification for element addition with purple variant
    toast({
      description: `Added ${elementType} component`,
      variant: "purple",
    })
    setSearchQuery("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton ? (
          triggerButton
        ) : (
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Add Element
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add Element</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search elements..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {searchQuery ? (
            <div className="mt-2">
              <h4 className="text-xs font-medium text-gray-500 mb-2">Search Results</h4>
              <ScrollArea className="h-[300px] pr-3">
                <div className="grid grid-cols-2 gap-2">
                  {filteredElements.length > 0 ? (
                    filteredElements.map((element) => (
                      <Button
                        key={element.type}
                        variant="outline"
                        className="justify-start h-auto py-2"
                        onClick={() => {
                          handleElementSelect(element.type)
                          setIsOpen(false)
                        }}
                      >
                        <div className="flex items-center">
                          <div className="bg-primary/10 p-1.5 rounded mr-3">{element.icon}</div>
                          <div className="text-left">
                            <div className="text-sm font-medium">{element.label}</div>
                            <div className="text-xs text-gray-500">{element.description}</div>
                          </div>
                        </div>
                      </Button>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 col-span-2">No elements found</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <Tabs defaultValue="layout">
              <TabsList className="grid grid-cols-5 mb-2">
                <TabsTrigger value="layout">Layout</TabsTrigger>
                <TabsTrigger value="text">Text</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
                <TabsTrigger value="lists">Lists</TabsTrigger>
                <TabsTrigger value="tables">Tables</TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[300px] pr-3">
                {elementGroups
                  .filter((group) => group.name !== "forms")
                  .map((group) => (
                    <TabsContent key={group.name} value={group.name} className="mt-0">
                      <div className="grid grid-cols-2 gap-2">
                        {group.elements.map((element) => (
                          <Button
                            key={element.type}
                            variant="outline"
                            className="justify-start h-auto py-2"
                            onClick={() => {
                              onAddElement(element.type)
                              setIsOpen(false)
                              // Show toast notification for element addition with purple variant
                              toast({
                                description: `Added ${element.type} component`,
                                variant: "purple",
                              })
                            }}
                          >
                            <div className="flex items-center">
                              <div className="bg-primary/10 p-1.5 rounded mr-3">{element.icon}</div>
                              <div className="text-left">
                                <div className="text-sm font-medium">{element.label}</div>
                                <div className="text-xs text-gray-500">{element.description}</div>
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
              </ScrollArea>
            </Tabs>
          )}

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
                  handleElementSelect(customTag.trim().toLowerCase())
                  setCustomTag("")
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

