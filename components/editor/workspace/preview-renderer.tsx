"use client"

import React from "react"
import { useState, useMemo, useEffect, useCallback } from "react"
import type { ParsedElement } from "@/types/editor"
import DynamicRenderer from "./dynamic-renderer"
import { BREAKPOINTS } from "@/lib/responsive-simulator"

interface PreviewRendererProps {
  content: string
  parsedContent: ParsedElement | null
  screenWidth?: string
  scale?: number
  onRefreshCallback?: (refreshFn: () => void) => void
}

// Update the transformTailwindClasses function to better handle @container syntax
const transformTailwindClasses = (className) => {
  if (!className) return ""

  // Don't transform classes that already use @container syntax
  if (
    className.includes("@container") ||
    className.includes("@sm:") ||
    className.includes("@md:") ||
    className.includes("@lg:") ||
    className.includes("@xl:") ||
    className.includes("@2xl:")
  ) {
    return className
  }

  return className
    .split(" ")
    .map((cls) => {
      // Check for responsive breakpoint prefixes
      if (cls.startsWith("sm:")) return `@sm:${cls.substring(3)}`
      if (cls.startsWith("md:")) return `@md:${cls.substring(3)}`
      if (cls.startsWith("lg:")) return `@lg:${cls.substring(3)}`
      if (cls.startsWith("xl:")) return `@xl:${cls.substring(3)}`
      if (cls.startsWith("2xl:")) return `@2xl:${cls.substring(3)}`

      // Handle max-width variants
      if (cls.startsWith("max-sm:")) return `@max-sm:${cls.substring(7)}`
      if (cls.startsWith("max-md:")) return `@max-md:${cls.substring(7)}`
      if (cls.startsWith("max-lg:")) return `@max-lg:${cls.substring(7)}`
      if (cls.startsWith("max-xl:")) return `@max-xl:${cls.substring(7)}`
      if (cls.startsWith("max-2xl:")) return `@max-2xl:${cls.substring(8)}`

      return cls
    })
    .join(" ")
}

// Update the addContainerQueryStyles function to support @container syntax
const addContainerQueryStyles = () => {
  // Check if the style element already exists
  let styleEl = document.getElementById("preview-container-query-styles")
  if (!styleEl) {
    styleEl = document.createElement("style")
    styleEl.id = "preview-container-query-styles"
    document.head.appendChild(styleEl)
  }

  // Add container query styles for common responsive utilities using @container syntax
  styleEl.textContent = `
    /* Basic container query setup */
    .\\@container {
      container-type: inline-size;
      container-name: component;
    }
    
    /* Standard responsive utilities */
    @container (min-width: 640px) { .\\@sm\\:block { display: block !important; } }
    @container (min-width: 640px) { .\\@sm\\:hidden { display: none !important; } }
    @container (min-width: 640px) { .\\@sm\\:flex { display: flex !important; } }
    @container (min-width: 640px) { .\\@sm\\:grid { display: grid !important; } }
    @container (min-width: 640px) { .\\@sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }
    
    @container (min-width: 768px) { .\\@md\\:block { display: block !important; } }
    @container (min-width: 768px) { .\\@md\\:hidden { display: none !important; } }
    @container (min-width: 768px) { .\\@md\\:flex { display: flex !important; } }
    @container (min-width: 768px) { .\\@md\\:grid { display: grid !important; } }
    @container (min-width: 768px) { .\\@md\\:w-auto { width: auto !important; } }
    @container (min-width: 768px) { .\\@md\\:justify-end { justify-content: flex-end !important; } }
    
    @container (min-width: 1024px) { .\\@lg\\:block { display: block !important; } }
    @container (min-width: 1024px) { .\\@lg\\:hidden { display: none !important; } }
    @container (min-width: 1024px) { .\\@lg\\:flex { display: flex !important; } }
    @container (min-width: 1024px) { .\\@lg\\:grid { display: grid !important; } }
    @container (min-width: 1024px) { .\\@lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; } }
    
    @container (min-width: 1280px) { .\\@xl\\:block { display: block !important; } }
    @container (min-width: 1280px) { .\\@xl\\:hidden { display: none !important; } }
    @container (min-width: 1280px) { .\\@xl\\:flex { display: flex !important; } }
    @container (min-width: 1280px) { .\\@xl\\:grid { display: grid !important; } }
    
    @container (min-width: 1536px) { .\\@2xl\\:block { display: block !important; } }
    @container (min-width: 1536px) { .\\@2xl\\:hidden { display: none !important; } }
    @container (min-width: 1536px) { .\\@2xl\\:flex { display: flex !important; } }
    @container (min-width: 1536px) { .\\@2xl\\:grid { display: grid !important; } }
    
    /* Text utilities */
    @container (min-width: 768px) { .\\@md\\:text-xl { font-size: 1.25rem !important; line-height: 1.75rem !important; } }
    @container (min-width: 1024px) { .\\@lg\\:text-2xl { font-size: 1.5rem !important; line-height: 2rem !important; } }
    
    /* Display utilities for inline elements */
    @container (min-width: 768px) { .\\@md\\:inline { display: inline !important; } }
    @container (min-width: 768px) { .\\@md\\:inline-block { display: inline-block !important; } }
  `
}

const PreviewRenderer: React.FC<PreviewRendererProps> = ({
  content,
  parsedContent,
  screenWidth = "375px", // Default to mobile width
  scale = 1,
  onRefreshCallback,
}) => {
  const [previewKey, setPreviewKey] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [renderError, setRenderError] = useState<Error | null>(null)
  const [extractedImports, setExtractedImports] = useState<string[]>([])

  // Extract imports from the content
  useEffect(() => {
    try {
      // Simple regex to extract import statements
      const importRegex = /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"](.*)['"]/g
      const matches = content.match(importRegex) || []
      setExtractedImports(matches)
    } catch (error) {
      console.error("Error extracting imports:", error)
    }
  }, [content])

  // Function to refresh the preview
  const refreshPreview = useCallback(() => {
    setIsRefreshing(true)

    // Use requestAnimationFrame for smoother animation
    requestAnimationFrame(() => {
      setPreviewKey((prev) => prev + 1)

      // Add a small delay to simulate page refresh
      setTimeout(() => {
        setIsRefreshing(false)
      }, 300)
    })
  }, [])

  // Provide refresh function to parent component
  useEffect(() => {
    if (onRefreshCallback) {
      onRefreshCallback(refreshPreview)
    }
  }, [onRefreshCallback, refreshPreview])

  // Handle render errors
  const handleRenderError = useCallback((error: Error) => {
    setRenderError(error)
  }, [])

  // Update preview when screen width changes
  useEffect(() => {
    // This will run when screenWidth changes
    const timer = setTimeout(() => {
      refreshPreview()
    }, 100)

    return () => clearTimeout(timer)
  }, [screenWidth, refreshPreview])

  // Ensure proper initialization with default width
  useEffect(() => {
    // Force a refresh to ensure proper rendering with default width
    setTimeout(() => {
      refreshPreview()
    }, 100)
  }, [])

  // Add this useEffect to ensure container query styles are added
  useEffect(() => {
    addContainerQueryStyles()
  }, [])

  // Memoize the content to prevent unnecessary re-renders
  const memoizedContent = useMemo(() => {
    // Add extracted imports to the content if they're not already there
    let processedContent = content

    // Process the content to replace regular responsive classes with container query classes
    processedContent = processedContent.replace(/className="([^"]*)"/g, (match, capturedClassName) => {
      return `className="${transformTailwindClasses(capturedClassName)}"`
    })

    // Console log the JSX string before rendering
    console.log("JSX string before rendering:", processedContent)

    // Check if we need to add framer-motion import for animations
    const needsFramerMotion =
      content.includes("motion.") ||
      content.includes("whileHover=") ||
      content.includes("whileTap=") ||
      content.includes("whileInView=") ||
      content.includes("animate=") ||
      content.includes("initial=")

    // If the content doesn't have a default export, wrap it in one
    if (!processedContent.includes("export default")) {
      // Fix import statements to handle default exports correctly
      const importStatements = extractedImports
        .map((importStmt) => {
          // For Next.js imports, ensure we handle default exports correctly
          if (importStmt.includes("next/image") || importStmt.includes("next/link")) {
            return importStmt.replace(/import\s+{\s*(\w+)\s*}\s+from/, "import $1 from")
          }
          return importStmt
        })
        .join("\n")

      // Add framer-motion import if needed
      let additionalImports = ""
      if (needsFramerMotion && !importStatements.includes("framer-motion")) {
        additionalImports = `import { motion } from "framer-motion";\n`
      }

      // Extract numeric width for media queries
      let numericWidth = "100%"
      if (screenWidth && screenWidth !== "100%") {
        const match = screenWidth.match(/(\d+)/)
        if (match && match[1]) {
          numericWidth = match[1] + "px"
        }
      }

      // Add a wrapper with the specified width to ensure media queries work correctly
      // Also add some default responsive content to demonstrate media queries
      processedContent = `
    ${importStatements}
    ${additionalImports}
    
    export default function PreviewComponent() {
      React.useEffect(() => {
        // Simple function to process container query classes
        const processContainerQueries = () => {
          const container = document.querySelector('[data-responsive-container]');
          if (!container) return;
          
          // Add container query attribute to the container
          container.style.containerType = 'inline-size';
          
          // Find all elements with @container classes
          const elements = container.querySelectorAll('*');
          elements.forEach(el => {
            if (!el.className || typeof el.className !== 'string') return;
            
            const classes = el.className.split(' ');
            
            // Process container query classes
            classes.forEach(cls => {
              if (cls.startsWith('@')) {
                // Extract the breakpoint and class
                const parts = cls.substring(1).split(':');
                if (parts.length === 2) {
                  const breakpoint = parts[0];
                  const className = parts[1];
                  
                  // Create a container query style
                  const styleEl = document.createElement('style');
                  let query = '';
                  
                  if (breakpoint.startsWith('max-')) {
                    const size = breakpoint.substring(4);
                    const width = BREAKPOINTS[size] - 1;
                    query = \`@container (max-width: \${width}px)\`;
                  } else {
                    const width = BREAKPOINTS[breakpoint];
                    query = \`@container (min-width: \${width}px)\`;
                  }
                  
                  // Add the style to the document
                  const selector = \`[data-responsive-container] .\${cls.replace(':', '\\:')}\`;
                  styleEl.textContent = \`\${query} { \${selector} { \${getStyleForClass(className)} } }\`;
                  document.head.appendChild(styleEl);
                }
              }
            });
          });
        };
        
        // Helper function to get style for a class
        const getStyleForClass = (className) => {
          if (className.startsWith('flex-')) return \`display: flex; flex-direction: \${className.substring(5)};\`;
          if (className === 'hidden') return 'display: none;';
          if (className === 'block') return 'display: block;';
          if (className === 'flex') return 'display: flex;';
          if (className === 'grid') return 'display: grid;';
          if (className.startsWith('bg-')) return 'background-color: var(--' + className + ');';
          if (className.startsWith('text-')) return 'color: var(--' + className + ');';
          if (className.startsWith('p-')) return 'padding: ' + className.substring(2) * 0.25 + 'rem;';
          if (className.startsWith('m-')) return 'margin: ' + className.substring(2) * 0.25 + 'rem;';
          if (className.startsWith('grid-cols-')) return 'grid-template-columns: repeat(' + className.substring(10) + ', minmax(0, 1fr));';
          return '';
        };
        
        // Run once on mount
        processContainerQueries();
        
        // Set up resize observer
        if (typeof ResizeObserver !== 'undefined') {
          const container = document.querySelector('[data-responsive-container]');
          if (container) {
            const observer = new ResizeObserver(processContainerQueries);
            observer.observe(container);
            return () => observer.disconnect();
          }
        }
      }, []);

      return (
        <div 
          data-responsive-container
          style={{ 
            width: '${numericWidth}', 
            marginLeft: 'auto', 
            marginRight: 'auto',
            height: '100%',
            overflow: 'auto',
            containerType: 'inline-size',
            contain: 'layout style'
          }}
        >
          ${
            processedContent ||
            `
            <div className="p-4">
              <h1 className="text-2xl font-bold mb-4">Responsive Preview</h1>
              <div className="bg-blue-100 p-4 rounded-lg mb-4 sm:bg-green-100 md:bg-yellow-100 lg:bg-purple-100 xl:bg-pink-100">
                <p className="text-lg">This box changes color based on screen size:</p>
                <ul className="list-disc pl-5 mt-2">
                  <li className="sm:hidden block text-blue-600 font-bold">Default screen (blue)</li>
                  <li className="hidden sm:block md:hidden text-green-600 font-bold">SM breakpoint (green)</li>
                  <li className="hidden md:block lg:hidden text-yellow-600 font-bold">MD breakpoint (yellow)</li>
                  <li className="hidden lg:block xl:hidden text-purple-600 font-bold">LG breakpoint (purple)</li>
                  <li className="hidden xl:block text-pink-600 font-bold">XL breakpoint (pink)</li>
                </ul>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gray-100 p-4 rounded-lg">Box 1</div>
                <div className="bg-gray-100 p-4 rounded-lg">Box 2</div>
                <div className="bg-gray-100 p-4 rounded-lg">Box 3</div>
              </div>
            </div>
          `
          }
        </div>
      )
    }
  `
    }

    return processedContent
  }, [content, extractedImports, screenWidth, BREAKPOINTS])

  console.log("Preview dimensions:", { screenWidth, scale })

  // Update the content container in the PreviewRenderer component to use @container
  return (
    <div className="preview-container w-full h-full">
      {renderError && (
        <div className="text-sm text-red-500 mb-2">
          There was an error rendering the component. Check the console for details.
        </div>
      )}

      <div
        className="responsive-preview-container border border-gray-200 rounded-md"
        style={{
          width: screenWidth || "375px", // Default to mobile width if not specified
          minWidth: "320px", // Ensure minimum width
          height: "100%",
          margin: "0 auto",
          overflow: "hidden",
          transition: "width 0.3s ease-in-out", // Smooth transition for width changes
          display: "flex",
          flexDirection: "column",
          backgroundColor: "white", // Ensure visible background
        }}
      >
        <div
          key={previewKey}
          className={`jsx-preview @container ${isRefreshing ? "jsx-preview-refreshing" : ""}`}
          style={{
            width: "100%",
            height: "100%",
            containerType: "inline-size",
            contain: "layout style",
          }}
        >
          <DynamicRenderer code={memoizedContent} onError={handleRenderError} />
        </div>
      </div>
    </div>
  )
}

export default React.memo(PreviewRenderer)

