"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Edit, Eye, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Breadcrumbs from "./editor/breadcrumbs"
import ContentPreview from "./editor/content-preview"
import PropertiesPanel from "./editor/properties-panel"
import ScreenSizeControls from "./editor/screen-size-controls"
import { createMockParsedStructure, generateJsx } from "./editor/mock-parser"
import { ParsedElement } from "@/types/editor"

interface EditorComponentProps {
  initialContent: string
  onSave: (content: string) => void
}

const EditorComponent: React.FC<EditorComponentProps> = ({ initialContent, onSave }) => {
  const [isEditMode, setIsEditMode] = useState(false)
  const [content, setContent] = useState(initialContent)
  const [parsedContent, setParsedContent] = useState<ParsedElement | null>(null)
  const [selectedElement, setSelectedElement] = useState<ParsedElement | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<ParsedElement[]>([])
  const [scale, setScale] = useState(1)
  const [previewWidth, setPreviewWidth] = useState<number | null>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)

  // Parse JSX string to a manipulable structure
  useEffect(() => {
    try {
      // This is a simplified parser for demonstration
      // In a real implementation, you would use a proper JSX parser
      const simpleParse = (jsxString: string): ParsedElement => {
        // For demo purposes, we'll create a mock parsed structure
        // In a real implementation, you would parse the JSX properly
        const mockParsed = createMockParsedStructure(jsxString)
        return mockParsed
      }

      setParsedContent(simpleParse(content))
    } catch (error) {
      console.error("Error parsing JSX:", error)
    }
  }, [content])

  const handleToggleEditMode = () => {
    if (isEditMode) {
      // If switching from edit to preview, generate the updated JSX
      if (parsedContent) {
        const updatedJsx = generateJsx(parsedContent, content)
        setContent(updatedJsx)
      }
    }
    setIsEditMode(!isEditMode)
    setSelectedElement(null)
    setBreadcrumbs([])
    setPreviewWidth(null)
    setScale(1)
  }

  const handleSaveContent = () => {
    if (parsedContent) {
      const updatedJsx = generateJsx(parsedContent, content)
      setContent(updatedJsx)
      onSave(updatedJsx)
      setIsEditMode(false)
      setSelectedElement(null)
      setBreadcrumbs([])
    }
  }

  const handleElementClick = (element: ParsedElement, event: React.MouseEvent) => {
    if (isEditMode) {
      event.stopPropagation()
      setSelectedElement(element)

      // Update breadcrumbs
      const newBreadcrumbs: ParsedElement[] = []

      // Find the element's ancestors to build breadcrumbs
      const findAncestors = (el: ParsedElement, targetId: string): boolean => {
        if (el.id === targetId) {
          newBreadcrumbs.unshift(el)
          return true
        }

        if (el.children) {
          for (const child of el.children) {
            if (findAncestors(child, targetId)) {
              newBreadcrumbs.unshift(el)
              return true
            }
          }
        }

        return false
      }

      if (parsedContent) {
        findAncestors(parsedContent, element.id)
      }

      setBreadcrumbs(newBreadcrumbs)
    }
  }

  const handleTextChange = (value: string) => {
    if (selectedElement) {
      const updatedElement = { ...selectedElement, textContent: value }
      updateParsedElement(updatedElement)
      setSelectedElement(updatedElement)
    }
  }

  const handleStyleChange = (key: string, value: string) => {
    if (selectedElement) {
      const updatedStyle = { ...(selectedElement.style || {}), [key]: value }
      const updatedElement = { ...selectedElement, style: updatedStyle }
      updateParsedElement(updatedElement)
      setSelectedElement(updatedElement)
    }
  }

  const handleRemoveStyle = (key: string) => {
    if (selectedElement && selectedElement.style) {
      const updatedStyle = { ...selectedElement.style }
      delete updatedStyle[key]
      const updatedElement = { ...selectedElement, style: updatedStyle }
      updateParsedElement(updatedElement)
      setSelectedElement(updatedElement)
    }
  }

  const handleAddStyle = (key: string, value: string) => {
    if (selectedElement) {
      const updatedStyle = { ...(selectedElement.style || {}), [key]: value }
      const updatedElement = { ...selectedElement, style: updatedStyle }
      updateParsedElement(updatedElement)
      setSelectedElement(updatedElement)
    }
  }

  const handleAttributeChange = (key: string, value: string) => {
    if (selectedElement) {
      const updatedAttributes = { ...(selectedElement.attributes || {}), [key]: value }
      const updatedElement = { ...selectedElement, attributes: updatedAttributes }
      updateParsedElement(updatedElement)
      setSelectedElement(updatedElement)
    }
  }

  const handleScreenSizeChange = (width: number) => {
    setPreviewWidth(width)

    // Calculate scale based on container width
    if (editorContainerRef.current) {
      const containerWidth = editorContainerRef.current.clientWidth
      if (containerWidth && width > containerWidth) {
        const newScale = containerWidth / width
        console.log(`Setting scale to ${newScale} (container: ${containerWidth}, preview: ${width})`)
        setScale(newScale)
      } else {
        setScale(1)
      }
    }
  }

  // Update the parsed element in the tree
  const updateParsedElement = (updatedElement: ParsedElement) => {
    if (!parsedContent) return

    const updateElementInTree = (parent: ParsedElement): ParsedElement => {
      if (parent.id === updatedElement.id) {
        return updatedElement
      }

      if (parent.children) {
        return {
          ...parent,
          children: parent.children.map((child) => updateElementInTree(child)),
        }
      }

      return parent
    }

    setParsedContent(updateElementInTree(parsedContent))
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-md">
      <div className="bg-gray-100 p-4 flex justify-between items-center border-b">
        <h2 className="text-xl font-semibold">JSX Editor</h2>
        <div className="flex gap-2">
          <Button variant={isEditMode ? "outline" : "default"} size="sm" onClick={handleToggleEditMode}>
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
            <Button variant="default" size="sm" onClick={handleSaveContent}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row">
        <div ref={editorContainerRef} className={cn("p-4 flex-grow", isEditMode ? "w-full md:w-2/3" : "w-full")}>
          {isEditMode && (
            <>
              <ScreenSizeControls onScreenSizeChange={handleScreenSizeChange} />
              <Breadcrumbs
                breadcrumbs={breadcrumbs}
                selectedElement={selectedElement}
                onElementClick={handleElementClick}
              />
            </>
          )}

          <ContentPreview
            isEditMode={isEditMode}
            parsedContent={parsedContent}
            content={content}
            selectedElement={selectedElement}
            onElementClick={handleElementClick}
            scale={scale}
            previewWidth={previewWidth}
          />
        </div>

        {isEditMode && selectedElement && (
          <PropertiesPanel
            selectedElement={selectedElement}
            onTextChange={handleTextChange}
            onStyleChange={handleStyleChange}
            onRemoveStyle={handleRemoveStyle}
            onAddStyle={handleAddStyle}
            onAttributeChange={handleAttributeChange}
          />
        )}
      </div>
    </div>
  )
}

export default EditorComponent

