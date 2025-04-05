"use client"

import type React from "react"
import { cn } from "@/lib/utils"
import { getElementIcon } from "@/lib/editor-utils"
import type { ParsedElement } from "@/types/editor"

interface ElementLabelProps {
  element: ParsedElement
  isSelected: boolean
}

const ElementLabel: React.FC<ElementLabelProps> = ({ element, isSelected }) => {
  const isComponent = element.componentInfo?.isComponent

  return (
    <div
      className={cn(
        "absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs px-2 py-1 rounded-md flex items-center gap-1 z-10",
        isSelected ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700",
      )}
    >
      {getElementIcon(element.type)}
      <span>
        {isComponent && element.componentInfo?.importName ? element.componentInfo.importName : element.type}
        {isComponent && !element.componentInfo?.importName && (
          <span className={cn("ml-1 text-xs", isSelected ? "text-blue-100" : "text-purple-600")}>(Component)</span>
        )}
      </span>
      {element.animations?.enabled && (
        <span className="ml-1 text-xs bg-purple-100 text-purple-800 px-1 rounded">Animated</span>
      )}
    </div>
  )
}

export default ElementLabel

