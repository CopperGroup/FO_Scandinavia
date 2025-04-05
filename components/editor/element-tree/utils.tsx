"use client"

import type React from "react"
import * as LucideIcons from "lucide-react"
import type { ParsedElement } from "@/types/editor"

// Helper function to count elements
export const countElements = (element: ParsedElement): number => {
  let count = 1 // Count this element
  if (element.children) {
    element.children.forEach((child) => {
      count += countElements(child)
    })
  }
  return count
}

// Get element icon based on type
export const getElementIcon = (element: ParsedElement): React.ReactNode => {
  // If it's a component with componentInfo
  if (element.componentInfo?.isComponent) {
    // For Lucide icons
    if (element.componentInfo.packageName === "lucide-react") {
      const iconName = element.componentInfo.importName
      if (iconName in LucideIcons) {
        const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons]
        return <IconComponent className="h-4 w-4 text-blue-500" />
      }
    }

    // For other components
    return <LucideIcons.Component className="h-4 w-4" />
  }

  // For regular HTML elements
  switch (element.type) {
    case "div":
      return <LucideIcons.Square className="h-4 w-4" />
    case "span":
    case "p":
      return <LucideIcons.Type className="h-4 w-4" />
    case "img":
      return <LucideIcons.Image className="h-4 w-4" />
    case "button":
      return <LucideIcons.Square className="h-4 w-4" />
    case "input":
      return <LucideIcons.FormInput className="h-4 w-4" />
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return <LucideIcons.Heading1 className="h-4 w-4" />
    case "ul":
    case "ol":
      return <LucideIcons.List className="h-4 w-4" />
    case "li":
      return <LucideIcons.ListOrdered className="h-4 w-4" />
    case "a":
      return <LucideIcons.Link className="h-4 w-4" />
    default:
      // Check if the type is a Lucide icon name
      if (element.type in LucideIcons) {
        const IconComponent = LucideIcons[element.type as keyof typeof LucideIcons]
        return <IconComponent className="h-4 w-4 text-blue-500" />
      }
      return <LucideIcons.Box className="h-4 w-4" />
  }
}

