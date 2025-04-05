"use client"

import type React from "react"
import { ChevronRight, ChevronDown, Plus, Copy, Trash2 } from "lucide-react"
import type { ParsedElement } from "@/types/editor"
import { cn } from "@/lib/utils"
import { getElementIcon } from "./utils"
import { Badge } from "@/components/ui/badge"
import { useRef } from "react"

interface ElementTreeNodeProps {
  element: ParsedElement
  depth: number
  isSelected: boolean
  expandedElements: Record<string, boolean>
  toggleExpand: (id: string, e: React.MouseEvent) => void
  onElementClick: (element: ParsedElement, event: React.MouseEvent) => void
  onAddElement: (parentId: string, elementType: string) => void
  onDuplicateElement: (elementId: string) => void
  onDeleteElement: (elementId: string) => void
  onMoveElement?: (
    sourceId: string,
    targetId: string,
    position: "before" | "after" | "inside" | "outside" | "root",
  ) => void
  selectedElement: ParsedElement | null
}

export const ElementTreeNode: React.FC<ElementTreeNodeProps> = ({
  element,
  depth,
  isSelected = false,
  expandedElements,
  toggleExpand,
  onElementClick,
  onAddElement,
  onDuplicateElement,
  onDeleteElement,
  onMoveElement,
  selectedElement,
}) => {
  // Create a ref for the element div
  const elementRef = useRef<HTMLDivElement>(null)

  // Skip rendering root fragments
  if (element.isRootFragment) {
    return (
      <>
        {element.children?.map((child) => (
          <ElementTreeNode
            key={child.id}
            element={child}
            depth={depth}
            isSelected={selectedElement?.id === child.id}
            expandedElements={expandedElements}
            toggleExpand={toggleExpand}
            onElementClick={onElementClick}
            onAddElement={onAddElement}
            onDuplicateElement={onDuplicateElement}
            onDeleteElement={onDeleteElement}
            onMoveElement={onMoveElement}
            selectedElement={selectedElement}
          />
        ))}
      </>
    )
  }

  const hasChildren = element.children && element.children.length > 0
  const isExpanded = expandedElements[element.id] || false
  const isComponent = element.componentInfo?.isComponent
  const elementIcon = getElementIcon(element)

  // Handle drag start
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation()

    // Don't allow dragging the root
    if (element.id === "root") {
      e.preventDefault()
      return
    }

    // Store the element ID directly in the dataTransfer
    e.dataTransfer.setData("text/plain", element.id)
    e.dataTransfer.effectAllowed = "move"

    // Add dragging class to the element if it exists
    if (elementRef.current) {
      elementRef.current.classList.add("dragging")
    }

    // Create a custom drag preview
    try {
      const dragPreview = document.createElement("div")
      dragPreview.className =
        "bg-blue-100 border border-blue-300 rounded px-2 py-1 text-sm font-medium text-blue-800 shadow-md"
      dragPreview.textContent = `${element.type}${element.textContent ? `: ${element.textContent.substring(0, 15)}...` : ""}`
      dragPreview.style.position = "absolute"
      dragPreview.style.top = "-1000px"
      dragPreview.style.opacity = "0.9"
      document.body.appendChild(dragPreview)

      e.dataTransfer.setDragImage(dragPreview, 10, 10)

      // Remove the preview element after a short delay
      setTimeout(() => {
        if (document.body.contains(dragPreview)) {
          document.body.removeChild(dragPreview)
        }
      }, 100)
    } catch (error) {
      console.error("Error creating drag preview:", error)
    }
  }

  // Handle drag end
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation()

    // Remove dragging class from the element if it exists
    if (elementRef.current) {
      elementRef.current.classList.remove("dragging")
    }

    // Remove all drop indicators
    try {
      document.querySelectorAll(".drop-indicator").forEach((el) => {
        el.classList.remove("drop-before", "drop-after", "drop-inside", "drop-outside", "drop-root")
      })
    } catch (error) {
      console.error("Error removing drop indicators:", error)
    }
  }

  // Handle drag over
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    // We can't access dataTransfer data during dragover
    // Instead, we'll just allow the drop and check the data during the drop event
    e.dataTransfer.dropEffect = "move"

    // Get element dimensions
    if (!elementRef.current) return

    const rect = elementRef.current.getBoundingClientRect()
    const mouseY = e.clientY - rect.top
    const mouseX = e.clientX - rect.left
    const height = rect.height
    const width = rect.width

    // Remove existing indicators
    elementRef.current.classList.remove("drop-before", "drop-after", "drop-inside", "drop-outside", "drop-root")

    // Determine drop position
    let position: "before" | "after" | "inside" | "outside" | "root"

    // Special case for root element
    if (element.id === "root") {
      position = "root"
      elementRef.current.classList.add("drop-root")
      elementRef.current.setAttribute("data-drop-position", position)
      return
    }

    // Left edge (10% of width) = outside
    if (mouseX < width * 0.1) {
      position = "outside"
      elementRef.current.classList.add("drop-outside")
    }
    // Top 25% = before
    else if (mouseY < height * 0.25) {
      position = "before"
      elementRef.current.classList.add("drop-before")
    }
    // Bottom 25% = after
    else if (mouseY > height * 0.75) {
      position = "after"
      elementRef.current.classList.add("drop-after")
    }
    // Middle = inside
    else {
      position = "inside"
      elementRef.current.classList.add("drop-inside")

      // Auto-expand when hovering for inside drop
      if (hasChildren && !isExpanded) {
        toggleExpand(element.id, e as any)
      }
    }

    // Store position for drop handler
    elementRef.current.setAttribute("data-drop-position", position)
  }

  // Handle drag leave
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    // Remove drop indicators if the element exists
    if (elementRef.current) {
      elementRef.current.classList.remove("drop-before", "drop-after", "drop-inside", "drop-outside", "drop-root")
      elementRef.current.removeAttribute("data-drop-position")
    }
  }

  // Handle drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    // Get source element ID
    const sourceId = e.dataTransfer.getData("text/plain")

    console.log("Drop event triggered with sourceId:", sourceId)

    // Don't allow dropping on itself or if no source ID
    if (!sourceId || sourceId === element.id) {
      console.log("Invalid drop: same element or no source ID")
      return
    }

    // Get drop position if the element exists
    if (!elementRef.current) {
      console.error("Element reference is null during drop")
      return
    }

    const position = elementRef.current.getAttribute("data-drop-position") as
      | "before"
      | "after"
      | "inside"
      | "outside"
      | "root"

    console.log("Drop position:", position, "Target element:", element.id)

    // Remove drop indicators
    elementRef.current.classList.remove("drop-before", "drop-after", "drop-inside", "drop-outside", "drop-root")

    elementRef.current.removeAttribute("data-drop-position")

    // Add success animation
    elementRef.current.classList.add("drop-success")
    setTimeout(() => {
      if (elementRef.current) {
        elementRef.current.classList.remove("drop-success")
      }
    }, 800)

    // Call move function
    if (onMoveElement) {
      console.log("Calling onMoveElement with:", sourceId, element.id, position)
      onMoveElement(sourceId, element.id, position)
    } else {
      console.error("onMoveElement function is not defined")
    }
  }

  return (
    <div className="relative">
      <div
        ref={elementRef}
        className={cn(
          "flex items-center py-1.5 px-2 transition-colors group relative drop-indicator",
          isSelected ? "bg-blue-100 text-blue-800" : "hover:bg-gray-100",
          element.id === "root" ? "sticky top-0 z-10 bg-gray-50 border-b" : "",
          element.id !== "root" ? "cursor-grab active:cursor-grabbing" : "",
        )}
        onClick={(e) => {
          e.stopPropagation()
          onElementClick(element, e)
        }}
        draggable={element.id !== "root"}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Indentation based on depth */}
        <div style={{ width: `${depth * 12}px` }} />

        {/* Expand/collapse for elements with children */}
        {hasChildren ? (
          <button
            onClick={(e) => toggleExpand(element.id, e)}
            className="mr-1 text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <div className="w-3.5 mr-1" />
        )}

        {/* Element icon */}
        <div className={cn("mr-1.5", isComponent ? "text-blue-500" : "text-gray-500")}>{elementIcon}</div>

        {/* Element name */}
        <div className="flex-1 truncate text-sm">
          <span
            className={cn(
              "font-medium",
              isComponent ? "text-blue-600" : "",
              element.id === "root" ? "text-gray-700" : "",
            )}
          >
            {element.type}
          </span>

          {isComponent && (
            <Badge variant="outline" className="ml-1 h-4 text-[10px] bg-purple-50 text-purple-700 border-purple-200">
              component
            </Badge>
          )}

          {element.textContent && (
            <span className="ml-1 text-gray-500 text-xs truncate">
              {element.textContent.length > 20
                ? `"${element.textContent.substring(0, 20)}..."`
                : `"${element.textContent}"`}
            </span>
          )}
          {element.className && (
            <span className="ml-1 text-gray-400 text-xs truncate">
              {element.className.length > 15 ? `${element.className.substring(0, 15)}...` : element.className}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 hover:opacity-100 focus-within:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDuplicateElement(element.id)
            }}
            className="p-0.5 text-gray-500 hover:text-gray-700 rounded focus:outline-none"
            title="Duplicate element"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAddElement(element.id, "div")
            }}
            className="p-0.5 text-gray-500 hover:text-gray-700 rounded focus:outline-none"
            title="Add child element"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          {element.id !== "root" && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDeleteElement(element.id)
              }}
              className="p-0.5 text-gray-500 hover:text-red-500 rounded focus:outline-none"
              title="Delete element"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className={cn("ml-2 pl-2 border-l", isSelected ? "border-blue-200" : "border-gray-200")}>
          {element.children.map((child) => (
            <ElementTreeNode
              key={child.id}
              element={child}
              depth={depth + 1}
              isSelected={selectedElement?.id === child.id}
              expandedElements={expandedElements}
              toggleExpand={toggleExpand}
              onElementClick={onElementClick}
              onAddElement={onAddElement}
              onDuplicateElement={onDuplicateElement}
              onDeleteElement={onDeleteElement}
              onMoveElement={onMoveElement}
              selectedElement={selectedElement}
            />
          ))}
        </div>
      )}
    </div>
  )
}

