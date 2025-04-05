"use client"

import type React from "react"

import { cn } from "@/lib/utils"
import type { ParsedElement } from "./types"
import { Box, ChevronRight, Image, Link, Type } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BreadcrumbsProps {
  breadcrumbs: ParsedElement[]
  selectedElement: ParsedElement | null
  onElementClick: (element: ParsedElement, event: React.MouseEvent) => void
}

// Get element type icon
const getElementIcon = (type: string) => {
  switch (type) {
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
    case "p":
    case "span":
      return <Type className="h-4 w-4" />
    case "img":
      return <Image className="h-4 w-4" />
    case "a":
      return <Link className="h-4 w-4" />
    case "div":
      return <Box className="h-4 w-4" />
    case "button":
      return <Button className="h-4 w-4" />
    default:
      return <Box className="h-4 w-4" />
  }
}

export const Breadcrumbs = ({ breadcrumbs, selectedElement, onElementClick }: BreadcrumbsProps) => {
  if (breadcrumbs.length === 0) return null

  return (
    <div className="flex items-center text-sm text-gray-500 mb-4 overflow-x-auto">
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.id} className="flex items-center">
          {index > 0 && <ChevronRight className="h-3 w-3 mx-1" />}
          <button
            className={cn(
              "px-2 py-1 rounded hover:bg-gray-100 flex items-center gap-1",
              selectedElement?.id === crumb.id && "bg-blue-100 text-blue-700 hover:bg-blue-100",
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

export default Breadcrumbs

