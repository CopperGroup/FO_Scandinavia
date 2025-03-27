"use client"

import type React from "react"

import { ChevronRight, ChevronDown, Plus, Copy, Trash2 } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { getElementIcon } from "@/lib/editor-utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ElementCreator } from "./element-creator"
import { ParsedElement } from "@/lib/types/types"

interface ElementTreeProps {
  parsedContent: ParsedElement | null
  selectedElement: ParsedElement | null
  onElementClick: (element: ParsedElement, event: React.MouseEvent) => void
  onAddElement: (parentId: string, elementType: string, position?: number) => void
  onDuplicateElement: (elementId: string) => void
  onDeleteElement: (elementId: string) => void
}

const ElementTree: React.FC<ElementTreeProps> = ({
  parsedContent,
  selectedElement,
  onElementClick,
  onAddElement,
  onDuplicateElement,
  onDeleteElement,
}) => {
  const [expandedElements, setExpandedElements] = useState<Record<string, boolean>>({
    root: true,
  })

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedElements((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const renderElementNode = (element: ParsedElement, depth = 0) => {
    const isSelected = selectedElement?.id === element.id
    const hasChildren = element.children && element.children.length > 0
    const isExpanded = expandedElements[element.id]
    const isRoot = element.id === "root"

    return (
      <div key={element.id} className="select-none">
        <div
          className={cn(
            "flex items-center py-1.5 px-2 rounded-md my-0.5 cursor-pointer transition-colors group",
            isSelected ? "bg-blue-50 text-blue-600" : "hover:bg-gray-50",
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={(e) => onElementClick(element, e)}
        >
          {hasChildren && (
            <button className="mr-1 p-1 rounded-md hover:bg-gray-100" onClick={(e) => toggleExpand(element.id, e)}>
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          )}

          {!hasChildren && <div className="w-5" />}

          <div className="flex items-center gap-2 overflow-hidden flex-grow">
            {getElementIcon(element.type)}
            <span className="text-sm truncate">{element.type}</span>
            {element.textContent && (
              <span className="text-xs text-gray-500 truncate">
                {element.textContent.length > 15 ? element.textContent.substring(0, 15) + "..." : element.textContent}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-blue-500">
                  <Plus className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-60 p-2" side="right">
                <ElementCreator onAddElement={(type) => onAddElement(element.id, type)} />
              </PopoverContent>
            </Popover>

            {!isRoot && (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-500 hover:text-blue-500"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDuplicateElement(element.id)
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Duplicate</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-500 hover:text-red-500"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteElement(element.id)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Delete</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>{element.children!.map((child) => renderElementNode(child, depth + 1))}</div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4">
      <h2 className="text-sm font-medium mb-3 px-2 text-gray-700">Element Tree</h2>
      <div className="mt-2">{parsedContent && renderElementNode(parsedContent)}</div>
    </div>
  )
}

export default ElementTree

