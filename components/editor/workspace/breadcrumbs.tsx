"use client"

import type React from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ParsedElement } from "@/types/editor"
import * as LucideIcons from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface BreadcrumbsProps {
  breadcrumbs: ParsedElement[]
  selectedElement: ParsedElement | null
  onElementClick: (element: ParsedElement, event: React.MouseEvent) => void
}

// Get element type icon
const getElementIcon = (element: ParsedElement) => {
  // If it's a component with componentInfo
  if (element.componentInfo?.isComponent) {
    // For Lucide icons
    if (element.componentInfo.packageName === "lucide-react") {
      const IconComponent = LucideIcons[element.componentInfo.importName as keyof typeof LucideIcons]
      if (IconComponent) {
        return <IconComponent className="h-4 w-4" />
      }
    }

    // For shadcn components
    if (element.componentInfo.packageName === "@/components/ui/button") {
      return <LucideIcons.Square className="h-4 w-4 text-primary" />
    }

    // For other components
    return <LucideIcons.Component className="h-4 w-4" />
  }

  // For regular HTML elements
  switch (element.type) {
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
    case "p":
    case "span":
      return <LucideIcons.Type className="h-4 w-4" />
    case "img":
      return <LucideIcons.Image className="h-4 w-4" />
    case "a":
      return <LucideIcons.Link className="h-4 w-4" />
    case "div":
      return <LucideIcons.Box className="h-4 w-4" />
    case "button":
      return <LucideIcons.Square className="h-4 w-4" />
    default:
      return <LucideIcons.Box className="h-4 w-4" />
  }
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ breadcrumbs, selectedElement, onElementClick }) => {
  if (breadcrumbs.length === 0) return null

  return (
    <div className="flex items-center text-sm overflow-x-auto py-1.5 px-3 bg-white rounded-md shadow-sm border">
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.id} className="flex items-center">
          {index > 0 && <ChevronRight className="h-3 w-3 mx-1 text-gray-400 flex-shrink-0" />}
          <button
            className={cn(
              "px-1.5 py-0.5 rounded-md hover:bg-gray-100 flex items-center gap-1 transition-colors whitespace-nowrap",
              selectedElement?.id === crumb.id && "bg-blue-50 text-blue-600 hover:bg-blue-50",
            )}
            onClick={(e) => onElementClick(crumb, e)}
          >
            <span className="flex-shrink-0">{getElementIcon(crumb)}</span>
            <span className="font-medium">
              {crumb.componentInfo?.isComponent && crumb.componentInfo?.importName
                ? crumb.componentInfo.importName
                : crumb.type}
            </span>

            {crumb.id !== "root" && (
              <Badge variant="outline" className="ml-1 h-3.5 text-[9px] bg-gray-50">
                {crumb.id.substring(0, 4)}
              </Badge>
            )}

            {crumb.className && (
              <span className="text-xs text-gray-500 ml-1 hidden md:inline-block">
                {crumb.className.split(" ")[0]}
                {crumb.className.split(" ").length > 1 && "..."}
              </span>
            )}
          </button>
        </div>
      ))}
    </div>
  )
}

export default Breadcrumbs

