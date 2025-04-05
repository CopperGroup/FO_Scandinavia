"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Smartphone, Tablet, Monitor, Grid3X3, RefreshCw, Laptop, LayoutGrid, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ParsedElement } from "@/types/editor"
import ElementRenderer from "./element-renderer"
import PreviewRenderer from "./preview-renderer"

interface EditorWorkspaceProps {
  content: string
  parsedContent: ParsedElement | null
  isEditMode: boolean
  selectedElement: ParsedElement | null
  onElementClick: (element: ParsedElement, event: React.MouseEvent) => void
  renderActions: (element: ParsedElement) => React.ReactNode
  onMoveElement?: (elementId: string, direction: "up" | "down") => void
  onDuplicateElement?: (elementId: string) => void
  onDeleteElement?: (elementId: string) => void
  onAddElement?: (parentId: string, elementType: string) => void
}

const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
  content,
  parsedContent,
  isEditMode,
  selectedElement,
  onElementClick,
  renderActions,
  onMoveElement,
  onDuplicateElement,
  onDeleteElement,
  onAddElement,
}) => {
  const [viewMode, setViewMode] = useState<"normal" | "outline" | "grid">("normal")
  const [screenWidth, setScreenWidth] = useState<string>("100%")
  const [customWidth, setCustomWidth] = useState<number>(100)
  const workspaceRef = useRef<HTMLDivElement>(null)
  const [deviceWidth, setDeviceWidth] = useState<string | null>(null)
  const [scale, setScale] = useState<number>(1)
  const refreshPreviewRef = useRef<(() => void) | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Device presets
  const devicePresets = [
    { name: "Mobile", icon: Smartphone, width: "375px" },
    { name: "Tablet", icon: Tablet, width: "768px" },
    { name: "Laptop", icon: Laptop, width: "1024px" },
    { name: "Desktop", icon: Monitor, width: "1280px" },
    { name: "Full", icon: Maximize2, width: "100%" },
  ]

  // Helper function to parse width and return a numeric value
  const parseWidth = (width: string | null): number => {
    if (!width) return 0 // Default to 0 if width is null or undefined
    const parsedValue = Number.parseInt(width, 10)
    return isNaN(parsedValue) ? 0 : parsedValue
  }

  const getContentContainerStyle = () => {
    if (deviceWidth === "100%") {
      return {
        width: "100%",
        height: "100%",
        overflowY: "auto",
        overflowX: "auto",
        minHeight: "200px", // Ensure minimum height
      }
    }

    // Get the numeric width for calculations
    const numericWidth = parseWidth(deviceWidth)

    // Base styles for all cases
    const baseStyles = {
      maxWidth: deviceWidth, // Use maxWidth instead of width
      width: "100%", // Set width to 100% to respect parent container
      minWidth: "200px", // Ensure minimum width
      border: "1px solid #e5e7eb",
      borderRadius: "0.5rem",
      height: "100%",
      minHeight: "200px", // Ensure minimum height
      overflowY: "auto",
      overflowX: "auto",
      transition: "max-width 0.3s ease-in-out", // Transition maxWidth instead of width
    }

    // For screens larger than the viewport, we scale down
    if (scale < 1) {
      return {
        ...baseStyles,
        transform: `scale(${scale})`,
        transformOrigin: "top center",
        marginTop: 0,
        marginRight: "auto",
        marginBottom: 30,
        marginLeft: "auto",
        height: `calc(100% / ${scale})`, // Adjust height to account for scaling
        maxHeight: `calc(100vh / ${scale})`, // Prevent excessive height
        overflowY: "auto", // Ensure vertical scrolling
      }
    }

    // For screens that fit within the viewport
    return {
      ...baseStyles,
      marginTop: 0,
      marginRight: "auto",
      marginBottom: 0,
      marginLeft: "auto",
      overflowY: "auto", // Ensure vertical scrolling
    }
  }

  // Handle custom width changes
  const handleCustomWidthChange = (value: string) => {
    const width = Number.parseInt(value)
    if (!isNaN(width)) {
      setCustomWidth(width)
      setDeviceWidth(`${width}px`)
    }
  }

  const handleDevicePreset = (width: string) => {
    setDeviceWidth(width)
  }

  // Reset workspace scroll position when switching modes
  useEffect(() => {
    if (workspaceRef.current) {
      workspaceRef.current.scrollTop = 0
    }
  }, [isEditMode, viewMode, deviceWidth])

  useEffect(() => {
    if (workspaceRef.current && deviceWidth !== "100%") {
      const containerWidth = workspaceRef.current.offsetWidth
      const elementWidth = Number.parseInt(deviceWidth || "0")
      if (containerWidth && elementWidth) {
        setScale(Math.min(1, containerWidth / elementWidth))
      }
    } else {
      setScale(1)
    }
  }, [deviceWidth])

  const handleRefreshPreview = useCallback(() => {
    if (refreshPreviewRef.current) {
      refreshPreviewRef.current()
    }
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Workspace controls */}
      <div className="flex items-center justify-between p-2 border-b">
        {/* View mode selector */}
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "normal" | "outline" | "grid")}>
          <TabsList className="h-8">
            <TabsTrigger value="normal" className="h-7 px-2">
              <LayoutGrid className="h-4 w-4 mr-1" />
              Normal
            </TabsTrigger>
            <TabsTrigger value="outline" className="h-7 px-2">
              <Grid3X3 className="h-4 w-4 mr-1" />
              Outline
            </TabsTrigger>
            <TabsTrigger value="grid" className="h-7 px-2">
              <Grid3X3 className="h-4 w-4 mr-1" />
              Grid
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Screen width controls */}
        <div className="mb-4 flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-gray-500 mr-2">Screen:</div>

            {/* Device presets as icon-only buttons */}
            <div className="flex gap-1">
              {devicePresets.map((device) => (
                <Button
                  key={device.name}
                  variant={deviceWidth === device.width ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDevicePreset(device.width)}
                  title={device.name}
                >
                  <device.icon className="h-4 w-4" />
                </Button>
              ))}
            </div>

            {/* Custom width input */}
            <div className="flex items-center gap-1 ml-2">
              <input
                type="text"
                value={customWidth}
                onChange={(e) => handleCustomWidthChange(e.target.value)}
                className="w-20 h-8 px-2 border rounded text-sm"
                placeholder="Width"
                title="Custom width (e.g. 1920px)"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  // Toggle between scaled and 100% views
                  if (scale < 1) {
                    setDeviceWidth("100%")
                  } else {
                    handleCustomWidthChange(customWidth)
                  }
                }}
                title={scale < 1 ? "View at 100%" : "Scale to fit"}
              >
                {scale < 1 ? "1:1" : <Maximize2 className="h-4 w-4" />}
              </Button>

              {/* Refresh button */}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 ml-1"
                onClick={handleRefreshPreview}
                title="Refresh preview"
              >
                <RefreshCw className={`h-4 w-4" ${refreshPreviewRef.current ? "" : "opacity-50"}`} />
              </Button>
            </div>
          </div>

          {scale < 1 && <div className="text-xs text-gray-500">Scale: {Math.round(scale * 100)}%</div>}
        </div>
      </div>

      {/* Workspace content */}
      <div
        ref={workspaceRef}
        className={cn(
          "flex-1 overflow-auto p-4",
          viewMode === "outline" && "bg-gray-50",
          viewMode === "grid" && "bg-grid-pattern",
        )}
      >
        <div className="w-full h-full flex justify-center overflow-auto">
          <div
            ref={contentRef}
            className={cn(
              "@containercontainer-type-size content-container transition-all duration-300 ease-in-out overflow-auto",
              scale < 1 && "scaled-container",
            )}
            style={getContentContainerStyle()}
          >
            {isEditMode ? (
              <ElementRenderer
                element={parsedContent!}
                isEditMode={isEditMode}
                selectedElement={selectedElement}
                onElementClick={onElementClick}
                renderActions={renderActions}
                onMoveElement={onMoveElement}
                onDuplicateElement={onDuplicateElement}
                onDeleteElement={onDeleteElement}
                onAddElement={onAddElement}
              />
            ) : (
              <PreviewRenderer
                content={content}
                parsedContent={parsedContent}
                screenWidth={deviceWidth || screenWidth}
                onRefreshCallback={(refreshFn) => {
                  refreshPreviewRef.current = refreshFn
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditorWorkspace

