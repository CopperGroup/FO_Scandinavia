"use client"

import type React from "react"

import { Save, Eye, Edit, PanelLeft, PanelRight, Undo, Redo, Keyboard, Code } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"

interface EditorHeaderProps {
  isEditMode: boolean
  onToggleEditMode: () => void
  onSave: () => void
  toggleSidebar: () => void
  togglePropertiesPanel: () => void
  sidebarOpen: boolean
  propertiesPanelOpen: boolean
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
}

const EditorHeader: React.FC<EditorHeaderProps> = ({
  isEditMode,
  onToggleEditMode,
  onSave,
  toggleSidebar,
  togglePropertiesPanel,
  sidebarOpen,
  propertiesPanelOpen,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}) => {
  const { toast } = useToast()

  const handleSave = () => {
    onSave()
    toast({
      variant: "green",
      description: (
        <div className="flex items-center gap-1">
          <Save className="h-4 w-4" />
          <span>Changes saved successfully</span>
        </div>
      ),
      duration: 2000,
    })
  }

  return (
    <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center space-x-2">
          <div className="flex items-center mr-2">
            <Code className="h-5 w-5 text-primary mr-2" />
            <h1 className="text-lg font-semibold">JSX Editor</h1>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={sidebarOpen ? "secondary" : "ghost"}
                  size="sm"
                  onClick={toggleSidebar}
                  className="h-8 gap-1.5"
                >
                  <PanelLeft className="h-4 w-4" />
                  <span className="text-xs">Elements</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Toggle Element Tree</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={propertiesPanelOpen ? "secondary" : "ghost"}
                  size="sm"
                  onClick={togglePropertiesPanel}
                  className="h-8 gap-1.5"
                >
                  <PanelRight className="h-4 w-4" />
                  <span className="text-xs">Properties</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Toggle Properties Panel</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center space-x-2">
          {isEditMode && onUndo && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={onUndo} disabled={!canUndo} className="h-8 w-8">
                    <Undo className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Undo (Ctrl+Z)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {isEditMode && onRedo && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={onRedo} disabled={!canRedo} className="h-8 w-8">
                    <Redo className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Redo (Ctrl+Shift+Z)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="hidden md:flex h-8 w-8">
                <Keyboard className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Keyboard Shortcuts</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 items-center gap-4">
                  <div className="font-medium text-sm">Undo</div>
                  <div className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">Ctrl+Z</div>
                </div>
                <div className="grid grid-cols-2 items-center gap-4">
                  <div className="font-medium text-sm">Redo</div>
                  <div className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">Ctrl+Shift+Z</div>
                </div>
                <div className="grid grid-cols-2 items-center gap-4">
                  <div className="font-medium text-sm">Save</div>
                  <div className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">Ctrl+S</div>
                </div>
                <div className="grid grid-cols-2 items-center gap-4">
                  <div className="font-medium text-sm">Delete Element</div>
                  <div className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">Delete</div>
                </div>
                <div className="grid grid-cols-2 items-center gap-4">
                  <div className="font-medium text-sm">Copy Element</div>
                  <div className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">Ctrl+C</div>
                </div>
                <div className="grid grid-cols-2 items-center gap-4">
                  <div className="font-medium text-sm">Paste Element</div>
                  <div className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">Ctrl+V</div>
                </div>
                <div className="grid grid-cols-2 items-center gap-4">
                  <div className="font-medium text-sm">Move Element</div>
                  <div className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">Drag & Drop</div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant={isEditMode ? "outline" : "default"}
            size="sm"
            onClick={onToggleEditMode}
            className="h-8 gap-1.5"
          >
            {isEditMode ? (
              <>
                <Eye className="h-4 w-4" />
                <span className="text-xs">Preview</span>
              </>
            ) : (
              <>
                <Edit className="h-4 w-4" />
                <span className="text-xs">Edit</span>
              </>
            )}
          </Button>

          {isEditMode && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="default" size="sm" onClick={handleSave} className="h-8 gap-1.5">
                    <Save className="h-4 w-4" />
                    <span className="text-xs">Save</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Save Changes (Ctrl+S)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </header>
  )
}

export default EditorHeader

