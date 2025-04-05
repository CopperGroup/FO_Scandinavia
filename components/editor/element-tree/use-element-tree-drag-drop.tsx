"use client"

import type React from "react"

import { useState, useCallback } from "react"
import type { ParsedElement } from "@/types/editor"

interface UseElementTreeDragDropProps {
  parsedContent: ParsedElement | null
  findElementById: (id: string) => ParsedElement | null
  onMoveElement?: (sourceId: string, targetId: string, position: "before" | "after" | "inside") => void
}

export function useElementTreeDragDrop({ parsedContent, findElementById, onMoveElement }: UseElementTreeDragDropProps) {
  const [draggedElement, setDraggedElement] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<"before" | "after" | "inside">("inside")

  // Check if target is a valid drop target
  const isValidDropTarget = useCallback(
    (sourceId: string, targetId: string): boolean => {
      // Can't drop on itself or root can't be dragged
      if (sourceId === targetId || sourceId === "root") return false

      // Find the source and target elements
      const sourceElement = findElementById(sourceId)
      const targetElement = findElementById(targetId)

      if (!sourceElement || !targetElement) return false

      // Check if target is a descendant of source (would create circular reference)
      const isDescendant = (parent: ParsedElement, childId: string): boolean => {
        if (!parent.children) return false
        for (const child of parent.children) {
          if (child.id === childId) return true
          if (isDescendant(child, childId)) return true
        }
        return false
      }

      return !isDescendant(sourceElement, targetId)
    },
    [findElementById],
  )

  // Handle drag start
  const handleDragStart = useCallback(
    (e: React.DragEvent, id: string) => {
      // Prevent dragging root
      if (id === "root") {
        e.preventDefault()
        return
      }

      // Set drag data
      e.dataTransfer.setData("application/element-id", id)
      e.dataTransfer.effectAllowed = "move"

      // Add a class to the dragged element
      const element = e.currentTarget as HTMLElement
      element.classList.add("element-tree-dragging")

      setDraggedElement(id)

      // Create a custom drag image
      const dragPreview = document.createElement("div")
      dragPreview.className = "drag-preview"
      dragPreview.textContent = findElementById(id)?.type || "Element"
      document.body.appendChild(dragPreview)

      e.dataTransfer.setDragImage(dragPreview, 0, 0)

      // Remove the preview element after a short delay
      setTimeout(() => {
        document.body.removeChild(dragPreview)
      }, 0)
    },
    [findElementById],
  )

  // Handle drag over
  const handleDragOver = useCallback(
    (e: React.DragEvent, id: string) => {
      e.preventDefault()

      // Get the dragged element ID
      const sourceId = e.dataTransfer.getData("application/element-id") || draggedElement

      // Skip if dragging over itself or invalid target
      if (!sourceId || sourceId === id || !isValidDropTarget(sourceId, id)) {
        e.dataTransfer.dropEffect = "none"
        return
      }

      e.dataTransfer.dropEffect = "move"

      // Determine drop position based on mouse position
      const rect = e.currentTarget.getBoundingClientRect()
      const y = e.clientY - rect.top

      // Remove existing drop indicators
      e.currentTarget.classList.remove(
        "element-tree-drop-before",
        "element-tree-drop-after",
        "element-tree-drop-inside",
      )

      let position: "before" | "after" | "inside"

      if (y < rect.height * 0.3) {
        position = "before"
        e.currentTarget.classList.add("element-tree-drop-before")
      } else if (y > rect.height * 0.7) {
        position = "after"
        e.currentTarget.classList.add("element-tree-drop-after")
      } else {
        position = "inside"
        e.currentTarget.classList.add("element-tree-drop-inside")
      }

      setDropTarget(id)
      setDropPosition(position)
    },
    [draggedElement, isValidDropTarget],
  )

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Remove drop indicators
    e.currentTarget.classList.remove("element-tree-drop-before", "element-tree-drop-after", "element-tree-drop-inside")

    setDropTarget(null)
  }, [])

  // Handle drop
  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault()

      // Get the dragged element ID
      const sourceId = e.dataTransfer.getData("application/element-id") || draggedElement

      // Remove drop indicators
      e.currentTarget.classList.remove(
        "element-tree-drop-before",
        "element-tree-drop-after",
        "element-tree-drop-inside",
      )

      // Skip if invalid drop
      if (!sourceId || !isValidDropTarget(sourceId, targetId)) {
        setDraggedElement(null)
        setDropTarget(null)
        return
      }

      // Execute the move
      if (onMoveElement) {
        try {
          onMoveElement(sourceId, targetId, dropPosition)

          // Add success animation
          e.currentTarget.classList.add("element-tree-drop-success")
          setTimeout(() => {
            e.currentTarget.classList.remove("element-tree-drop-success")
          }, 800)
        } catch (error) {
          console.error("Error moving element:", error)
        }
      }

      setDraggedElement(null)
      setDropTarget(null)
    },
    [draggedElement, dropPosition, isValidDropTarget, onMoveElement],
  )

  // Handle drag end
  const handleDragEnd = useCallback((e: React.DragEvent) => {
    // Remove dragging class
    e.currentTarget.classList.remove("element-tree-dragging")

    // Remove all drop indicators from all elements
    document
      .querySelectorAll(".element-tree-drop-before, .element-tree-drop-after, .element-tree-drop-inside")
      .forEach((el) => {
        el.classList.remove("element-tree-drop-before", "element-tree-drop-after", "element-tree-drop-inside")
      })

    setDraggedElement(null)
    setDropTarget(null)
  }, [])

  return {
    draggedElement,
    dropTarget,
    dropPosition,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  }
}

