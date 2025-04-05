"use client"

import type React from "react"
import { Copy, Trash2, Component, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { ParsedElement, ImportStatement } from "@/types/editor"
import { ComponentSelector } from "../component-selector"
import AddElementButton from "../add-element-button"

interface ElementActionsProps {
  element: ParsedElement
  onAddElement: (parentId: string, elementType: string) => void
  onAddComponent?: (
    parentId: string,
    componentInfo: {
      type: string
      packageName: string
      importName: string
      importType: "default" | "named" | "namespace"
    },
  ) => void
  onDuplicateElement: (elementId: string) => void
  onDeleteElement: (elementId: string) => void
  imports: ImportStatement[]
  toggleImportActive: (id: string) => void
  onMoveElement?: (elementId: string, direction: "up" | "down") => void
}

const ElementActions: React.FC<ElementActionsProps> = ({
  element,
  onAddElement,
  onAddComponent,
  onDuplicateElement,
  onDeleteElement,
  imports = [],
  toggleImportActive,
  onMoveElement,
}) => {
  // Don't show actions for root element
  if (element.id === "root") return null

  return (
    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 z-20 flex gap-1.5 bg-white/90 shadow-md rounded-full p-1.5 border border-gray-200 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:bg-white hover:scale-105">
      {/* Add element button with modal */}
      <AddElementButton
        onAddElement={onAddElement}
        parentId={element.id}
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-full bg-green-500 text-white hover:bg-green-600 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
      >
        <Plus className="h-3.5 w-3.5" />
      </AddElementButton>

      {/* Add component button */}
      {onAddComponent && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <ComponentSelector
                triggerButton={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full bg-purple-500 text-white hover:bg-purple-600 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <Component className="h-3 w-3" />
                  </Button>
                }
                imports={imports}
                onSelectComponent={(componentInfo) => {
                  // Activate import if needed
                  if (imports && Array.isArray(imports)) {
                    const importItem = imports.find((imp) => imp.packageName === componentInfo.packageName)
                    if (importItem && !importItem.isActive && toggleImportActive) {
                      toggleImportActive(importItem.id)
                    }
                  }
                  // Add the component
                  if (onAddComponent) {
                    onAddComponent(element.id, componentInfo)
                  }
                }}
                toggleImportActive={toggleImportActive}
              />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Add Component</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Duplicate button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full bg-blue-500 text-white hover:bg-blue-600 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
              onClick={(e) => {
                e.stopPropagation()
                onDuplicateElement(element.id)
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Duplicate</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Delete button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full bg-red-500 text-white hover:bg-red-600 hover:scale-110 transition-all duration-200 shadow-sm hover:shadow-md"
              onClick={(e) => {
                e.stopPropagation()
                onDeleteElement(element.id)
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Delete</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

export default ElementActions

