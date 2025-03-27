"use client"

import type React from "react"

import { useRef } from "react"
import { ChevronRight, Plus, Copy, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { getElementIcon } from "@/lib/editor-utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ElementCreator } from "./element-creator"
import { ParsedElement } from "@/lib/types/types"

interface EditorWorkspaceProps {
  content: string
  parsedContent: ParsedElement | null
  selectedElement: ParsedElement | null
  isEditMode: boolean
  breadcrumbs: ParsedElement[]
  onElementClick: (element: ParsedElement, event: React.MouseEvent) => void
  onAddElement: (parentId: string, elementType: string, position?: number) => void
  onDuplicateElement: (elementId: string) => void
  onDeleteElement: (elementId: string) => void
}

const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
  content,
  parsedContent,
  selectedElement,
  isEditMode,
  breadcrumbs,
  onElementClick,
  onAddElement,
  onDuplicateElement,
  onDeleteElement,
}) => {
  const contentRef = useRef<HTMLDivElement>(null)

  // Render breadcrumbs
  const renderBreadcrumbs = () => {
    if (breadcrumbs.length === 0) return null

    return (
      <div className="flex items-center text-sm text-gray-500 mb-4 overflow-x-auto p-2 bg-white rounded-md shadow-sm">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.id} className="flex items-center">
            {index > 0 && <ChevronRight className="h-3 w-3 mx-1 text-gray-400" />}
            <button
              className={cn(
                "px-2 py-1 rounded-md hover:bg-gray-100 flex items-center gap-1 transition-colors",
                selectedElement?.id === crumb.id && "bg-blue-50 text-blue-600 hover:bg-blue-50",
              )}
              onClick={(e) => onElementClick(crumb, e)}
            >
              {getElementIcon(crumb.type)}
              <span>{crumb.type}</span>
            </button>
          </div>
        ))}
      </div>
    )
  }

  // Render element actions (add, duplicate, delete)
  const renderElementActions = (element: ParsedElement) => {
    // Don't show actions for root element
    if (element.id === "root") return null

    return (
      <div className="absolute -top-6 left-0 flex items-center gap-1 z-20">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 bg-blue-500 text-white hover:bg-blue-600"
                onClick={(e) => {
                  e.stopPropagation()
                  onDuplicateElement(element.id)
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Duplicate Element</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 bg-red-500 text-white hover:bg-red-600"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteElement(element.id)
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Delete Element</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    )
  }

  // Render add element button
  const renderAddElementButton = (element: ParsedElement) => {
    return (
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 z-20">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6 rounded-full bg-white border-dashed border-gray-300 hover:border-blue-500 hover:text-blue-500"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-2">
            <ElementCreator onAddElement={(type) => onAddElement(element.id, type)} />
          </PopoverContent>
        </Popover>
      </div>
    )
  }

  // Render a parsed element
  const renderElement = (element: ParsedElement) => {
    const isSelected = selectedElement?.id === element.id

    return (
      <div
        key={element.id}
        className={cn(
          "relative border-2 border-transparent transition-all",
          isEditMode && "hover:border-gray-300 hover:cursor-pointer",
          isSelected && "border-blue-500 ring-2 ring-blue-100",
        )}
        onClick={(e) => onElementClick(element, e)}
        style={element.style || {}}
      >
        {isEditMode && (
          <>
            <div
              className={cn(
                "absolute -top-6 right-0 text-xs px-2 py-1 rounded-md flex items-center gap-1 z-10",
                isSelected ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700",
              )}
            >
              {getElementIcon(element.type)}
              <span>{element.type}</span>
            </div>

            {isSelected && renderElementActions(element)}
            {isSelected && renderAddElementButton(element)}
          </>
        )}

        {element.type === "img" ? (
          <img
            src={element.attributes?.src || "/placeholder.svg?height=200&width=300"}
            alt={element.attributes?.alt || ""}
            className={element.className}
            width={element.attributes?.width ? Number.parseInt(element.attributes.width) : undefined}
            height={element.attributes?.height ? Number.parseInt(element.attributes.height) : undefined}
            style={element.style || {}}
          />
        ) : element.type === "a" ? (
          <a
            href={isEditMode ? "#" : element.attributes?.href || "#"}
            target={element.attributes?.target}
            className={element.className}
            onClick={(e) => isEditMode && e.preventDefault()}
            style={element.style || {}}
          >
            {element.textContent}
          </a>
        ) : (
          <div className={element.className} style={element.style || {}}>
            {element.textContent || ""}
            {element.children && element.children.map((child) => renderElement(child))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 h-full">
      {isEditMode && renderBreadcrumbs()}

      <div className="bg-white rounded-lg shadow-sm p-6 min-h-[calc(100vh-12rem)]">
        {isEditMode && parsedContent ? (
          <div ref={contentRef} className="relative">
            {renderElement(parsedContent)}
          </div>
        ) : (
          <div ref={contentRef} dangerouslySetInnerHTML={{ __html: content }} />
        )}
      </div>
    </div>
  )
}

export default EditorWorkspace

