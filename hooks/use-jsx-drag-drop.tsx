"use client"

import { useCallback } from "react"
import { v4 as uuidv4 } from "uuid"
import type { ParsedElement } from "@/types/editor"

export function useJsxDragDrop(
  parsedContent: ParsedElement | null,
  setParsedContent: (content: ParsedElement) => void,
  saveToHistory: (content: ParsedElement) => void,
) {
  // Find an element by ID in the tree
  const findElementById = useCallback((id: string, tree: ParsedElement): ParsedElement | null => {
    if (tree.id === id) return tree

    if (!tree.children) return null

    for (const child of tree.children) {
      const found = findElementById(id, child)
      if (found) return found
    }

    return null
  }, [])

  // Find an element and its parent
  const findElementAndParent = useCallback(
    (
      id: string,
      tree: ParsedElement,
    ): { element: ParsedElement | null; parent: ParsedElement | null; index: number } => {
      if (tree.id === id) {
        return { element: tree, parent: null, index: -1 }
      }

      if (!tree.children) return { element: null, parent: null, index: -1 }

      for (let i = 0; i < tree.children.length; i++) {
        if (tree.children[i].id === id) {
          return { element: tree.children[i], parent: tree, index: i }
        }
      }

      for (const child of tree.children) {
        const result = findElementAndParent(id, child)
        if (result.element) return result
      }

      return { element: null, parent: null, index: -1 }
    },
    [],
  )

  // Check if target is a descendant of source
  const isDescendant = useCallback(
    (sourceId: string, targetId: string, tree: ParsedElement): boolean => {
      if (sourceId === targetId) return true

      const target = findElementById(targetId, tree)
      if (!target || !target.children) return false

      for (const child of target.children) {
        if (child.id === sourceId || isDescendant(sourceId, child.id, tree)) {
          return true
        }
      }

      return false
    },
    [findElementById],
  )

  // Get or create a root fragment
  const getOrCreateRootFragment = useCallback((content: ParsedElement): ParsedElement => {
    // Check if root already has a fragment child
    if (content.children && content.children.length > 0) {
      const firstChild = content.children[0]
      if (firstChild.type === "Fragment" && firstChild.isRootFragment) {
        return firstChild
      }
    }

    // Create a new fragment
    const fragment: ParsedElement = {
      id: uuidv4(),
      type: "Fragment",
      isRootFragment: true,
      parent: content.id,
      children: [],
    }

    // If root has children, move them to the fragment
    if (content.children && content.children.length > 0) {
      fragment.children = [...content.children]
      fragment.children.forEach((child) => {
        child.parent = fragment.id
      })
    }

    // Set the fragment as the only child of root
    content.children = [fragment]

    return fragment
  }, [])

  // Create a deep clone of the content
  const cloneContent = useCallback((content: ParsedElement): ParsedElement => {
    return JSON.parse(JSON.stringify(content))
  }, [])

  // Update parent references for all elements
  const updateParentReferences = useCallback((element: ParsedElement): void => {
    if (!element.children) return

    for (const child of element.children) {
      child.parent = element.id
      updateParentReferences(child)
    }
  }, [])

  // Move an element
  const moveElement = useCallback(
    (sourceId: string, targetId: string, position: "before" | "after" | "inside" | "outside" | "root") => {
      console.log("moveElement called with:", { sourceId, targetId, position })

      if (!parsedContent) {
        console.error("No parsed content available")
        return
      }

      // Don't move root or to itself
      if (sourceId === "root" || sourceId === targetId) {
        console.error("Cannot move root element or element to itself")
        return
      }

      // Create a deep clone of the content
      const contentCopy = cloneContent(parsedContent)

      // Find source element and its parent
      const { element: sourceElement, parent: sourceParent } = findElementAndParent(sourceId, contentCopy)

      if (!sourceElement || !sourceParent) {
        console.error("Source element or parent not found")
        return
      }

      // Handle moving to root level
      if (position === "root") {
        console.log("Moving element to root level")

        // Remove source from its parent
        sourceParent.children = sourceParent.children.filter((child) => child.id !== sourceId)

        // Get or create root fragment
        const rootFragment = getOrCreateRootFragment(contentCopy)

        // Add source to root fragment
        const sourceClone = cloneContent(sourceElement)
        sourceClone.parent = rootFragment.id
        rootFragment.children.push(sourceClone)

        // Update parent references
        updateParentReferences(contentCopy)

        // Update state
        console.log("Updating state with new content")
        setParsedContent(contentCopy)
        saveToHistory(contentCopy)
        return
      }

      // Handle moving outside current parent
      if (position === "outside") {
        console.log("Moving element outside its parent")

        // Find grandparent
        const { parent: grandparent } = findElementAndParent(sourceParent.id, contentCopy)

        if (!grandparent) {
          console.error("Grandparent not found")
          return
        }

        // Remove source from its parent
        sourceParent.children = sourceParent.children.filter((child) => child.id !== sourceId)

        // Add source after its parent in grandparent's children
        const sourceClone = cloneContent(sourceElement)
        sourceClone.parent = grandparent.id

        const parentIndex = grandparent.children.findIndex((child) => child.id === sourceParent.id)
        grandparent.children.splice(parentIndex + 1, 0, sourceClone)

        // Update parent references
        updateParentReferences(contentCopy)

        // Update state
        console.log("Updating state with new content")
        setParsedContent(contentCopy)
        saveToHistory(contentCopy)
        return
      }

      // Handle regular moves (before, after, inside)
      console.log("Moving element to position:", position)

      const { element: targetElement, parent: targetParent } = findElementAndParent(targetId, contentCopy)

      if (!targetElement) {
        console.error("Target element not found")
        return
      }

      // Check if target is a descendant of source
      if (position === "inside" && isDescendant(sourceId, targetId, contentCopy)) {
        console.error("Cannot move an element into its own descendant")
        return
      }

      // Remove source from its parent
      sourceParent.children = sourceParent.children.filter((child) => child.id !== sourceId)

      // Create a clone of the source element
      const sourceClone = cloneContent(sourceElement)

      if (position === "inside") {
        // Add source as a child of target
        if (!targetElement.children) targetElement.children = []

        sourceClone.parent = targetElement.id
        targetElement.children.push(sourceClone)
      } else {
        // Add source before or after target in its parent's children
        if (!targetParent) {
          console.error("Target parent not found")
          return
        }

        sourceClone.parent = targetParent.id

        const targetIndex = targetParent.children.findIndex((child) => child.id === targetId)
        const insertIndex = position === "after" ? targetIndex + 1 : targetIndex

        targetParent.children.splice(insertIndex, 0, sourceClone)
      }

      // Update parent references
      updateParentReferences(contentCopy)

      // Update state
      console.log("Updating state with new content")
      setParsedContent(contentCopy)
      saveToHistory(contentCopy)
    },
    [
      parsedContent,
      setParsedContent,
      saveToHistory,
      findElementAndParent,
      isDescendant,
      cloneContent,
      updateParentReferences,
      getOrCreateRootFragment,
    ],
  )

  // Add an element to the root level
  const addElementToRoot = useCallback(
    (elementType: string) => {
      if (!parsedContent) return null

      // Create a deep clone of the content
      const contentCopy = cloneContent(parsedContent)

      // Get or create root fragment
      const rootFragment = getOrCreateRootFragment(contentCopy)

      // Create new element
      const newElement: ParsedElement = {
        id: uuidv4(),
        type: elementType,
        parent: rootFragment.id,
        className: "",
        children: [],
      }

      // Add element to root fragment
      rootFragment.children.push(newElement)

      // Update state
      setParsedContent(contentCopy)
      saveToHistory(contentCopy)

      return newElement
    },
    [parsedContent, setParsedContent, saveToHistory, cloneContent, getOrCreateRootFragment],
  )

  return {
    moveElement,
    addElementToRoot,
    findElementById,
    findElementAndParent,
  }
}

