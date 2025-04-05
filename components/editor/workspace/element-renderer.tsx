"use client"

// Update the transformToContainerQueries function at the top of the file to better handle container queries
const transformToContainerQueries = (className: string): string => {
  if (!className) return ""

  // Don't transform classes that already use @container syntax
  if (
    className.includes("@container") ||
    className.includes("@sm:") ||
    className.includes("@md:") ||
    className.includes("@lg:") ||
    className.includes("@xl:") ||
    className.includes("@2xl:")
  ) {
    return className
  }

  return className
    .split(" ")
    .map((cls) => {
      // Check for responsive breakpoint prefixes
      if (cls.startsWith("sm:")) return `@sm:${cls.substring(3)}`
      if (cls.startsWith("md:")) return `@md:${cls.substring(3)}`
      if (cls.startsWith("lg:")) return `@lg:${cls.substring(3)}`
      if (cls.startsWith("xl:")) return `@xl:${cls.substring(3)}`
      if (cls.startsWith("2xl:")) return `@2xl:${cls.substring(4)}`

      // Handle max-width variants
      if (cls.startsWith("max-sm:")) return `@max-sm:${cls.substring(7)}`
      if (cls.startsWith("max-md:")) return `@max-md:${cls.substring(7)}`
      if (cls.startsWith("max-lg:")) return `@max-lg:${cls.substring(7)}`
      if (cls.startsWith("max-xl:")) return `@max-xl:${cls.substring(7)}`
      if (cls.startsWith("max-2xl:")) return `@max-2xl:${cls.substring(8)}`

      return cls
    })
    .join(" ")
}

// Replace the entire ElementRenderer component with this improved version

import type React from "react"
import { useMemo, memo, useState } from "react"
import { cn } from "@/lib/utils"
import { Eye, EyeOff, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import type { ParsedElement } from "@/types/editor"
import ComponentRenderer from "../renderers/component-renderer"

interface ElementRendererProps {
  element: ParsedElement
  isEditMode: boolean
  selectedElement: ParsedElement | null
  onElementClick: (element: ParsedElement, event: React.MouseEvent) => void
  renderActions: (element: ParsedElement) => React.ReactNode
  renderChildren?: boolean
  onMoveElement?: (elementId: string, direction: "up" | "down") => void
  onDuplicateElement?: (elementId: string) => void
  onDeleteElement?: (elementId: string) => void
  onAddElement?: (parentId: string, elementType: string) => void
}

// Create a separate component for child elements to prevent unnecessary re-renders
const ChildElements = memo(
  ({
    children,
    isEditMode,
    selectedElement,
    onElementClick,
    renderActions,
    onMoveElement,
    onDuplicateElement,
    onDeleteElement,
    onAddElement,
  }: {
    children: ParsedElement[]
    isEditMode: boolean
    selectedElement: ParsedElement | null
    onElementClick: (element: ParsedElement, event: React.MouseEvent) => void
    renderActions: (element: ParsedElement) => React.ReactNode
    onMoveElement?: (elementId: string, direction: "up" | "down") => void
    onDuplicateElement?: (elementId: string) => void
    onDeleteElement?: (elementId: string) => void
    onAddElement?: (parentId: string, elementType: string) => void
  }) => {
    return (
      <>
        {children.map((child) => (
          <ElementRenderer
            key={child.id}
            element={child}
            isEditMode={isEditMode}
            selectedElement={selectedElement}
            onElementClick={onElementClick}
            renderActions={renderActions}
            onMoveElement={onMoveElement}
            onDuplicateElement={onDuplicateElement}
            onDeleteElement={onDeleteElement}
            onAddElement={onAddElement}
          />
        ))}
      </>
    )
  },
)
ChildElements.displayName = "ChildElements"

// Improved ElementRenderer component
const ElementRenderer: React.FC<ElementRendererProps> = ({
  element,
  isEditMode,
  selectedElement,
  onElementClick,
  renderActions,
  renderChildren = true,
  onMoveElement,
  onDuplicateElement,
  onDeleteElement,
  onAddElement,
}) => {
  const isSelected = selectedElement?.id === element.id
  const elementStyle = element.style || {}
  const [isHidden, setIsHidden] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const hasChildren = element.children && element.children.length > 0

  // Memoize the click handler to prevent unnecessary re-renders
  const handleClick = useMemo(() => {
    return (e: React.MouseEvent) => {
      if (isEditMode) {
        e.stopPropagation()
        onElementClick(element, e)
      }
    }
  }, [isEditMode, element, onElementClick])

  // Update the elementClassName calculation in the ElementRenderer component
  const elementClassName = cn(
    "relative transition-all",
    isEditMode && "hover:bg-gray-50/70",
    isSelected && isEditMode && "bg-blue-50/40",
    isHidden && "opacity-40",
  )

  // Update the main div in the ElementRenderer component to properly support container queries
  // Replace the return statement in ElementRenderer with this updated version
  return (
    <div
      key={element.id}
      className={cn(
        "relative transition-all duration-200 ease-in-out transform motion-reduce:transition-none animate-in fade-in-50",
        isEditMode && "hover:bg-gray-50/70",
        isSelected && isEditMode && "bg-blue-50/40",
        isHidden && "opacity-40",
        // Check if element is a container by looking for container-related classes
        element.className &&
          (element.className.includes("container") ||
            element.className.includes("grid") ||
            element.className.includes("flex")) &&
          "@container",
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      data-element-id={element.id}
      style={{
        ...(element.className &&
          (element.className.includes("container") ||
            element.className.includes("grid") ||
            element.className.includes("flex")) && {
            containerType: "inline-size",
            contain: "layout style",
          }),
      }}
    >
      {/* Element type badge - only visible when selected */}
      {isEditMode && isSelected && (
        <div
          className={cn(
            "absolute top-0 left-0 z-10 flex items-center text-xs rounded-br",
            "bg-blue-100/70 text-blue-800",
            "transition-all duration-200 ease-in-out opacity-0 scale-95 origin-top-left",
            isSelected && "opacity-100 scale-100",
          )}
        >
          <span className="px-1 py-0.5 font-medium">{element.type}</span>
          {element.componentInfo?.isComponent && (
            <Badge
              variant="outline"
              className="h-4 text-[10px] ml-1 mr-1 bg-purple-50/80 text-purple-700 border-purple-200"
            >
              component
            </Badge>
          )}
        </div>
      )}

      {/* Element controls - visible ONLY when selected */}
      {isEditMode && isSelected && (
        <div
          className="absolute -top-7 left-0 z-20 flex items-center gap-1 bg-white/80 shadow-sm rounded-md p-0.5 border border-gray-100 transition-all duration-200 ease-in-out opacity-0 scale-95 origin-bottom transform animate-in slide-in-from-top-2"
          style={{ opacity: isSelected ? 1 : 0, transform: isSelected ? "scale(1)" : "scale(0.95)" }}
        >
          {/* Element visibility toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-5 w-5 bg-gray-50/80 hover:bg-gray-100",
                    isHidden ? "text-gray-400" : "text-gray-700",
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsHidden(!isHidden)
                  }}
                >
                  {isHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{isHidden ? "Show Element" : "Hide Element"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Element movement controls */}
          {onMoveElement && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 bg-gray-50/80 text-gray-700 hover:bg-gray-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        onMoveElement(element.id, "up")
                      }}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Move Up</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 bg-gray-50/80 text-gray-700 hover:bg-gray-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        onMoveElement(element.id, "down")
                      }}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Move Down</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
      )}

      {/* Apply visual indicators directly to the component itself */}
      {element.type === "img" ? (
        <img
          src={element.attributes?.src || "/placeholder.svg?height=200&width=300"}
          alt={element.attributes?.alt || ""}
          className={cn(
            transformToContainerQueries(element.className),
            isEditMode && "min-h-[24px] min-w-[24px]",
            isEditMode && isSelected && "ring-1 ring-blue-300/70 ring-inset",
            isEditMode && isHovering && !isSelected && "ring-1 ring-gray-200/50 ring-inset",
          )}
          width={element.attributes?.width ? Number.parseInt(element.attributes.width) : undefined}
          height={element.attributes?.height ? Number.parseInt(element.attributes.height) : undefined}
          style={{
            ...elementStyle,
            ...(isEditMode && hasChildren ? { paddingBottom: "1rem" } : {}),
          }}
        />
      ) : element.type === "a" ? (
        <a
          href={isEditMode ? "#" : element.attributes?.href || "#"}
          target={element.attributes?.target}
          className={cn(
            transformToContainerQueries(element.className),
            isEditMode && "min-h-[24px] min-w-[24px]",
            isEditMode && isSelected && "ring-1 ring-blue-300/70 ring-inset",
            isEditMode && isHovering && !isSelected && "ring-1 ring-gray-200/50 ring-inset",
            isEditMode && hasChildren && "pb-4",
          )}
          onClick={(e) => isEditMode && e.preventDefault()}
          style={{
            ...elementStyle,
            position: "relative",
          }}
        >
          {element.textContent}
          {renderChildren &&
            element.children &&
            element.children.map((child) => (
              <ElementRenderer
                key={child.id}
                element={child}
                isEditMode={isEditMode}
                selectedElement={selectedElement}
                onElementClick={onElementClick}
                renderActions={renderActions}
                onMoveElement={onMoveElement}
                onDuplicateElement={onDuplicateElement}
                onDeleteElement={onDeleteElement}
                onAddElement={onAddElement}
              />
            ))}

          {/* Element dimensions indicator when selected */}
          {isEditMode && isSelected && (
            <div
              className="absolute bottom-0 right-0 bg-blue-100/70 text-blue-800 text-xs px-1 py-0.5 rounded-tl transition-all duration-200 ease-in-out opacity-0 scale-95 origin-bottom-right"
              style={{ opacity: isSelected ? 1 : 0, transform: isSelected ? "scale(1)" : "scale(0.95)" }}
            >
              {element.attributes?.width || "auto"} × {element.attributes?.height || "auto"}
            </div>
          )}

          {/* Parent indicator for elements with children */}
          {isEditMode && hasChildren && isSelected && (
            <div
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200/40 to-blue-300/40 transition-all duration-300 ease-in-out origin-center"
              style={{ transform: isSelected ? "scaleX(1)" : "scaleX(0)" }}
            ></div>
          )}
        </a>
      ) : element.componentInfo?.isComponent ? (
        <div className="relative" style={{ display: "contents" }}>
          <ComponentRenderer
            element={{
              ...element,
              className: cn(
                transformToContainerQueries(element.className),
                // Don't apply min-height/width for images with fill attribute
                isEditMode &&
                  !(element.type === "img" && element.attributes?.fill === "true") &&
                  "min-h-[24px] min-w-[24px]",
                isEditMode && isSelected && "ring-1 ring-blue-300/70 ring-inset",
                isEditMode && isHovering && !isSelected && "ring-1 ring-gray-200/50 ring-inset",
                isEditMode && hasChildren && "pb-4",
              ),
              style: {
                ...element.style,
                position: isEditMode ? "relative" : element.style?.position,
                ...(isEditMode && hasChildren ? { paddingBottom: "1rem" } : {}),
                // Remove any explicit width/height for images with fill attribute
                ...(element.type === "img" && element.attributes?.fill === "true" && isEditMode
                  ? { width: undefined, height: undefined }
                  : {}),
              },
            }}
            isEditMode={isEditMode}
          >
            {renderChildren &&
              element.children &&
              element.children.map((child) => (
                <ElementRenderer
                  key={child.id}
                  element={child}
                  isEditMode={isEditMode}
                  selectedElement={selectedElement}
                  onElementClick={onElementClick}
                  renderActions={renderActions}
                  onMoveElement={onMoveElement}
                  onDuplicateElement={onDuplicateElement}
                  onDeleteElement={onDeleteElement}
                  onAddElement={onAddElement}
                />
              ))}
          </ComponentRenderer>

          {/* Element dimensions indicator when selected */}
          {isEditMode && isSelected && (
            <div className="absolute bottom-0 right-0 bg-blue-100/70 text-blue-800 text-xs px-1 py-0.5 rounded-tl z-10">
              {element.attributes?.width || "auto"} × {element.attributes?.height || "auto"}
            </div>
          )}

          {/* Parent indicator for elements with children */}
          {isEditMode && hasChildren && isSelected && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200/40 to-blue-300/40 z-10"></div>
          )}
        </div>
      ) : (
        <div
          className={cn(
            "relative",
            isEditMode && "min-h-[24px] min-w-[24px]",
            transformToContainerQueries(element.className),
            isEditMode && isSelected && "ring-1 ring-blue-300/70 ring-inset",
            isEditMode && isHovering && !isSelected && "ring-1 ring-gray-200/50 ring-inset",
            isEditMode && hasChildren && "pb-4",
          )}
          style={{
            ...elementStyle,
            ...(isEditMode && hasChildren ? { paddingBottom: "1rem" } : {}),
          }}
        >
          {element.textContent}
          {renderChildren &&
            element.children &&
            element.children.map((child) => (
              <ElementRenderer
                key={child.id}
                element={child}
                isEditMode={isEditMode}
                selectedElement={selectedElement}
                onElementClick={onElementClick}
                renderActions={renderActions}
                onMoveElement={onMoveElement}
                onDuplicateElement={onDuplicateElement}
                onDeleteElement={onDeleteElement}
                onAddElement={onAddElement}
              />
            ))}

          {/* Element dimensions indicator when selected */}
          {isEditMode && isSelected && (
            <div className="absolute bottom-0 right-0 bg-blue-100/70 text-blue-800 text-xs px-1 py-0.5 rounded-tl">
              {element.attributes?.width || "auto"} × {element.attributes?.height || "auto"}
            </div>
          )}

          {/* Parent indicator for elements with children */}
          {isEditMode && hasChildren && isSelected && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200/40 to-blue-300/40"></div>
          )}
        </div>
      )}

      {isEditMode && isSelected && renderActions(element)}
    </div>
  )
}

export default memo(ElementRenderer)

