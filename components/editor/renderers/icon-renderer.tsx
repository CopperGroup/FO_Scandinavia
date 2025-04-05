"\"use client"

import type React from "react"
import DynamicIcon from "@/components/ui/dynamic-icon"
import type { ParsedElement } from "@/types/editor"

interface IconRendererProps {
  element: ParsedElement
  className?: string
}

export const IconRenderer: React.FC<IconRendererProps> = ({ element, className }) => {
  // Extract icon name from the element type
  const iconName = element.type

  // Combine classes
  const combinedClassName = `${element.className || ""} ${className || ""}`.trim()

  // Render using DynamicIcon
  return (
    <DynamicIcon name={iconName as any} className={combinedClassName || undefined} {...(element.attributes || {})} />
  )
}

export default IconRenderer

