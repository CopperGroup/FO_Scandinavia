"use client"

import type React from "react"

import { useState } from "react"
import EditorHeader from "./editor-header"
import EditorWorkspace from "./editor-workspace"
import PropertiesPanel from "./properties-panel"
import ElementTree from "./element-tree"
import { useJsxEditor } from "@/hooks/use-jsx-editor"

interface EditorPageProps {
  initialContent: string
  onSave: (content: string) => void
}

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
    duplicateElement,
    deleteElement,
    generateJsx,
  } = useJsxEditor(initialContent, onSave)

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const togglePropertiesPanel = () => {
    setPropertiesPanelOpen(!propertiesPanelOpen)
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <EditorHeader
        isEditMode={isEditMode}
        onToggleEditMode={handleToggleEditMode}
        onSave={handleSaveContent}
        toggleSidebar={toggleSidebar}
        togglePropertiesPanel={togglePropertiesPanel}
        sidebarOpen={sidebarOpen}
        propertiesPanelOpen={propertiesPanelOpen}
      />

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && isEditMode && (
          <div className="w-64 bg-white overflow-y-auto shadow-sm">
            <ElementTree
              parsedContent={parsedContent}
              selectedElement={selectedElement}
              onElementClick={handleElementClick}
              onAddElement={addElement}
              onDuplicateElement={duplicateElement}
              onDeleteElement={deleteElement}
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <EditorWorkspace
            content={content}
            parsedContent={parsedContent}
            selectedElement={selectedElement}
            isEditMode={isEditMode}
            breadcrumbs={breadcrumbs}
            onElementClick={handleElementClick}
            onAddElement={addElement}
            onDuplicateElement={duplicateElement}
            onDeleteElement={deleteElement}
          />
        </div>

        {propertiesPanelOpen && isEditMode && selectedElement && (
          <div className="w-80 bg-white overflow-y-auto shadow-sm">
            <PropertiesPanel selectedElement={selectedElement} updateElement={updateParsedElement} />
          </div>
        )}
      </div>
    </div>
  )
}

export default EditorPage

