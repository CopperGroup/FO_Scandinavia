"use client"

import type React from "react"
import { useRef, useState, useEffect, useCallback } from "react"
import type { ParsedElement } from "@/types/editor"
import ElementRenderer from "./workspace/element-renderer"
import ElementActions from "./workspace/element-actions"
import ElementLabel from "./workspace/element-label"
import Breadcrumbs from "./workspace/breadcrumbs"
import PreviewRenderer from "./workspace/preview-renderer"
import { Button } from "@/components/ui/button"
import { Smartphone, Tablet, Monitor, Maximize, Layers, Settings, Grid3X3, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { parseWidth, addContainerQueryStyles } from "@/lib/responsive-simulator"

// Update the interface to include optional text content and attributes parameters
interface EditorWorkspaceProps {
  content: string
  parsedContent: ParsedElement | null
  selectedElement: ParsedElement | null
  isEditMode: boolean
  breadcrumbs: ParsedElement[]
  onElementClick: (element: ParsedElement, event: React.MouseEvent) => void
  onAddElement: (
    parentId: string,
    elementType: string,
    position?: number,
    textContent?: string,
    attributes?: Record<string, string>,
  ) => void
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
  onMoveElement?: (elementId: string, direction: "up" | "down") => void
}

// Device presets for responsive testing
const devicePresets = [
  { name: "Mobile", icon: Smartphone, width: "375px" },
  { name: "Tablet", icon: Tablet, width: "768px" },
  { name: "Desktop", icon: Monitor, width: "1280px" },
  { name: "Full Width", icon: Maximize, width: "100%" },
]

const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
  content,
  parsedContent,
  selectedElement,
  isEditMode,
  breadcrumbs,
  onElementClick,
  onAddElement,
  onAddComponent,
  onDuplicateElement,
  onDeleteElement,
  onMoveElement,
}) => {
  const contentRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<"normal" | "outline" | "grid">("normal")
  const [deviceWidth, setDeviceWidth] = useState<string>("375px") // Default to mobile width
  const [customWidth, setCustomWidth] = useState<string>("375px") // Default custom width
  const [scale, setScale] = useState<number>(1) // Scale factor for large screens
  const [previewWidth, setPreviewWidth] = useState<number | null>(null)
  const className = ""
  const style = {}

  // Simplified renderElement function that fixes the outline mode duplication issue
  const renderElement = (element: ParsedElement) => {
    return (
      <div
        key={element.id}
        className={cn(
          "relative",
          viewMode === "outline" && "outline-element",
          viewMode === "grid" && "bg-gray-50/30 p-1 border border-dashed border-gray-300",
        )}
        data-element-id={element.id}
        data-element-type={element.type}
      >
        <ElementRenderer
          element={element}
          isEditMode={isEditMode}
          selectedElement={selectedElement}
          onElementClick={onElementClick}
          renderActions={(element) => (
            <>
              {isEditMode && <ElementLabel element={element} isSelected={selectedElement?.id === element.id} />}
              <ElementActions
                element={element}
                onAddElement={onAddElement}
                onAddComponent={onAddComponent}
                onDuplicateElement={onDuplicateElement}
                onDeleteElement={onDeleteElement}
                onMoveElement={onMoveElement}
              />
            </>
          )}
        />
      </div>
    )
  }

  // Handle adding element to root
  const handleAddElementToRoot = (elementType: string) => {
    if (parsedContent) {
      // Add default text content for text elements
      if (elementType === "p") {
        onAddElement("root", elementType, undefined, "This is a paragraph. Click to edit.")
      } else if (elementType === "h1") {
        onAddElement("root", elementType, undefined, "Heading 1")
      } else if (elementType === "h2") {
        onAddElement("root", elementType, undefined, "Heading 2")
      } else if (elementType === "button") {
        onAddElement("root", elementType, undefined, "Button")
      } else if (elementType === "img") {
        // For images, add a default src attribute
        onAddElement("root", elementType, undefined, "", {
          src: "/placeholder.svg?height=200&width=300",
          alt: "Placeholder image",
        })
      } else {
        // For other elements like div, no default text content
        onAddElement("root", elementType)
      }
    }
  }

  // Replace the handleDevicePreset function with this improved version
  const handleDevicePreset = (width: string) => {
    // First reset scale to avoid any scaling issues during transition
    setScale(1)

    // Set the device width - use setState callback to ensure up-to-date value
    setDeviceWidth(width)

    // Update custom width input field if a specific width is selected
    if (width !== "100%") {
      setCustomWidth(width)
    }

    // Force a re-render of the preview container with a more reliable approach
    setTimeout(() => {
      if (contentRef.current) {
        // Apply the width directly to the element style
        contentRef.current.style.width = width

        // Small delay before recalculating scale
        setTimeout(() => {
          const newScale = calculateScale()
          setScale(newScale)
        }, 100)
      }
    }, 50)
  }

  // Replace the handleCustomWidthChange function
  const handleCustomWidthChange = (value: string) => {
    setCustomWidth(value)
    setDeviceWidth(value)
    setScale(1) // Reset scale when manually changing width
  }

  // Add this function to calculate the scale for large screens
  const calculateScale = useCallback(() => {
    if (!containerRef.current || deviceWidth === "100%") {
      return 1
    }

    // Parse the width value
    const numericWidth = Number.parseInt(deviceWidth.replace(/[^0-9]/g, ""))

    if (isNaN(numericWidth)) {
      return 1
    }

    // Get container width (accounting for padding)
    const containerWidth = containerRef.current.clientWidth - 48 // 24px padding on each side

    // If device width is larger than container, calculate scale
    if (numericWidth > containerWidth) {
      // Use a slightly smaller scale to ensure content doesn't touch edges
      return (containerWidth / numericWidth) * 0.95
    }

    return 1
  }, [deviceWidth])

  // Add this effect to update scale when needed
  useEffect(() => {
    const newScale = calculateScale()
    if (newScale !== scale) {
      setScale(newScale)
    }

    // Add resize listener to recalculate scale when window is resized
    const handleResize = () => {
      setScale(calculateScale())
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [calculateScale, scale])

  // Update the getContentContainerStyle function to be more reliable
  const getContentContainerStyle = () => {
    if (deviceWidth === "100%") {
      return {
        width: "100%",
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        minHeight: "200px", // Ensure minimum height
      }
    }

    // Get the numeric width for calculations
    const numericWidth = parseWidth(deviceWidth)

    // Base styles for all cases
    const baseStyles = {
      width: deviceWidth,
      minWidth: "200px", // Ensure minimum width
      border: "1px solid #e5e7eb",
      borderRadius: "0.5rem",
      height: "100%",
      minHeight: "200px", // Ensure minimum height
      overflowY: "auto",
      overflowX: "hidden",
      transition: "width 0.3s ease-in-out", // Smooth transition for width changes
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
      maxWidth: "100%",
      marginTop: 0,
      marginRight: "auto",
      marginBottom: 0,
      marginLeft: "auto",
      overflowY: "auto", // Ensure vertical scrolling
    }
  }

  // Add this effect to ensure proper initialization of the preview
  useEffect(() => {
    // Short delay to ensure DOM is ready
    const timer = setTimeout(() => {
      // Force recalculation of scale after initial render
      if (deviceWidth !== "100%") {
        setScale(calculateScale())
      }
    }, 100)

    return () => clearTimeout(timer)
  }, []) // Empty dependency array means this runs once on mount

  // Add this effect to ensure responsive styles are applied in editor mode
  useEffect(() => {
    // Add container query styles
    addContainerQueryStyles()

    // Add container query styles for editor mode
    const addEditorContainerQueryStyles = () => {
      // Check if the style element already exists
      let styleEl = document.getElementById("editor-container-query-styles")
      if (!styleEl) {
        styleEl = document.createElement("style")
        styleEl.id = "editor-container-query-styles"
        document.head.appendChild(styleEl)
      }

      // Add container query styles for both standard and transformed classes
      styleEl.textContent = `
        /* Standard responsive classes */
        @container (min-width: 640px) { .sm\\:block { display: block !important; } }
        @container (min-width: 640px) { .sm\\:hidden { display: none !important; } }
        @container (min-width: 768px) { .md\\:block { display: block !important; } }
        @container (min-width: 768px) { .md\\:hidden { display: none !important; } }
        @container (min-width: 1024px) { .lg\\:block { display: block !important; } }
        @container (min-width: 1024px) { .lg\\:hidden { display: none !important; } }
        @container (min-width: 1280px) { .xl\\:block { display: block !important; } }
        @container (min-width: 1280px) { .xl\\:hidden { display: none !important; } }
        @container (min-width: 1536px) { .\\32xl\\:block { display: block !important; } }
        @container (min-width: 1536px) { .\\32xl\\:hidden { display: none !important; } }
        
        /* Transformed container query classes */
        @container (min-width: 640px) { .@sm\\:block { display: block !important; } }
        @container (min-width: 640px) { .@sm\\:hidden { display: none !important; } }
        @container (min-width: 768px) { .@md\\:block { display: block !important; } }
        @container (min-width: 768px) { .@md\\:hidden { display: none !important; } }
        @container (min-width: 1024px) { .@lg\\:block { display: block !important; } }
        @container (min-width: 1024px) { .@lg\\:hidden { display: none !important; } }
        @container (min-width: 1280px) { .@xl\\:block { display: block !important; } }
        @container (min-width: 1280px) { .@xl\\:hidden { display: none !important; } }
        @container (min-width: 1536px) { .@\\32xl\\:block { display: block !important; } }
        @container (min-width: 1536px) { .@\\32xl\\:hidden { display: none !important; } }
      `
    }

    addEditorContainerQueryStyles()
  }, [])

  // Add this effect to add the grid pattern CSS
  useEffect(() => {
    // Add grid pattern CSS
    const addGridPatternCSS = () => {
      // Check if the style element already exists
      let styleEl = document.getElementById("grid-pattern-styles")
      if (!styleEl) {
        styleEl = document.createElement("style")
        styleEl.id = "grid-pattern-styles"
        document.head.appendChild(styleEl)
      }

      // Add grid pattern styles
      styleEl.textContent = `
      .bg-grid-pattern {
        background-image: 
          linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
        background-size: 20px 20px;
        background-position: 0 0;
      }
    `
    }

    addGridPatternCSS()
  }, [])

  // Add this effect to add the outline mode CSS - fixed to avoid duplication
  useEffect(() => {
    // Add outline mode CSS
    const addOutlineModeCSS = () => {
      // Check if the style element already exists
      let styleEl = document.getElementById("outline-mode-styles")
      if (!styleEl) {
        styleEl = document.createElement("style")
        styleEl.id = "outline-mode-styles"
        document.head.appendChild(styleEl)
      }

      // Add outline mode styles - simplified to avoid duplication
      styleEl.textContent = `
        /* Outline mode styles */
        .outline-mode .outline-element {
          outline: 2px solid rgba(59, 130, 246, 0.5);
          outline-offset: 1px;
          margin: 2px;
          padding: 2px;
          transition: outline-color 0.2s, outline-offset 0.2s;
        }
        
        .outline-mode .outline-element:hover {
          outline-color: rgba(59, 130, 246, 0.8);
          outline-offset: 2px;
          z-index: 10;
        }
        
        .outline-mode [data-element-id]::before {
          content: attr(data-element-type);
          position: absolute;
          top: -14px;
          left: 0;
          background: rgba(59, 130, 246, 0.9);
          color: white;
          font-size: 10px;
          padding: 1px 4px;
          border-radius: 2px;
          z-index: 100;
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: none;
        }
        
        .outline-mode [data-element-id]:hover::before {
          opacity: 1;
        }
      `
    }

    addOutlineModeCSS()
  }, [])

  return (
    <div className="p-6 h-full flex flex-col">
      {isEditMode && (
        <div className="mb-4 flex flex-col gap-2">
          <Breadcrumbs
            breadcrumbs={breadcrumbs}
            selectedElement={selectedElement}
            onElementClick={onElementClick}
            className="min-w-0 overflow-hidden flex-shrink-0 flex-grow"
          />

          <div className="flex items-center gap-2 justify-between">
            <div className="bg-gray-100 p-1 rounded-md">
              <div className="flex space-x-1">
                <button
                  onClick={() => setViewMode("normal")}
                  className={cn(
                    "flex items-center px-3 py-1.5 text-xs rounded-md transition-colors",
                    viewMode === "normal" ? "bg-white text-gray-800 shadow-sm" : "text-gray-600 hover:bg-gray-200",
                  )}
                >
                  <Layers className="h-3.5 w-3.5 mr-1.5" />
                  Normal
                </button>
                <button
                  onClick={() => setViewMode("outline")}
                  className={cn(
                    "flex items-center px-3 py-1.5 text-xs rounded-md transition-colors",
                    viewMode === "outline" ? "bg-white text-gray-800 shadow-sm" : "text-gray-600 hover:bg-gray-200",
                  )}
                >
                  <Settings className="h-3.5 w-3.5 mr-1.5" />
                  Outline
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "flex items-center px-3 py-1.5 text-xs rounded-md transition-colors",
                    viewMode === "grid" ? "bg-white text-gray-800 shadow-sm" : "text-gray-600 hover:bg-gray-200",
                  )}
                >
                  <Grid3X3 className="h-3.5 w-3.5 mr-1.5" />
                  Grid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Screen width controls */}
      <div className="mb-4 flex items-center gap-2 justify-between flex-wrap">
        <div className="text-sm font-medium text-gray-500">Screen Size:</div>

        {/* Device presets and refresh button */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {devicePresets.map((device) => (
              <Button
                key={device.name}
                variant="outline"
                size="sm"
                className={`h-8 w-8 p-0 transition-all duration-200 ${
                  deviceWidth === device.width
                    ? "bg-black text-white border-black hover:bg-black/90 hover:text-white"
                    : "hover:bg-gray-100"
                }`}
                onClick={() => handleDevicePreset(device.width)}
                title={`${device.name} (${device.width})`}
                data-active={deviceWidth === device.width}
                aria-pressed={deviceWidth === device.width}
              >
                <device.icon className={`h-4 w-4 ${deviceWidth === device.width ? "text-white" : ""}`} />
              </Button>
            ))}

            {/* Refresh button */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 ml-1"
              onClick={() => {
                // Refresh the preview by temporarily changing the width
                const currentWidth = deviceWidth
                setDeviceWidth("100%")
                setTimeout(() => setDeviceWidth(currentWidth), 50)
              }}
              title="Refresh Preview"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Custom width input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customWidth}
              onChange={(e) => handleCustomWidthChange(e.target.value)}
              className="w-24 h-8 px-2 border rounded text-sm"
              placeholder="e.g. 1920px"
            />
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div
        ref={containerRef}
        className={cn(
          "bg-white rounded-lg shadow-sm h-auto overflow-hidden border relative",
          !isEditMode && "bg-transparent border-none shadow-none",
          viewMode === "grid" && isEditMode && "bg-grid-pattern",
          viewMode === "outline" && isEditMode && "outline-mode",
        )}
      >
        {/* Content container */}
        <div className="w-full h-full overflow-auto">
          <div
            className={cn("scale-wrapper", scale < 1 && "scaled-content-wrapper")}
            style={{
              display: "flex",
              justifyContent: "center", // Always center horizontally
              width: "100%",
              padding: "1rem",
            }}
          >
            <div
              ref={contentRef}
              className={cn("bg-white transition-all duration-200", className)}
              style={{
                width: previewWidth ? `${previewWidth}px` : "100%",
                transform: `scale(${scale})`,
                transformOrigin: "top center", // Change to top center for centered scaling
                maxWidth: "100%",
                margin: "0 auto", // Center the content
                ...style,
              }}
            >
              {isEditMode && parsedContent ? (
                <div
                  className="relative w-full h-full overflow-y-auto @container"
                  style={{
                    containerType: "inline-size",
                    contain: "layout style",
                  }}
                  data-responsive-container
                >
                  {renderElement(parsedContent)}
                </div>
              ) : (
                <PreviewRenderer
                  content={content}
                  parsedContent={parsedContent}
                  screenWidth={deviceWidth}
                  scale={scale}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditorWorkspace

