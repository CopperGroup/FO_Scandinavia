"use client"

import { ParsedElement } from "@/lib/types/types"
import type React from "react"

import { useState, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"

export function useJsxEditor(initialContent: string, onSave: (content: string) => void) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [content, setContent] = useState(initialContent)
  const [parsedContent, setParsedContent] = useState<ParsedElement | null>(null)
  const [selectedElement, setSelectedElement] = useState<ParsedElement | null>(null)
  const [breadcrumbs, setBreadcrumbs] = useState<ParsedElement[]>([])

  // Parse JSX string to a manipulable structure
  useEffect(() => {
    try {
      // This is a simplified parser for demonstration
      // In a real implementation, you would use a proper JSX parser
      const simpleParse = (jsxString: string): ParsedElement => {
        // For demo purposes, we'll create a mock parsed structure
        // In a real implementation, you would parse the JSX properly
        const rootElement: ParsedElement = {
          id: "root",
          type: "div",
          children: [],
        }

        // Mock parsing the JSX string
        // This is just for demonstration - a real implementation would properly parse the JSX
        const mockParsed = createMockParsedStructure(jsxString)

        return mockParsed
      }

      setParsedContent(simpleParse(content))
    } catch (error) {
      console.error("Error parsing JSX:", error)
    }
  }, [content])

  // Mock function to create a parsed structure from JSX
  // In a real implementation, you would use a proper JSX parser
  const createMockParsedStructure = (jsxString: string): ParsedElement => {
    // This is just a mock implementation for demonstration
    return {
      id: "root",
      type: "div",
      className: "container mx-auto p-4",
      children: [
        {
          id: "heading",
          type: "h1",
          className: "text-2xl font-bold mb-4",
          style: { color: "blue" },
          textContent: "Welcome to JSX Editor",
          originalTag: "<h1 className=\"text-2xl font-bold mb-4\" style={{ color: 'blue' }}>Welcome to JSX Editor</h1>",
          parent: "root",
        },
        {
          id: "paragraph",
          type: "p",
          className: "mb-2",
          textContent: "This is a paragraph that you can edit.",
          originalTag: '<p className="mb-2">This is a paragraph that you can edit.</p>',
          parent: "root",
        },
        {
          id: "flex-container",
          type: "div",
          className: "flex flex-col md:flex-row items-center gap-4 mb-4",
          children: [
            {
              id: "image",
              type: "img",
              className: "rounded-lg shadow-md",
              attributes: {
                src: "/placeholder.svg?height=200&width=300",
                alt: "Placeholder image",
                width: "300",
                height: "200",
              },
              originalTag:
                '<img src="/placeholder.svg?height=200&width=300" alt="Placeholder image" className="rounded-lg shadow-md" width="300" height="200" />',
              parent: "flex-container",
            },
            {
              id: "image-content",
              type: "div",
              className: "space-y-2",
              children: [
                {
                  id: "image-heading",
                  type: "h2",
                  className: "text-xl font-semibold",
                  textContent: "Image Example",
                  originalTag: '<h2 className="text-xl font-semibold">Image Example</h2>',
                  parent: "image-content",
                },
                {
                  id: "image-paragraph",
                  type: "p",
                  textContent: "You can now edit images and links in the JSX editor.",
                  originalTag: "<p>You can now edit images and links in the JSX editor.</p>",
                  parent: "image-content",
                },
                {
                  id: "link",
                  type: "a",
                  className: "text-blue-500 hover:underline",
                  attributes: {
                    href: "https://example.com",
                    target: "_blank",
                  },
                  textContent: "Visit Example Site",
                  originalTag:
                    '<a href="https://example.com" className="text-blue-500 hover:underline" target="_blank">Visit Example Site</a>',
                  parent: "image-content",
                },
              ],
              originalTag: '<div className="space-y-2">...</div>',
              parent: "flex-container",
            },
          ],
          originalTag: '<div className="flex flex-col md:flex-row items-center gap-4 mb-4">...</div>',
          parent: "root",
        },
        {
          id: "button-container",
          type: "div",
          className: "flex items-center gap-2",
          children: [
            {
              id: "button",
              type: "button",
              className: "bg-blue-500 text-white px-4 py-2 rounded",
              textContent: "Click Me",
              originalTag: '<button className="bg-blue-500 text-white px-4 py-2 rounded">Click Me</button>',
              parent: "button-container",
            },
            {
              id: "span",
              type: "span",
              className: "text-gray-500",
              textContent: "This is a span element",
              originalTag: '<span className="text-gray-500">This is a span element</span>',
              parent: "button-container",
            },
          ],
          originalTag: '<div className="flex items-center gap-2">...</div>',
          parent: "root",
        },
      ],
      originalTag: '<div className="container mx-auto p-4">...</div>',
    }
  }

  // Convert the parsed structure back to JSX
  const generateJsx = (element: ParsedElement): string => {
    if (!element) return ""

    // In a real implementation, you would properly generate JSX from the parsed structure
    // This is just a simplified version for demonstration

    // For our demo, we'll just return the original content with updated text and styles
    let updatedContent = content

    // Update all elements with their new text content, styles, and attributes
    const updateElements = (el: ParsedElement) => {
      if (el.originalTag) {
        let newTag = el.originalTag

        // Update text content
        if (el.textContent && el.type !== "img") {
          const tagParts = el.originalTag.split(">")
          if (tagParts.length >= 2) {
            const closingTagIndex = el.originalTag.lastIndexOf("<")
            newTag = tagParts[0] + ">" + el.textContent + el.originalTag.substring(closingTagIndex)
          }
        }

        // Update style
        if (el.style) {
          const styleStr = Object.entries(el.style)
            .map(([key, value]) => `${key}: '${value}'`)
            .join(", ")

          const styleRegex = /style=\{\{(.*?)\}\}/
          const hasStyle = styleRegex.test(newTag)

          if (hasStyle) {
            newTag = newTag.replace(styleRegex, `style={{ ${styleStr} }}`)
          } else if (Object.keys(el.style).length > 0) {
            // Add style if it doesn't exist
            const insertPoint = newTag.indexOf(">")
            if (insertPoint !== -1) {
              newTag = newTag.substring(0, insertPoint) + ` style={{ ${styleStr} }}` + newTag.substring(insertPoint)
            }
          }
        }

        // Update className
        if (el.className) {
          const classNameRegex = /className=["']([^"']*)["']/
          if (classNameRegex.test(newTag)) {
            newTag = newTag.replace(classNameRegex, `className="${el.className}"`)
          } else {
            // Add className if it doesn't exist
            const insertPoint = newTag.indexOf(">")
            if (insertPoint !== -1) {
              newTag = newTag.substring(0, insertPoint) + ` className="${el.className}"` + newTag.substring(insertPoint)
            }
          }
        }

        // Update attributes for images and links
        if (el.attributes) {
          Object.entries(el.attributes).forEach(([key, value]) => {
            const attrRegex = new RegExp(`${key}=["']([^"']*)["']`)
            if (attrRegex.test(newTag)) {
              newTag = newTag.replace(attrRegex, `${key}="${value}"`)
            } else {
              // Add attribute if it doesn't exist
              const insertPoint = newTag.indexOf(">")
              if (insertPoint !== -1) {
                newTag = newTag.substring(0, insertPoint) + ` ${key}="${value}"` + newTag.substring(insertPoint)
              }
            }
          })
        }

        // Replace the original tag with the updated one
        updatedContent = updatedContent.replace(el.originalTag, newTag)
      }

      // Process children recursively
      if (el.children) {
        el.children.forEach(updateElements)
      }
    }

    updateElements(element)
    return updatedContent
  }

  const handleToggleEditMode = () => {
    if (isEditMode) {
      // If switching from edit to preview, generate the updated JSX
      if (parsedContent) {
        const updatedJsx = generateJsx(parsedContent)
        setContent(updatedJsx)
      }
    }
    setIsEditMode(!isEditMode)
    setSelectedElement(null)
    setBreadcrumbs([])
  }

  const handleSaveContent = () => {
    if (parsedContent) {
      const updatedJsx = generateJsx(parsedContent)
      setContent(updatedJsx)
      onSave(updatedJsx)
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
          children: parent.children.map((child: any) => updateElementInTree(child)),
        }
      }

      return parent
    }

    const newParsedContent = updateElementInTree(parsedContent)
    setParsedContent(newParsedContent)

    // If the updated element is the selected element, update the selected element reference
    if (selectedElement && selectedElement.id === updatedElement.id) {
      setSelectedElement(updatedElement)
    }
  }

  // Add a new element to the tree
  const addElement = (parentId: string, elementType: string, position?: number) => {
    if (!parsedContent) return

    const newElement: ParsedElement = {
      id: uuidv4(),
      type: elementType,
      parent: parentId,
      textContent: getDefaultTextContent(elementType),
      className: getDefaultClassName(elementType),
      attributes: getDefaultAttributes(elementType),
      originalTag: `<${elementType}></${elementType}>`,
    }

    const addElementToTree = (parent: ParsedElement): ParsedElement => {
      if (parent.id === parentId) {
        const children = parent.children || []
        const newChildren =
          position !== undefined
            ? [...children.slice(0, position), newElement, ...children.slice(position)]
            : [...children, newElement]

        return {
          ...parent,
          children: newChildren,
        }
      }

      if (parent.children) {
        return {
          ...parent,
          children: parent.children.map((child: any) => addElementToTree(child)),
        }
      }

      return parent
    }

    const newParsedContent = addElementToTree(parsedContent)
    setParsedContent(newParsedContent)

    // Select the new element
    setSelectedElement(newElement)

    // Update breadcrumbs
    const newBreadcrumbs: ParsedElement[] = []
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

    findAncestors(newParsedContent, newElement.id)
    setBreadcrumbs(newBreadcrumbs)
  }

  // Duplicate an element in the tree
  const duplicateElement = (elementId: string) => {
    if (!parsedContent) return

    let elementToDuplicate: ParsedElement | null = null
    let parentId: string | undefined = undefined

    // Find the element to duplicate and its parent
    const findElement = (parent: ParsedElement): void => {
      if (parent.children) {
        for (const child of parent.children) {
          if (child.id === elementId) {
            elementToDuplicate = child
            parentId = parent.id
            return
          }
          findElement(child)
        }
      }
    }

    findElement(parsedContent)

    if (!elementToDuplicate || !parentId) return

    // Create a deep copy of the element with a new ID
    const duplicateElementDeep = (element: ParsedElement): ParsedElement => {
      const newId = uuidv4()

      const newElement: ParsedElement = {
        ...element,
        id: newId,
        parent: parentId,
      }

      if (element.children) {
        newElement.children = element.children.map((child: any) => duplicateElementDeep({ ...child, parent: newId }))
      }

      return newElement
    }

    const duplicatedElement = duplicateElementDeep(elementToDuplicate)

    // Add the duplicated element to the tree
    const addDuplicatedElement = (parent: ParsedElement): ParsedElement => {
      if (parent.id === parentId) {
        const children = parent.children || []
        const elementIndex = children.findIndex((child: { id: string }) => child.id === elementId)

        if (elementIndex !== -1) {
          return {
            ...parent,
            children: [...children.slice(0, elementIndex + 1), duplicatedElement, ...children.slice(elementIndex + 1)],
          }
        }

        return {
          ...parent,
          children: [...children, duplicatedElement],
        }
      }

      if (parent.children) {
        return {
          ...parent,
          children: parent.children.map((child: any) => addDuplicatedElement(child)),
        }
      }

      return parent
    }

    const newParsedContent = addDuplicatedElement(parsedContent)
    setParsedContent(newParsedContent)

    // Select the duplicated element
    setSelectedElement(duplicatedElement)

    // Update breadcrumbs
    const newBreadcrumbs: ParsedElement[] = []
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

    findAncestors(newParsedContent, duplicatedElement.id)
    setBreadcrumbs(newBreadcrumbs)
  }

  // Delete an element from the tree
  const deleteElement = (elementId: string) => {
    if (!parsedContent) return

    // Cannot delete the root element
    if (elementId === "root") return

    const deleteElementFromTree = (parent: ParsedElement): ParsedElement => {
      if (parent.children) {
        const newChildren = parent.children.filter((child: { id: string }) => child.id !== elementId)

        if (newChildren.length !== parent.children.length) {
          return {
            ...parent,
            children: newChildren,
          }
        }

        return {
          ...parent,
          children: parent.children.map((child: any) => deleteElementFromTree(child)),
        }
      }

      return parent
    }

    const newParsedContent = deleteElementFromTree(parsedContent)
    setParsedContent(newParsedContent)

    // If the deleted element was selected, clear selection
    if (selectedElement && selectedElement.id === elementId) {
      setSelectedElement(null)
      setBreadcrumbs([])
    }
  }

  // Helper functions for default element properties
  const getDefaultTextContent = (elementType: string): string | undefined => {
    switch (elementType) {
      case "h1":
        return "Heading 1"
      case "h2":
        return "Heading 2"
      case "h3":
        return "Heading 3"
      case "p":
        return "Paragraph text"
      case "span":
        return "Span text"
      case "button":
        return "Button"
      case "a":
        return "Link text"
      default:
        return elementType === "img" ? undefined : ""
    }
  }

  const getDefaultClassName = (elementType: string): string => {
    switch (elementType) {
      case "h1":
        return "text-3xl font-bold mb-4"
      case "h2":
        return "text-2xl font-semibold mb-3"
      case "h3":
        return "text-xl font-medium mb-2"
      case "p":
        return "mb-4"
      case "div":
        return "p-4"
      case "img":
        return "rounded-md"
      case "button":
        return "px-4 py-2 bg-blue-500 text-white rounded-md"
      case "a":
        return "text-blue-500 hover:underline"
      default:
        return ""
    }
  }

  const getDefaultAttributes = (elementType: string): Record<string, string> | undefined => {
    switch (elementType) {
      case "img":
        return {
          src: "/placeholder.svg?height=200&width=300",
          alt: "Placeholder image",
          width: "300",
          height: "200",
        }
      case "a":
        return {
          href: "#",
          target: "_blank",
        }
      default:
        return undefined
    }
  }

  return {
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
  }
}

