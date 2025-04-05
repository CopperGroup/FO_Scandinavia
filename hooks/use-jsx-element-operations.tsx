"use client"

import { useCallback } from "react"
import { v4 as uuidv4 } from "uuid"
import type { ParsedElement } from "@/types/editor"
import { useToast } from "@/hooks/use-toast"

export function useJsxElementOperations(
  parsedContent: ParsedElement | null,
  setParsedContent: (content: ParsedElement) => void,
  saveToHistory: (content: ParsedElement) => void,
) {
  const { toast } = useToast()

  // Add a new element
  const addElement = useCallback(
    (parentId: string, elementType: string, position?: number) => {
      if (!parsedContent) return

      const newElement: ParsedElement = {
        id: uuidv4(),
        type: elementType,
        parent: parentId,
        textContent: getDefaultTextContent(elementType),
        className: getDefaultClassName(elementType),
        attributes: getDefaultAttributes(elementType),
        originalTag: `<${elementType}></${elementType}>`,
      }

      const addElementToTree = (parent: ParsedElement): ParsedElement => {
        if (parent.id === parentId) {
          const children = parent.children || []
          const newChildren =
            position !== undefined
              ? [...children.slice(0, position), newElement, ...children.slice(position)]
              : [...children, newElement]

          return {
            ...parent,
            children: newChildren,
          }
        }

        if (parent.children) {
          return {
            ...parent,
            children: parent.children.map((child) => addElementToTree(child)),
          }
        }

        return parent
      }

      // Special case for root element
      if (parentId === "root" && parsedContent.id !== "root") {
        // If the root element doesn't have an ID of "root", we need to handle it differently
        // This is a common case when the parsed content is the actual root element
        const newChildren = parsedContent.children || []
        newElement.parent = parsedContent.id

        const updatedParsedContent = {
          ...parsedContent,
          children: [...newChildren, newElement],
        }

        setParsedContent(updatedParsedContent)
        saveToHistory(updatedParsedContent)
        return newElement
      }

      const newParsedContent = addElementToTree(parsedContent)
      setParsedContent(newParsedContent)
      saveToHistory(newParsedContent)

      // Show toast notification for element addition with purple variant
      toast({
        description: `Added ${elementType} element`,
        variant: "purple",
      })

      return newElement
    },
    [parsedContent, setParsedContent, saveToHistory, toast],
  )

  // Duplicate an element
  const duplicateElement = useCallback(
    (elementId: string) => {
      if (!parsedContent) return

      let elementToDuplicate: ParsedElement | null = null
      let parentId: string | undefined = undefined

      // Find the element to duplicate and its parent
      const findElement = (parent: ParsedElement): void => {
        if (parent.children) {
          for (const child of parent.children) {
            if (child.id === elementId) {
              elementToDuplicate = child
              parentId = parent.id
              return
            }
            findElement(child)
          }
        }
      }

      findElement(parsedContent)

      if (!elementToDuplicate || !parentId) return

      // Create a deep copy of the element with a new ID
      const duplicateElementDeep = (element: ParsedElement): ParsedElement => {
        const newId = uuidv4()

        const newElement: ParsedElement = {
          ...element,
          id: newId,
          parent: parentId,
        }

        if (element.children) {
          newElement.children = element.children.map((child) => duplicateElementDeep({ ...child, parent: newId }))
        }

        return newElement
      }

      const duplicatedElement = duplicateElementDeep(elementToDuplicate)

      // Add the duplicated element to the tree
      const addDuplicatedElement = (parent: ParsedElement): ParsedElement => {
        if (parent.id === parentId) {
          const children = parent.children || []
          const elementIndex = children.findIndex((child) => child.id === elementId)

          if (elementIndex !== -1) {
            return {
              ...parent,
              children: [
                ...children.slice(0, elementIndex + 1),
                duplicatedElement,
                ...children.slice(elementIndex + 1),
              ],
            }
          }

          return {
            ...parent,
            children: [...children, duplicatedElement],
          }
        }

        if (parent.children) {
          return {
            ...parent,
            children: parent.children.map((child) => addDuplicatedElement(child)),
          }
        }

        return parent
      }

      const newParsedContent = addDuplicatedElement(parsedContent)
      setParsedContent(newParsedContent)
      saveToHistory(newParsedContent)

      // Show toast notification for element duplication with info variant
      toast({
        description: `Duplicated ${elementToDuplicate.type}`,
        variant: "info",
      })

      return duplicatedElement
    },
    [parsedContent, setParsedContent, saveToHistory, toast],
  )

  // Delete an element
  const deleteElement = useCallback(
    (elementId: string) => {
      if (!parsedContent) return
      if (elementId === "root") return // Cannot delete the root element

      // Find the element type before deleting
      let elementType = "element"
      const findElementType = (parent: ParsedElement): boolean => {
        if (parent.id === elementId) {
          elementType = parent.type
          return true
        }
        if (parent.children) {
          for (const child of parent.children) {
            if (findElementType(child)) {
              return true
            }
          }
        }
        return false
      }

      findElementType(parsedContent)

      const deleteElementFromTree = (parent: ParsedElement): ParsedElement => {
        if (parent.children) {
          const newChildren = parent.children.filter((child) => child.id !== elementId)

          if (newChildren.length !== parent.children.length) {
            return {
              ...parent,
              children: newChildren,
            }
          }

          return {
            ...parent,
            children: parent.children.map((child) => deleteElementFromTree(child)),
          }
        }

        return parent
      }

      const newParsedContent = deleteElementFromTree(parsedContent)
      setParsedContent(newParsedContent)
      saveToHistory(newParsedContent)

      // Show toast notification for element deletion with warning variant
      toast({
        description: `Deleted ${elementType}`,
        variant: "warning",
      })
    },
    [parsedContent, setParsedContent, saveToHistory, toast],
  )

  // Update an element
  const updateElement = useCallback(
    (updatedElement: ParsedElement) => {
      if (!parsedContent) return

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

      if (parsedContent) {
        buildMaps(parsedContent)
      }

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

          // Update the parent in the tree
          updateElement(newParent)
        }
      }
    },
    [parsedContent, setParsedContent, saveToHistory],
  )

  // Move an element up or down within its parent's children
  const moveElement = useCallback(
    (elementId: string, direction: "up" | "down") => {
      if (!parsedContent) return

      // Find the element and its parent
      let elementToMove: ParsedElement | null = null
      let parentElement: ParsedElement | null = null
      let elementIndex = -1

      const findElement = (parent: ParsedElement): boolean => {
        if (parent.children) {
          for (let i = 0; i < parent.children.length; i++) {
            const child = parent.children[i]
            if (child.id === elementId) {
              elementToMove = child
              parentElement = parent
              elementIndex = i
              return true
            }
            if (findElement(child)) {
              return true
            }
          }
        }
        return false
      }

      findElement(parsedContent)

      if (!elementToMove || !parentElement || elementIndex === -1) return

      // Get the parent's children
      const children = [...parentElement.children!]

      // Calculate the new index based on direction
      const newIndex = direction === "up" ? elementIndex - 1 : elementIndex + 1

      // Ensure the new index is within bounds
      if (newIndex < 0 || newIndex >= children.length) return // Swap the elements
      ;[children[elementIndex], children[newIndex]] = [children[newIndex], children[elementIndex]]

      // Create a new parent with the updated children
      const newParent = {
        ...parentElement,
        children,
      }

      // Update the parent in the tree
      updateElement(newParent)
    },
    [parsedContent, updateElement],
  )

  // Helper functions for default element properties
  const getDefaultTextContent = (elementType: string): string | undefined => {
    switch (elementType) {
      case "h1":
        return "Heading 1"
      case "h2":
        return "Heading 2"
      case "h3":
        return "Heading 3"
      case "p":
        return "Paragraph text"
      case "span":
        return "Span text"
      case "button":
        return "Button"
      case "a":
        return "Link text"
      default:
        return elementType === "img" ? undefined : ""
    }
  }

  const getDefaultClassName = (elementType: string): string => {
    switch (elementType) {
      case "h1":
        return "text-3xl font-bold mb-4"
      case "h2":
        return "text-2xl font-semibold mb-3"
      case "h3":
        return "text-xl font-medium mb-2"
      case "p":
        return "mb-4"
      case "div":
        return "p-4"
      case "img":
        return "rounded-md"
      case "button":
        return "px-4 py-2 bg-blue-500 text-white rounded-md"
      case "a":
        return "text-blue-500 hover:underline"
      default:
        return ""
    }
  }

  const getDefaultAttributes = (elementType: string): Record<string, string> | undefined => {
    switch (elementType) {
      case "img":
        return {
          src: "/placeholder.svg?height=200&width=300",
          alt: "Placeholder image",
          width: "300",
          height: "200",
        }
      case "a":
        return {
          href: "#",
          target: "_blank",
        }
      default:
        return undefined
    }
  }

  return {
    addElement,
    duplicateElement,
    deleteElement,
    updateElement,
    moveElement,
  }
}

