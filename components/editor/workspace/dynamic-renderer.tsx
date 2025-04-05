"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import * as LucideIcons from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  FaGithub,
  FaTwitter,
  FaFacebook,
  FaLinkedin,
  FaInstagram,
  FaHome,
  FaUser,
  FaCog,
  FaBell,
  FaEnvelope,
} from "react-icons/fa"
import {
  MdHome,
  MdSettings,
  MdPerson,
  MdEmail,
  MdNotifications,
  MdMenu,
  MdSearch,
  MdAdd,
  MdDelete,
  MdEdit,
} from "react-icons/md"
import * as Babel from "@babel/standalone"
import Image from "next/image"
import Link from "next/link"
import DynamicIcon from "@/components/ui/dynamic-icon"

// Define breakpoints globally to ensure they're accessible in all contexts
if (typeof window !== "undefined") {
  window.BREAKPOINTS = ["sm", "md", "lg", "xl", "2xl"]
}

// Function to process container queries
const processContainerQueries = (element) => {
  // Use the globally defined BREAKPOINTS or fallback to default
  const breakpoints =
    typeof window !== "undefined" && window.BREAKPOINTS ? window.BREAKPOINTS : ["sm", "md", "lg", "xl", "2xl"]

  if (!element || typeof element !== "object") return element

  // Process the element (implementation depends on your needs)
  return element
}

// Add the transformTailwindClasses function
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

// Function to recursively modify the React component tree
const transformReactElement = (element) => {
  if (!React.isValidElement(element)) return element

  // Extract props
  const { className, children, ...restProps } = element.props

  // Transform className
  const newClassName = className ? transformTailwindClasses(className) : undefined

  return React.cloneElement(
    element,
    { ...restProps, className: newClassName },
    children ? React.Children.map(children, (child) => transformReactElement(child)) : children,
  )
}

// Create a cache for transformed code
const codeCache = new Map<string, string>()

// Function to extract import statements
const extractImports = (code: string) => {
  const importRegex = /import\s+[\s\S]+?from\s+["'](.+?)["'];?/g
  const imports: string[] = []
  let match

  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[1])
  }

  return imports
}

// Update the SafeComponent to properly support container queries with @container syntax
const SafeComponent = React.memo(({ renderContent }: { renderContent: () => React.ReactNode }) => {
  try {
    const content = renderContent()
    return content ? (
      <div
        className="dynamic-content-wrapper overflow-y-auto max-h-full h-full @container"
        style={{
          containerType: "inline-size",
          contain: "layout style",
        }}
      >
        {content}
      </div>
    ) : null
  } catch (error) {
    console.error("Error rendering dynamic content:", error)
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
        <h3 className="font-medium mb-2">Render Error:</h3>
        <pre className="text-sm overflow-auto p-2 bg-white rounded">
          {error instanceof Error ? error.message : String(error)}
        </pre>
      </div>
    )
  }
})
SafeComponent.displayName = "SafeComponent"

// Update the DynamicRenderer to better handle component exports and use memoization
export default function DynamicRenderer({ code, onError }: { code: string; onError?: (error: Error) => void }) {
  const [renderFunction, setRenderFunction] = useState<(() => React.ReactNode) | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const workerRef = useRef<Worker | null>(null)

  // Memoize the code to prevent unnecessary transformations
  const memoizedCode = useMemo(() => code, [code])

  // Create a memoized transform function to avoid recreating it on every render
  const transformCode = useCallback((code: string) => {
    // Check if we have this code in cache
    if (codeCache.has(code)) {
      return codeCache.get(code)
    }

    try {
      // Add the BREAKPOINTS definition to the code before transforming
      const codeWithBreakpoints = `
        // Define BREAKPOINTS for container queries
        const BREAKPOINTS = ["sm", "md", "lg", "xl", "2xl"];
        
        // Add processContainerQueries function
        function processContainerQueries(element) {
          if (!element || typeof element !== 'object') return element;
          return element;
        }
        
        ${code}
      `

      const result = Babel.transform(codeWithBreakpoints, {
        presets: ["react", "env"],
        compact: true,
        sourceMaps: false,
        ast: false,
      }).code

      // Cache the result
      if (result) {
        codeCache.set(code, result)
      }

      return result
    } catch (error) {
      throw error
    }
  }, [])

  // Create a memoized module context to avoid recreating it on every render
  const moduleContext = useMemo(
    () => ({
      React,
      // Add all Lucide icons directly to the context
      ...LucideIcons,
      // Add DynamicIcon component
      DynamicIcon,
      // Add React Icons
      FaGithub,
      FaTwitter,
      FaFacebook,
      FaLinkedin,
      FaInstagram,
      FaHome,
      FaUser,
      FaCog,
      FaBell,
      FaEnvelope,
      MdHome,
      MdSettings,
      MdPerson,
      MdEmail,
      MdNotifications,
      MdMenu,
      MdSearch,
      MdAdd,
      MdDelete,
      MdEdit,
      // Add UI components
      Button,
      Card,
      CardContent,
      CardHeader,
      CardFooter,
      CardTitle,
      CardDescription,
      Input,
      Label,
      Badge,
      Checkbox,
      RadioGroup,
      RadioGroupItem,
      Select,
      SelectContent,
      SelectItem,
      SelectTrigger,
      SelectValue,
      Slider,
      Switch,
      Tabs,
      TabsContent,
      TabsList,
      TabsTrigger,
      Textarea,
      Toggle,
      Tooltip,
      TooltipContent,
      TooltipProvider,
      TooltipTrigger,
      // Add motion
      motion,
      // Add utilities
      cn,
      // Add Next.js components directly to the context
      Image,
      Link,
      // Add container query utilities
      processContainerQueries,
      BREAKPOINTS: ["sm", "md", "lg", "xl", "2xl"],
      // Module exports
      module: { exports: {} },
      exports: {},
      require: (name: string) => {
        // Simple module resolution
        if (name === "react") return React
        if (name === "lucide-react") return LucideIcons
        if (name === "framer-motion") return { motion }
        if (name === "@/lib/utils") return { cn }
        if (name === "next/image") return Image
        if (name === "next/link") return Link
        if (name === "@/components/ui/dynamic-icon") return DynamicIcon

        // Handle react-icons
        if (name === "react-icons/fa")
          return {
            FaGithub,
            FaTwitter,
            FaFacebook,
            FaLinkedin,
            FaInstagram,
            FaHome,
            FaUser,
            FaCog,
            FaBell,
            FaEnvelope,
          }
        if (name === "react-icons/md")
          return {
            MdHome,
            MdSettings,
            MdPerson,
            MdEmail,
            MdNotifications,
            MdMenu,
            MdSearch,
            MdAdd,
            MdDelete,
            MdEdit,
          }

        // Handle shadcn/ui components
        if (name.startsWith("@/components/ui/")) {
          const componentName = name.split("/").pop()
          switch (componentName) {
            case "button":
              return { Button }
            case "card":
              return { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription }
            case "input":
              return { Input }
            case "label":
              return { Label }
            case "badge":
              return { Badge }
            case "checkbox":
              return { Checkbox }
            case "radio-group":
              return { RadioGroup, RadioGroupItem }
            case "select":
              return { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
            case "slider":
              return { Slider }
            case "switch":
              return { Switch }
            case "tabs":
              return { Tabs, TabsContent, TabsList, TabsTrigger }
            case "textarea":
              return { Textarea }
            case "toggle":
              return { Toggle }
            case "tooltip":
              return { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
            default:
              return {}
          }
        }

        // For any specific Lucide icon
        if (name in LucideIcons) {
          return LucideIcons[name as keyof typeof LucideIcons]
        }

        return {}
      },
    }),
    [],
  )

  useEffect(() => {
    try {
      // Extract imports from the code
      const imports = extractImports(memoizedCode)

      // Transform the code
      const transformedCode = transformCode(memoizedCode)

      if (!transformedCode) {
        throw new Error("Failed to transform code")
      }

      // Use requestIdleCallback for heavy computation
      const executeCodeAsync = () => {
        try {
          // Execute the code in the context
          const executeCode = new Function(
            ...Object.keys(moduleContext),
            `
            "use strict";
            ${transformedCode};
            return module.exports.default || exports.default;
          `,
          )

          const exportedComponent = executeCode(...Object.values(moduleContext))

          // Create a render function based on what was exported
          let renderFn: () => React.ReactNode

          if (typeof exportedComponent === "function") {
            // If it's a function component, call it
            renderFn = () => React.createElement(exportedComponent)
          } else if (React.isValidElement(exportedComponent)) {
            // If it's a React element, return it directly
            renderFn = () => exportedComponent
          } else if (exportedComponent) {
            // If it's something else but not null/undefined, wrap it in a div
            renderFn = () => <div>{String(exportedComponent)}</div>
          } else {
            // If nothing was exported, try to render the code directly as JSX
            try {
              // Create a simple wrapper component
              const directJsx = `
                import React from 'react';
                export default function DirectRender() {
                  return (
                    <div className="jsx-preview-container">
                      ${memoizedCode}
                    </div>
                  );
                }
              `

              // Transform and execute
              const directTransformed = transformCode(directJsx)

              if (directTransformed) {
                const directExecute = new Function(
                  ...Object.keys(moduleContext),
                  `
                  "use strict";
                  ${directTransformed};
                  return module.exports.default || exports.default;
                `,
                )

                const DirectComponent = directExecute(...Object.values(moduleContext))
                renderFn = () => React.createElement(DirectComponent)
              } else {
                throw new Error("Failed to transform direct JSX")
              }
            } catch (directError) {
              console.error("Error rendering direct JSX:", directError)
              renderFn = () => (
                <div className="p-4 text-red-500">
                  <p>No component was exported from the code and direct rendering failed</p>
                  <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-auto">{memoizedCode}</pre>
                </div>
              )
            }
          }

          setRenderFunction(() => renderFn)
          setError(null)
        } catch (err) {
          console.error("Error executing code:", err)
          const error = err instanceof Error ? err : new Error(String(err))
          setError(error)
          if (onError) {
            onError(error)
          }
        }
      }

      // Use requestIdleCallback if available, otherwise use setTimeout
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        ;(window as any).requestIdleCallback(executeCodeAsync)
      } else {
        setTimeout(executeCodeAsync, 0)
      }
    } catch (err) {
      console.error("Error processing code:", err)
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      if (onError) {
        onError(error)
      }
    }

    // Clean up any web workers
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [memoizedCode, onError, transformCode, moduleContext])

  // Memoize the error display to prevent unnecessary re-renders
  const errorDisplay = useMemo(() => {
    if (!error) return null
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
        <h3 className="font-medium mb-2">Error processing code:</h3>
        <pre className="text-sm overflow-auto p-2 bg-white rounded">{error.message}</pre>
      </div>
    )
  }, [error])

  if (error) {
    return errorDisplay
  }

  if (!renderFunction) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="animate-pulse flex space-x-2">
          <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
          <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
          <div className="h-2 w-2 bg-gray-300 rounded-full"></div>
        </div>
      </div>
    )
  }

  const Component = renderFunction

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error("Captured error in ErrorBoundary:", error, errorInfo)
  }

  const ErrorBoundary = ({
    children,
    onError,
  }: { children: React.ReactNode; onError: (error: Error, errorInfo: React.ErrorInfo) => void }) => {
    const [hasError, setHasError] = useState(false)

    useEffect(() => {
      const errorHandler = (error: Error, errorInfo: React.ErrorInfo) => {
        setHasError(true)
        onError(error, errorInfo)
      }

      const originalConsoleError = console.error
      console.error = (...args: any[]) => {
        originalConsoleError(...args)
        errorHandler(new Error(args.join(" ")), { componentStack: "unknown" })
      }

      return () => {
        console.error = originalConsoleError
      }
    }, [onError])

    if (hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          <h3 className="font-medium mb-2">Render Error:</h3>
          <p>An error occurred while rendering this component.</p>
        </div>
      )
    }

    return children
  }

  // Update the return statement to ensure container query styles are applied
  return (
    <ErrorBoundary onError={handleError}>
      <div
        className="w-full h-full overflow-y-auto @container"
        style={{
          containerType: "inline-size",
          contain: "layout style",
        }}
        data-responsive-container
      >
        {Component ? <Component /> : null}
      </div>
    </ErrorBoundary>
  )
}

