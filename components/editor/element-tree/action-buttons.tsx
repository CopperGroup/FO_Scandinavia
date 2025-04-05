"use client"

import type React from "react"
import { ComponentSelector } from "../component-selector"
import type { ImportStatement } from "@/types/editor"
import type { ParsedElement } from "@/lib/editor/element-parser"
import AddElementButton from "../add-element-button"

interface ActionButtonsProps {
  onAddElement: (parentId: string, elementType: string, position?: number) => void
  onAddComponent?: (
    parentId: string,
    componentInfo: {
      type: string
      packageName: string
      importName: string
      importType: "default" | "named" | "namespace"
    },
  ) => void
  onElementClick?: (element: ParsedElement, event: React.MouseEvent) => void
  parsedContent: ParsedElement | null
  imports: ImportStatement[]
  toggleImportActive: (id: string) => void
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onAddElement,
  onAddComponent,
  imports,
  toggleImportActive,
  onElementClick,
  parsedContent,
}) => {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <AddElementButton
        onAddElement={onAddElement}
        parentId="root"
        variant="outline"
        size="sm"
        className="h-8 text-xs"
      />

      {onAddComponent && (
        <ComponentSelector
          imports={imports}
          onSelectComponent={(componentInfo) => {
            onAddComponent("root", componentInfo)
          }}
          toggleImportActive={toggleImportActive}
        />
      )}
    </div>
  )
}

