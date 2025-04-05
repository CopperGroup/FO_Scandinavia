"use client"

import type React from "react"

import { useRef, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { ParsedElement } from "@/types/editor"

interface ContentPreviewProps {
  isEditMode: boolean
  parsedContent: ParsedElement | null
  content: string
  selectedElement: ParsedElement | null
  onElementClick: (element: ParsedElement, event: React.MouseEvent) => void
  scale: number
  previewWidth: number | null
}

export const ContentPreview = ({
  isEditMode,
  parsedContent,
  content,
  selectedElement,
  onElementClick,
  scale,
  previewWidth,
}: ContentPreviewProps) => {
  const contentRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  // Measure container width on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }

    updateWidth()
    window.addEventListener("resize", updateWidth)
    return () => window.removeEventListener("resize", updateWidth)
  }, [])

  // Render element function (moved from element-renderer for simplicity)
  const renderElement = (element: ParsedElement) => {
    const isSelected = selectedElement?.id === element.id

    return (
      <div
        key={element.id}
        className={cn(
          "relative border-2 border-transparent transition-all",
          isEditMode && "hover:border-gray-300 hover:cursor-pointer",
          isSelected && "border-blue-500 ring-2 ring-blue-200",
        )}
        onClick={(e) => onElementClick(element, e)}
      >
        {isEditMode && (
          <div
            className={cn(
              "absolute -top-6 right-0 text-xs px-2 py-1 rounded flex items-center gap-1 z-10",
              isSelected ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700",
            )}
          >
            <span>{element.type}</span>
          </div>
        )}

        {element.type === "img" ? (
          <img
            src={element.attributes?.src || "/placeholder.svg?height=200&width=300"}
            alt={element.attributes?.alt || ""}
            className={element.className}
            width={element.attributes?.width ? Number.parseInt(element.attributes.width) : undefined}
            height={element.attributes?.height ? Number.parseInt(element.attributes.height) : undefined}
          />
        ) : element.type === "a" ? (
          <a
            href={isEditMode ? "#" : element.attributes?.href || "#"}
            target={element.attributes?.target}
            className={element.className}
            onClick={(e) => isEditMode && e.preventDefault()}
          >
            {element.textContent}
          </a>
        ) : element.textContent ? (
          <div dangerouslySetInnerHTML={{ __html: element.textContent }} />
        ) : null}

        {element.children && element.children.map((child) => renderElement(child))}
      </div>
    )
  }

  if (!isEditMode) {
    return (
      <div
        ref={contentRef}
        className="min-h-[400px] p-4 border rounded bg-white w-full"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    )
  }

  // Calculate content width based on preview width and container width
  // const contentWidth = previewWidth || 1280
  // const scaleFactor = scale < 1 ? scale : 1
  // const visibleWidth = Math.min(contentWidth * scaleFactor, containerWidth)

  return (
    <div
      ref={containerRef}
      className="relative w-full border rounded bg-gray-50 overflow-hidden"
      style={{ minHeight: "400px" }}
    >
      {/* Debugging info */}
      <div className="absolute top-0 left-0 bg-black bg-opacity-70 text-white text-xs p-1 z-50">
        Scale: {scale.toFixed(2)} | Container: {containerWidth}px
      </div>

      {/* Simple left-aligned container */}
      <div className="w-full h-full overflow-auto p-4">
        <div
          ref={contentRef}
          className="bg-white border rounded shadow-sm p-4 inline-block"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: previewWidth ? `${previewWidth}px` : "100%",
            maxWidth: "100%",
          }}
        >
          {parsedContent && renderElement(parsedContent)}
        </div>
      </div>
    </div>
  )
}

export default ContentPreview

