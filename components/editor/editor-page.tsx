"use client"

import type React from "react"

import { useState, useCallback, memo, useEffect } from "react"
import EditorHeader from "./editor-header"
import EditorWorkspace from "./editor-workspace"
import PropertiesPanel from "./properties-panel"
import ElementTree from "./element-tree"
import { useJsxEditor } from "@/hooks/use-jsx-editor"

// Add a debounce function to optimize real-time updates
// Add this function at the top of the component
const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

interface EditorPageProps {
  initialContent: string
  onSave: (content: string) => void
}

// Optimize the EditorPage component with memoization
// Add React.memo to the component exports:

// Use memo to prevent unnecessary re-renders
const MemoizedElementTree = memo(ElementTree)
const MemoizedPropertiesPanel = memo(PropertiesPanel)
const MemoizedEditorWorkspace = memo(EditorWorkspace)

const EditorPage: React.FC<EditorPageProps> = ({ initialContent, onSave }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [propertiesPanelOpen, setPropertiesPanelOpen] = useState(true)

  const {
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
    generateJsx,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    moveElement,
    setContent,
  } = useJsxEditor(initialContent, onSave)

  const toggleSidebarOpen = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])

  const togglePropertiesPanelOpen = useCallback(() => {
    setPropertiesPanelOpen((prev) => !prev)
  }, [])

  // Update preview in real-time when parsedContent changes, but debounce it
  const debouncedParsedContent = useDebounce(parsedContent, 300) // 300ms debounce

  useEffect(() => {
    if (debouncedParsedContent && !isEditMode) {
      // Generate updated JSX
      const updatedJsx = generateJsx(debouncedParsedContent)

      // Only update if the content has actually changed
      if (updatedJsx !== content) {
        setContent(updatedJsx)
      }
    }
  }, [debouncedParsedContent, isEditMode, generateJsx, content, setContent])

  // Add a useEffect to ensure container queries are properly initialized

  // Add this useEffect after the existing useEffect blocks:
  // Add this effect to ensure container queries are properly initialized
  useEffect(() => {
    // Function to initialize container queries
    const initContainerQueries = () => {
      // Add a global function to update responsive containers
      if (typeof window !== "undefined") {
        window.updateResponsiveContainer = () => {
          // Force a small reflow to ensure container queries are applied
          document.querySelectorAll("[data-responsive-container]").forEach((container) => {
            const width = container.getBoundingClientRect().width
            container.setAttribute("data-width", width.toString())
          })
        }

        // Call it once on initialization
        window.updateResponsiveContainer()
      }
    }

    initContainerQueries()

    // Add a resize listener to update container queries when window is resized
    const handleResize = () => {
      if (typeof window !== "undefined" && "updateResponsiveContainer" in window) {
        // @ts-ignore
        window.updateResponsiveContainer()
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <EditorHeader
        isEditMode={isEditMode}
        onToggleEditMode={handleToggleEditMode}
        onSave={handleSaveContent}
        toggleSidebar={toggleSidebarOpen}
        togglePropertiesPanel={togglePropertiesPanelOpen}
        sidebarOpen={sidebarOpen}
        propertiesPanelOpen={propertiesPanelOpen}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && isEditMode && (
          <div className="w-64 bg-white overflow-y-auto shadow-sm border-r">
            <MemoizedElementTree
              parsedContent={parsedContent}
              selectedElement={selectedElement}
              onElementClick={handleElementClick}
              onAddElement={addElement}
              onAddComponent={addComponent}
              onDuplicateElement={duplicateElement}
              onDeleteElement={deleteElement}
              onMoveElement={moveElement}
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <MemoizedEditorWorkspace
            content={content}
            parsedContent={parsedContent}
            selectedElement={selectedElement}
            isEditMode={isEditMode}
            breadcrumbs={breadcrumbs}
            onElementClick={handleElementClick}
            onAddElement={addElement}
            onAddComponent={addComponent}
            onDuplicateElement={duplicateElement}
            onDeleteElement={deleteElement}
            onMoveElement={moveElement}
          />
        </div>

        {propertiesPanelOpen && isEditMode && selectedElement && (
          <div className="w-80 bg-white overflow-y-auto shadow-sm border-l">
            <MemoizedPropertiesPanel selectedElement={selectedElement} updateElement={updateParsedElement} />
          </div>
        )}
      </div>
    </div>
  )
}

export default EditorPage

