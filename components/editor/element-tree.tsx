"use client"

import type React from "react"
import { useState, useCallback, useEffect, useRef } from "react"
import type { ParsedElement, ImportStatement } from "@/types/editor"
import { TreeContainer } from "./element-tree/tree-container"
import { SearchBar } from "./element-tree/search-bar"
import { TreeHeader } from "./element-tree/tree-header"
import { ActionButtons } from "./element-tree/action-buttons"
import { countElements } from "./element-tree/utils"

interface ElementTreeProps {
  parsedContent: ParsedElement | null
  selectedElement: ParsedElement | null
  onElementClick: (element: ParsedElement, event: React.MouseEvent) => void
  onAddElement: (parentId: string, elementType: string, position?: number) => void
  onAddComponent?: (
    parentId: string,
    componentInfo: {
      type: string
      packageName: string
      importName: string
      importType: "default" | "named" | "namespace"
    },
  ) => void
  onDuplicateElement: (elementId: string) => void
  onDeleteElement: (elementId: string) => void
  onMoveElement?: (sourceId: string, targetId: string, position: "before" | "after" | "inside") => void
  imports: ImportStatement[]
  toggleImportActive: (id: string) => void
}

const ElementTree: React.FC<ElementTreeProps> = ({
  parsedContent,
  selectedElement,
  onElementClick,
  onAddElement,
  onAddComponent,
  onDuplicateElement,
  onDeleteElement,
  onMoveElement,
  imports,
  toggleImportActive,
}) => {
  const [expandedElements, setExpandedElements] = useState<Record<string, boolean>>({
    root: true,
  })
  const [searchQuery, setSearchQuery] = useState("")
  const treeContainerRef = useRef<HTMLDivElement | null>(null)

  // Function to find an element by ID in the tree
  const findElementById = useCallback(
    (id: string, tree: ParsedElement = parsedContent as ParsedElement): ParsedElement | null => {
      if (!tree) return null
      if (tree.id === id) return tree
      if (!tree.children) return null

      for (const child of tree.children) {
        const found = findElementById(id, child)
        if (found) return found
      }

      return null
    },
    [parsedContent],
  )

  const toggleExpand = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedElements((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }, [])

  // Expand all elements
  const expandAll = useCallback(() => {
    const expandAllElements = (element: ParsedElement, expanded: Record<string, boolean>) => {
      expanded[element.id] = true
      if (element.children) {
        element.children.forEach((child) => expandAllElements(child, expanded))
      }
      return expanded
    }

    if (parsedContent) {
      const newExpanded = expandAllElements(parsedContent, {})
      setExpandedElements(newExpanded)
    }
  }, [parsedContent])

  // Collapse all elements
  const collapseAll = useCallback(() => {
    // Keep root expanded
    setExpandedElements({ root: true })
  }, [])

  // Filter elements based on search
  const filterElements = useCallback(
    (element: ParsedElement): boolean => {
      if (!searchQuery) return true

      const matchesSearch =
        element.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (element.textContent && element.textContent.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (element.className && element.className.toLowerCase().includes(searchQuery.toLowerCase()))

      // If this element matches, return true
      if (matchesSearch) return true

      // If any child matches, return true
      if (element.children) {
        return element.children.some(filterElements)
      }

      return false
    },
    [searchQuery],
  )

  // Expand parents of matching elements
  useEffect(() => {
    if (!searchQuery || !parsedContent) return

    const expandMatchingParents = (element: ParsedElement): void => {
      if (element.children) {
        const hasMatchingChild = element.children.some(
          (child) => filterElements(child) || (child.children && child.children.some(filterElements)),
        )

        if (hasMatchingChild) {
          setExpandedElements((prev) => ({
            ...prev,
            [element.id]: true,
          }))

          element.children.forEach(expandMatchingParents)
        }
      }
    }

    expandMatchingParents(parsedContent)
  }, [searchQuery, parsedContent, filterElements])

  return (
    <div className="p-3 h-full flex flex-col">
      <TreeHeader
        expandAll={expandAll}
        collapseAll={collapseAll}
        elementCount={parsedContent ? countElements(parsedContent) : 0}
      />

      <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      <ActionButtons
        onAddElement={onAddElement}
        onAddComponent={onAddComponent}
        imports={imports}
        toggleImportActive={toggleImportActive}
      />

      <TreeContainer
        parsedContent={parsedContent}
        selectedElement={selectedElement}
        expandedElements={expandedElements}
        toggleExpand={toggleExpand}
        onElementClick={onElementClick}
        onAddElement={onAddElement}
        onDuplicateElement={onDuplicateElement}
        onDeleteElement={onDeleteElement}
        onMoveElement={onMoveElement}
        treeContainerRef={treeContainerRef}
        filterElements={searchQuery ? filterElements : undefined}
      />
    </div>
  )
}

export default ElementTree

