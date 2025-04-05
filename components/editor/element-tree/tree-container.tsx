"use client"

import type React from "react"
import { useRef } from "react"
import type { ParsedElement } from "@/types/editor"
import { ElementTreeNode } from "./element-tree-node"

interface TreeContainerProps {
  parsedContent: ParsedElement | null
  selectedElement: ParsedElement | null
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
  treeContainerRef: React.RefObject<HTMLDivElement>
  filterElements?: (element: ParsedElement) => boolean
}

export const TreeContainer: React.FC<TreeContainerProps> = ({
  parsedContent,
  selectedElement,
  expandedElements,
  toggleExpand,
  onElementClick,
  onAddElement,
  onDuplicateElement,
  onDeleteElement,
  onMoveElement,
  treeContainerRef,
  filterElements,
}) => {
  // Create a ref for the container div
  const containerRef = useRef<HTMLDivElement>(null)

  // Common element types for quick addition
  const commonElementTypes = [
    { type: "div", label: "Div" },
    { type: "p", label: "Paragraph" },
    { type: "h1", label: "Heading 1" },
    { type: "h2", label: "Heading 2" },
    { type: "button", label: "Button" },
    { type: "img", label: "Image" },
    { type: "a", label: "Link" },
    { type: "span", label: "Span" },
    { type: "ul", label: "List" },
    { type: "input", label: "Input" },
  ]

  // Handle adding element at root level
  const handleAddRootElement = (elementType: string) => {
    if (parsedContent) {
      onAddElement("root", elementType)
    }
  }

  // Handle drag over on container
  const handleContainerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    // Only handle if dragging directly over the container
    if (e.target !== e.currentTarget) return

    // We can't access dataTransfer data during dragover
    // Instead, we'll just allow the drop and check the data during the drop event
    e.dataTransfer.dropEffect = "move"

    // Add visual indicator if the container exists
    if (containerRef.current) {
      containerRef.current.classList.add("container-drop-target")
    }
  }

  // Handle drag leave on container
  const handleContainerDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    // Only handle if leaving the container itself
    if (e.target !== e.currentTarget) return

    // Remove visual indicator if the container exists
    if (containerRef.current) {
      containerRef.current.classList.remove("container-drop-target")
    }
  }

  // Handle drop on container
  const handleContainerDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    console.log("Container drop event triggered")

    // Only handle if dropping directly on the container
    if (e.target !== e.currentTarget) {
      console.log("Not dropping directly on container, target:", e.target)
      return
    }

    // Get source element ID
    const sourceId = e.dataTransfer.getData("text/plain")

    console.log("Container drop with sourceId:", sourceId)

    // Don't allow dropping root or if no source ID
    if (!sourceId || sourceId === "root") {
      console.log("Invalid container drop: root element or no source ID")
      return
    }

    // Remove visual indicator if the container exists
    if (containerRef.current) {
      containerRef.current.classList.remove("container-drop-target")

      // Add success animation
      containerRef.current.classList.add("container-drop-success")
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.classList.remove("container-drop-success")
        }
      }, 800)
    }

    // Move element to root
    if (onMoveElement && parsedContent) {
      console.log("Calling onMoveElement for container drop with:", sourceId, "root", "root")
      onMoveElement(sourceId, "root", "root")
    } else {
      console.error("onMoveElement function is not defined or parsedContent is null")
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-2 border-b">
        <h3 className="text-sm font-medium">Elements</h3>
      </div>

      <div
        className="flex-1 overflow-y-auto border bg-white relative"
        ref={(el) => {
          // Set both refs to the same element
          if (el) {
            if (typeof treeContainerRef === "function") {
              treeContainerRef(el)
            } else if (treeContainerRef) {
              treeContainerRef.current = el
            }
            containerRef.current = el
          }
        }}
        onDragOver={handleContainerDragOver}
        onDragLeave={handleContainerDragLeave}
        onDrop={handleContainerDrop}
      >
        <style jsx global>{`
          /* Drop indicators */
          .drop-before {
            border-top: 2px solid #3b82f6 !important;
            position: relative;
          }
          
          .drop-before::after {
            content: "Before";
            position: absolute;
            right: 8px;
            top: -18px;
            background-color: #3b82f6;
            color: white;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            pointer-events: none;
            z-index: 100;
          }
          
          .drop-after {
            border-bottom: 2px solid #3b82f6 !important;
            position: relative;
          }
          
          .drop-after::after {
            content: "After";
            position: absolute;
            right: 8px;
            bottom: -18px;
            background-color: #3b82f6;
            color: white;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            pointer-events: none;
            z-index: 100;
          }
          
          .drop-inside {
            background-color: rgba(59, 130, 246, 0.15) !important;
            box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.6) !important;
            position: relative;
          }
          
          .drop-inside::after {
            content: "Inside";
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            background-color: #3b82f6;
            color: white;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            pointer-events: none;
            z-index: 100;
          }
          
          .drop-outside {
            border-left: 4px solid #f97316 !important;
            background-color: rgba(249, 115, 22, 0.1) !important;
            position: relative;
          }
          
          .drop-outside::after {
            content: "Outside";
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            background-color: #f97316;
            color: white;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            pointer-events: none;
            z-index: 100;
          }
          
          .drop-root {
            background-color: rgba(16, 185, 129, 0.1) !important;
            box-shadow: inset 0 0 0 2px rgba(16, 185, 129, 0.6) !important;
            position: relative;
          }
          
          .drop-root::after {
            content: "Root";
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            background-color: #10b981;
            color: white;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            pointer-events: none;
            z-index: 100;
          }
          
          .dragging {
            opacity: 0.5;
            border: 1px dashed #3b82f6;
          }
          
          .drop-success {
            animation: success-pulse 0.8s ease-out;
          }
          
          @keyframes success-pulse {
            0% { background-color: rgba(59, 130, 246, 0.2); }
            100% { background-color: transparent; }
          }
          
          .container-drop-target {
            background-color: rgba(16, 185, 129, 0.05);
            box-shadow: inset 0 0 0 3px rgba(16, 185, 129, 0.3);
            position: relative;
          }
          
          .container-drop-target::after {
            content: "Drop at root level";
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: #10b981;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            pointer-events: none;
            z-index: 100;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          }
          
          .container-drop-success {
            animation: container-success-pulse 0.8s ease-out;
          }
          
          @keyframes container-success-pulse {
            0% { background-color: rgba(16, 185, 129, 0.2); }
            100% { background-color: transparent; }
          }
        `}</style>

        <div className="p-1 relative">
          {filterElements && parsedContent ? (
            // Render filtered tree
            parsedContent.children?.map((child) => (
              <ElementTreeNode
                key={child.id}
                element={child}
                depth={0}
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
            ))
          ) : (
            // Render full tree
            <ElementTreeNode
              element={parsedContent}
              depth={0}
              isSelected={selectedElement?.id === parsedContent?.id}
              expandedElements={expandedElements}
              toggleExpand={toggleExpand}
              onElementClick={onElementClick}
              onAddElement={onAddElement}
              onDuplicateElement={onDuplicateElement}
              onDeleteElement={onDeleteElement}
              onMoveElement={onMoveElement}
              selectedElement={selectedElement}
            />
          )}
        </div>
      </div>
    </div>
  )
}

