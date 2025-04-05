"use client"

import type React from "react"

import { useState, useCallback, useEffect } from "react"
import type { ParsedElement } from "@/types/editor"
import { useJsxParser } from "./use-jsx-parser"
import { useJsxHistory } from "./use-jsx-history"
import { useJsxElementOperations } from "./use-jsx-element-operations"
import { useJsxDragDrop } from "./use-jsx-drag-drop"
import { v4 as uuidv4 } from "uuid"

export function useJsxEditor(initialContent: string, onSave: (content: string) => void) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedElement, setSelectedElement] = useState<ParsedElement | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<ParsedElement[]>([])

  // Use the refactored hooks
  const { content, setContent, parsedContent, setParsedContent, generateJsx } = useJsxParser(initialContent)
  const { saveToHistory, handleUndo, handleRedo, canUndo, canRedo } = useJsxHistory(parsedContent, setParsedContent)
  const { addElement, duplicateElement, deleteElement } = useJsxElementOperations(
    parsedContent,
    setParsedContent,
    saveToHistory,
  )
  const { moveElement: dragDropMoveElement } = useJsxDragDrop(parsedContent, setParsedContent, saveToHistory)

  // Memoize the breadcrumbs calculation to prevent unnecessary recalculations
  const calculateBreadcrumbs = useCallback((element: ParsedElement | null, parsedContent: ParsedElement | null) => {
    if (!element || !parsedContent) return []

    const newBreadcrumbs: ParsedElement[] = []

    const findAncestors = (el: ParsedElement, targetId: string): boolean => {
      if (el.id === targetId) {
        newBreadcrumbs.unshift(el)
        return true
      }

      if (el.children) {
        for (const child of el.children) {
          if (findAncestors(child, targetId)) {
            newBreadcrumbs.unshift(el)
            return true
          }
        }
      }

      return false
    }

    findAncestors(parsedContent, element.id)
    return newBreadcrumbs
  }, [])

  // Update breadcrumbs when selected element changes
  useEffect(() => {
    if (selectedElement && parsedContent && isEditMode) {
      setBreadcrumbs(calculateBreadcrumbs(selectedElement, parsedContent))
    }
  }, [selectedElement, parsedContent, isEditMode, calculateBreadcrumbs])

  const handleToggleEditMode = () => {
    if (isEditMode) {
      // If switching from edit to preview, generate the updated JSX
      if (parsedContent) {
        const updatedJsx = generateJsx(parsedContent)
        setContent(updatedJsx)
      }
    }
    setIsEditMode(!isEditMode)
    setSelectedElement(null)
    setBreadcrumbs([])
  }

  const handleSaveContent = useCallback(() => {
    if (parsedContent) {
      // Generate the updated JSX
      const updatedJsx = generateJsx(parsedContent)

      // Update the local content state
      setContent(updatedJsx)

      // Call the parent's onSave function with the updated JSX
      onSave(updatedJsx)

      // Log the saved content for debugging
      console.log("Saved JSX content:", updatedJsx)
    }
  }, [parsedContent, generateJsx, setContent, onSave])

  const handleElementClick = (element: ParsedElement, event: React.MouseEvent) => {
    if (isEditMode) {
      event.stopPropagation()
      setSelectedElement(element)
    }
  }

  // Add keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditMode) return

      // Undo: Ctrl/Cmd + Z
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }

      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if ((e.ctrlKey || e.metaKey) && ((e.key === "z" && e.shiftKey) || e.key === "y")) {
        e.preventDefault()
        handleRedo()
      }

      // Delete: Delete key when element is selected
      if (e.key === "Delete" && selectedElement && selectedElement.id !== "root") {
        e.preventDefault()
        deleteElement(selectedElement.id)
        setSelectedElement(null)
      }

      // Copy: Ctrl/Cmd + C
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && selectedElement) {
        e.preventDefault()
        // Store the selected element ID for duplication
        localStorage.setItem("jsx-editor-clipboard", selectedElement.id)
      }

      // Paste: Ctrl/Cmd + V
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault()
        const clipboardId = localStorage.getItem("jsx-editor-clipboard")
        if (clipboardId && selectedElement) {
          // Duplicate the stored element as a child of the currently selected element
          const duplicated = duplicateElement(clipboardId)
          if (duplicated) {
            setSelectedElement(duplicated)
          }
        }
      }

      // Save: Ctrl/Cmd + S
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        handleSaveContent()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isEditMode, selectedElement, handleUndo, handleRedo, deleteElement, duplicateElement, handleSaveContent])

  // Fix the issue with updating elements
  // Update the updateElement function to ensure state updates trigger re-renders

  // Replace the updateParsedElement function with this optimized version
  const updateParsedElement = useCallback(
    (updatedElement: ParsedElement) => {
      if (!parsedContent) return

      console.log("Updating element:", updatedElement.id)

      // Create a map to quickly find elements by ID
      const elementMap = new Map<string, ParsedElement>()
      const parentMap = new Map<string, ParsedElement>()

      // Build the maps
      const buildMaps = (element: ParsedElement, parent?: ParsedElement) => {
        elementMap.set(element.id, element)
        if (parent) {
          parentMap.set(element.id, parent)
        }

        if (element.children) {
          element.children.forEach((child) => buildMaps(child, element))
        }
      }

      buildMaps(parsedContent)

      // Find the element to update and its parent
      const elementToUpdate = elementMap.get(updatedElement.id)
      const parent = parentMap.get(updatedElement.id)

      if (!elementToUpdate) return

      // Create a new version of the element with updated properties
      const newElement = {
        ...elementToUpdate,
        ...updatedElement,
        // Preserve children if they exist and aren't explicitly changed
        children: updatedElement.children || elementToUpdate.children,
      }

      // If this is the root element, update it directly
      if (updatedElement.id === parsedContent.id) {
        setParsedContent(newElement)
        saveToHistory(newElement)

        // Update the selected element reference if it's the one being edited
        if (selectedElement && selectedElement.id === updatedElement.id) {
          setSelectedElement(newElement)
        }

        return
      }

      // If we have a parent, update the child in the parent's children array
      if (parent && parent.children) {
        const childIndex = parent.children.findIndex((child) => child.id === updatedElement.id)

        if (childIndex !== -1) {
          // Create a new children array with the updated child
          const newChildren = [...parent.children]
          newChildren[childIndex] = newElement

          // Create a new parent with the updated children
          const newParent = {
            ...parent,
            children: newChildren,
          }

          // Update the parent in the tree (recursive call)
          const updateParentInTree = (root: ParsedElement): ParsedElement => {
            if (root.id === newParent.id) {
              return newParent
            }

            if (root.children) {
              return {
                ...root,
                children: root.children.map((child) => updateParentInTree(child)),
              }
            }

            return root
          }

          const newParsedContent = updateParentInTree(parsedContent)
          setParsedContent(newParsedContent)
          saveToHistory(newParsedContent)

          // Update the selected element reference if it's the one being edited
          if (selectedElement && selectedElement.id === updatedElement.id) {
            setSelectedElement(newElement)
          }
        }
      }
    },
    [parsedContent, setParsedContent, saveToHistory, selectedElement, setSelectedElement],
  )

  // Add a component from the component selector
  // Fix the addComponent function to not add default styles or content
  // Find the addComponent function and update it
  const addComponent = useCallback(
    (
      parentId: string,
      componentInfo: {
        type: string
        packageName: string
        importName: string
        importType: "default" | "named" | "namespace"
      },
    ) => {
      console.log("Adding component:", componentInfo, "to parent:", parentId)

      if (!parsedContent) {
        console.error("Cannot add component: parsedContent is null")
        return null
      }

      // Find the parent element
      const findParent = (element: ParsedElement, id: string): ParsedElement | null => {
        if (element.id === id) return element
        if (!element.children) return null

        for (const child of element.children) {
          const found = findParent(child, id)
          if (found) return found
        }

        return null
      }

      const parentElement = findParent(parsedContent, parentId)
      if (!parentElement) {
        console.error("Parent element not found:", parentId)
        return null
      }

      // Create minimal attributes based on component requirements
      let defaultAttributes = {}

      // Only add required attributes for specific components
      if (componentInfo.importName === "Image") {
        defaultAttributes = {
          src: "/placeholder.svg?height=200&width=300",
          alt: "Image",
          width: "300",
          height: "200",
        }
      } else if (componentInfo.importName === "Link") {
        defaultAttributes = {
          href: "/dashboard",
        }
      }

      // For Lucide icons, ensure we're using the correct type
      const elementType =
        componentInfo.packageName === "lucide-react"
          ? componentInfo.importName // Use the icon name as the type
          : componentInfo.type

      // Create a new element with minimal configuration
      const newElement: ParsedElement = {
        id: uuidv4(),
        type: elementType,
        parent: parentId,
        componentInfo: {
          isComponent: true,
          packageName: componentInfo.packageName,
          importName: componentInfo.importName,
          importType: componentInfo.importType,
        },
        attributes: defaultAttributes,
      }

      console.log("Created new component element:", newElement)

      // Add the element to the parent's children
      const updatedParent = {
        ...parentElement,
        children: [...(parentElement.children || []), newElement],
      }

      // Update the parent element in the tree
      updateParsedElement(updatedParent)

      // Select the newly added component
      setSelectedElement(newElement)

      console.log("Component added successfully")
      return newElement
    },
    [parsedContent, updateParsedElement, setSelectedElement],
  )

  // Update preview in real-time when parsedContent changes
  useEffect(() => {
    if (parsedContent && !isEditMode) {
      // Use a ref to track the previous content to avoid unnecessary updates
      const updatedJsx = generateJsx(parsedContent)

      // Only update if the content has actually changed
      if (updatedJsx !== content) {
        setContent(updatedJsx)
      }
    }
  }, [parsedContent, isEditMode, generateJsx, content])

  // Add moveElement functionality to the useJsxEditor hook
  const moveElement = useCallback(
    (sourceId: string, targetId: string, position: "before" | "after" | "inside" | "outside" | "root") => {
      dragDropMoveElement(sourceId, targetId, position)
    },
    [dragDropMoveElement],
  )

  return {
    content,
    parsedContent,
    selectedElement,
    isEditMode,
    breadcrumbs,
    handleToggleEditMode,
    handleSaveContent,
    handleElementClick,
    updateParsedElement,
    addElement,
    addComponent,
    duplicateElement,
    deleteElement,
    moveElement,
    generateJsx,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    setContent,
  }
}

