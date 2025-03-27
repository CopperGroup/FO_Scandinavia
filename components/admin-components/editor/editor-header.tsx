"use client"

import type React from "react"

import { Save, Eye, Edit, PanelLeft, PanelRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface EditorHeaderProps {
  isEditMode: boolean
  onToggleEditMode: () => void
  onSave: () => void
  toggleSidebar: () => void
  togglePropertiesPanel: () => void
  sidebarOpen: boolean
  propertiesPanelOpen: boolean
}

const EditorHeader: React.FC<EditorHeaderProps> = ({
  isEditMode,
  onToggleEditMode,
  onSave,
  toggleSidebar,
  togglePropertiesPanel,
  sidebarOpen,
  propertiesPanelOpen,
}) => {
  return (
    <header className="bg-white border-b">
      <div className="flex items-center justify-between px-6 h-16">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">JSX Editor</h1>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="ghost" size="sm" onClick={toggleSidebar} className={sidebarOpen ? "bg-gray-100" : ""}>
            <PanelLeft className="h-4 w-4 mr-2" />
            Elements
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={togglePropertiesPanel}
            className={propertiesPanelOpen ? "bg-gray-100" : ""}
          >
            <PanelRight className="h-4 w-4 mr-2" />
            Properties
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant={isEditMode ? "outline" : "default"} size="sm" onClick={onToggleEditMode}>
            {isEditMode ? (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </>
            ) : (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </>
            )}
          </Button>

          {isEditMode && (
            <Button variant="default" size="sm" onClick={onSave}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

export default EditorHeader

