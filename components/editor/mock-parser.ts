import { ParsedElement } from "@/types/editor"

// Mock function to create a parsed structure from JSX
// In a real implementation, you would use a proper JSX parser
export const createMockParsedStructure = (jsxString: string): ParsedElement => {
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
            className: "bg-green-500 text-white px-4 py-2 rounded",
            textContent: "Click Me",
            originalTag: '<button className="bg-blue-500 text-white px-4 py-2 rounded">Click Me</button>',
            parent: "button-container",
          },
          {
            id: "span",
            type: "span",
            className: "text-gray-500",
            textContent: "This is a span element",
            originalTag: '<span className="text-green-500">This is a span element</span>',
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
export const generateJsx = (element: ParsedElement, content: string): string => {
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

