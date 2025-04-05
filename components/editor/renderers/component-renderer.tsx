"use client"

import React, { useMemo, memo, useCallback, useState, useEffect } from "react"
import * as LucideIcons from "lucide-react"
import { cn } from "@/lib/utils"
import type { ParsedElement } from "@/types/editor"
import * as Babel from "@babel/standalone"
import IconRenderer from "./icon-renderer"
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar } from "@/components/ui/calendar"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"

interface ComponentRendererProps {
  element: ParsedElement
  isEditMode: boolean
  children?: React.ReactNode
}

// Create a cache for transformed components to avoid redundant transformations
const componentCache = new Map<string, React.ComponentType<any>>()

const ComponentRenderer: React.FC<ComponentRendererProps> = ({ element, isEditMode, children }) => {
  const [error, setError] = useState<Error | null>(null)
  const [renderedComponent, setRenderedComponent] = useState<React.ReactNode | null>(null)

  // Create a unique cache key based on element properties
  const cacheKey = useMemo(() => {
    const { id, type, className, style, attributes, componentInfo, textContent } = element
    return JSON.stringify({ id, type, className, style, attributes, componentInfo, textContent })
  }, [element])

  // Handle icon components separately for better performance
  const renderIconComponent = useCallback(() => {
    if (
      element.componentInfo?.packageName === "lucide-react" ||
      element.componentInfo?.packageName?.includes("react-icons")
    ) {
      return <IconRenderer element={element} />
    }
    return null
  }, [element])

  // Transform and render the component
  const renderComponent = useCallback(() => {
    try {
      // For Lucide icons and React Icons, use the specialized renderer
      const iconComponent = renderIconComponent()
      if (iconComponent) return iconComponent

      // Handle shadcn/ui components directly without Babel transformation
      if (
        element.componentInfo?.packageName === "@/components/ui" ||
        element.componentInfo?.packageName?.startsWith("@/components/ui/")
      ) {
        // Get the actual component based on the import name
        let Component: React.ComponentType<any> | null = null

        // Map component names to actual components
        switch (element.componentInfo.importName) {
          case "Button":
            Component = Button
            break
          case "Card":
            Component = Card
            break
          case "CardContent":
            Component = CardContent
            break
          case "CardHeader":
            Component = CardHeader
            break
          case "CardFooter":
            Component = CardFooter
            break
          case "CardTitle":
            Component = CardTitle
            break
          case "CardDescription":
            Component = CardDescription
            break
          case "Input":
            Component = Input
            break
          case "Label":
            Component = Label
            break
          case "Badge":
            Component = Badge
            break
          case "Checkbox":
            Component = Checkbox
            break
          case "RadioGroup":
            Component = RadioGroup
            break
          case "RadioGroupItem":
            Component = RadioGroupItem
            break
          case "Select":
            Component = Select
            break
          case "SelectContent":
            Component = SelectContent
            break
          case "SelectItem":
            Component = SelectItem
            break
          case "SelectTrigger":
            Component = SelectTrigger
            break
          case "SelectValue":
            Component = SelectValue
            break
          case "Slider":
            Component = Slider
            break
          case "Switch":
            Component = Switch
            break
          case "Tabs":
            Component = Tabs
            break
          case "TabsContent":
            Component = TabsContent
            break
          case "TabsList":
            Component = TabsList
            break
          case "TabsTrigger":
            Component = TabsTrigger
            break
          case "Textarea":
            Component = Textarea
            break
          case "Toggle":
            Component = Toggle
            break
          case "Tooltip":
            Component = Tooltip
            break
          case "TooltipContent":
            Component = TooltipContent
            break
          case "TooltipProvider":
            Component = TooltipProvider
            break
          case "TooltipTrigger":
            Component = TooltipTrigger
            break
          case "Dialog":
            Component = Dialog
            break
          case "DialogContent":
            Component = DialogContent
            break
          case "DialogHeader":
            Component = DialogHeader
            break
          case "DialogTitle":
            Component = DialogTitle
            break
          case "DialogTrigger":
            Component = DialogTrigger
            break
          case "Popover":
            Component = Popover
            break
          case "PopoverContent":
            Component = PopoverContent
            break
          case "PopoverTrigger":
            Component = PopoverTrigger
            break
          case "Separator":
            Component = Separator
            break
          case "ScrollArea":
            Component = ScrollArea
            break
          case "Avatar":
            Component = Avatar
            break
          case "AvatarImage":
            Component = AvatarImage
            break
          case "AvatarFallback":
            Component = AvatarFallback
            break
          case "Calendar":
            Component = Calendar
            break
          case "Command":
            Component = Command
            break
          case "CommandEmpty":
            Component = CommandEmpty
            break
          case "CommandGroup":
            Component = CommandGroup
            break
          case "CommandInput":
            Component = CommandInput
            break
          case "CommandItem":
            Component = CommandItem
            break
          case "CommandList":
            Component = CommandList
            break
          case "DropdownMenu":
            Component = DropdownMenu
            break
          case "DropdownMenuContent":
            Component = DropdownMenuContent
            break
          case "DropdownMenuItem":
            Component = DropdownMenuItem
            break
          case "DropdownMenuTrigger":
            Component = DropdownMenuTrigger
            break
          case "Form":
            Component = Form
            break
          case "FormControl":
            Component = FormControl
            break
          case "FormDescription":
            Component = FormDescription
            break
          case "FormField":
            Component = FormField
            break
          case "FormItem":
            Component = FormItem
            break
          case "FormLabel":
            Component = FormLabel
            break
          case "FormMessage":
            Component = FormMessage
            break
          case "Sheet":
            Component = Sheet
            break
          case "SheetContent":
            Component = SheetContent
            break
          case "SheetDescription":
            Component = SheetDescription
            break
          case "SheetHeader":
            Component = SheetHeader
            break
          case "SheetTitle":
            Component = SheetTitle
            break
          case "SheetTrigger":
            Component = SheetTrigger
            break
          case "Skeleton":
            Component = Skeleton
            break
          case "Table":
            Component = Table
            break
          case "TableBody":
            Component = TableBody
            break
          case "TableCaption":
            Component = TableCaption
            break
          case "TableCell":
            Component = TableCell
            break
          case "TableHead":
            Component = TableHead
            break
          case "TableHeader":
            Component = TableHeader
            break
          case "TableRow":
            Component = TableRow
            break
          default:
            Component = null
        }

        if (Component) {
          // Create props object from element attributes
          const props: Record<string, any> = {
            ...element.attributes,
            className: element.className,
            style: element.style,
          }

          // Render the component directly with its props
          return React.createElement(Component, props, element.textContent || children)
        }
      }

      // Handle Next.js components directly
      if (element.componentInfo?.packageName === "next/image") {
        const hasFill = element.attributes?.fill === "true" || element.attributes?.fill === true

        // Create a copy of the style object
        const imageStyle = { ...element.style }

        // If fill is true, remove position-related styles that would conflict
        if (hasFill) {
          delete imageStyle.position
          delete imageStyle.top
          delete imageStyle.left
          delete imageStyle.right
          delete imageStyle.bottom
        }

        const props = {
          ...element.attributes,
          className: element.className,
          style: imageStyle,
          src: element.attributes?.src || "/placeholder.svg?height=100&width=100",
          alt: element.attributes?.alt || "Image",
        }

        // If fill is true, don't include width and height props
        if (!hasFill) {
          props.width = element.attributes?.width || 100
          props.height = element.attributes?.height || 100
        }

        return React.createElement(Image, props)
      }

      if (element.componentInfo?.packageName === "next/link") {
        const props = {
          ...element.attributes,
          className: element.className,
          style: element.style,
          href: element.attributes?.href || "#",
        }
        return React.createElement(Link, props, element.textContent || children)
      }

      // For Lucide icons
      if (element.componentInfo?.packageName === "lucide-react") {
        const IconComponent = LucideIcons[element.componentInfo.importName as keyof typeof LucideIcons]
        if (IconComponent) {
          const props = {
            ...element.attributes,
            className: element.className,
            style: element.style,
          }
          return React.createElement(IconComponent, props)
        }
      }

      // For framer-motion
      if (element.componentInfo?.packageName === "framer-motion") {
        if (element.componentInfo.importName === "motion") {
          const htmlTag = element.attributes?.as || "div"
          const props = {
            ...element.attributes,
            className: element.className,
            style: element.style,
          }
          // Remove the 'as' prop as it's not needed for createElement
          delete props.as

          return React.createElement(motion[htmlTag as keyof typeof motion], props, element.textContent || children)
        }
      }

      // Fallback to Babel transformation for custom components
      // Check if we have a cached version
      if (componentCache.has(cacheKey)) {
        const CachedComponent = componentCache.get(cacheKey)!
        const props = {
          ...element.attributes,
          className: element.className,
          style: element.style,
        }
        return React.createElement(CachedComponent, props, element.textContent || children)
      }

      // Create a JSX string for the component
      let jsxString = `<${element.componentInfo!.importName}`

      // Add className
      if (element.className) {
        jsxString += ` className="${element.className}"`
      }

      // Add style
      if (element.style && Object.keys(element.style).length > 0) {
        const styleStr = Object.entries(element.style)
          .map(([key, value]) => `${key}: '${value}'`)
          .join(", ")
        jsxString += ` style={{ ${styleStr} }}`
      }

      // Add attributes
      if (element.attributes) {
        Object.entries(element.attributes).forEach(([key, value]) => {
          // For numeric attributes, don't use quotes
          const numericAttributes = ["width", "height", "size", "strokeWidth"]
          if (numericAttributes.includes(key)) {
            jsxString += ` ${key}={${value}}`
          } else {
            jsxString += ` ${key}="${value}"`
          }
        })
      }

      // Close the tag
      if (element.textContent) {
        jsxString += `>${element.textContent}</${element.componentInfo!.importName}>`
      } else if (children) {
        jsxString += ">{children}</" + element.componentInfo!.importName + ">"
      } else {
        jsxString += " />"
      }

      // Create a complete React component with imports
      const fullJsx = `
        import React from 'react';
        import * as LucideIcons from 'lucide-react';
        import { Button, Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription, Input, Label, Badge, Checkbox, RadioGroup, RadioGroupItem, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Slider, Switch, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, Toggle, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui';
        import { FaGithub, FaTwitter, FaFacebook, FaLinkedin, FaInstagram, FaHome, FaUser, FaCog, FaBell, FaEnvelope } from 'react-icons/fa';
        import { MdHome, MdSettings, MdPerson, MdEmail, MdNotifications, MdMenu, MdSearch, MdAdd, MdDelete, MdEdit } from 'react-icons/md';
        import Image from 'next/image';
        import Link from 'next/link';
        import { motion } from 'framer-motion';
        import { cn } from '@/lib/utils';
        
        export default function Component({children}) {
          return ${jsxString};
        }
      `

      // Use Babel to transform the JSX with optimized settings
      const transformedCode = Babel.transform(fullJsx, {
        presets: ["react", "env"],
        compact: true,
        sourceMaps: false,
        ast: false,
      }).code

      if (!transformedCode) {
        throw new Error("Failed to transform component code")
      }

      // Create a module-like context with all dependencies
      const moduleContext: Record<string, any> = {
        React,
        ...LucideIcons,
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
        Dialog,
        DialogContent,
        DialogHeader,
        DialogTitle,
        DialogTrigger,
        Popover,
        PopoverContent,
        PopoverTrigger,
        Separator,
        ScrollArea,
        Avatar,
        AvatarImage,
        AvatarFallback,
        Calendar,
        Command,
        CommandEmpty,
        CommandGroup,
        CommandInput,
        CommandItem,
        CommandList,
        DropdownMenu,
        DropdownMenuContent,
        DropdownMenuItem,
        DropdownMenuTrigger,
        Form,
        FormControl,
        FormDescription,
        FormField,
        FormItem,
        FormLabel,
        FormMessage,
        Sheet,
        SheetContent,
        SheetDescription,
        SheetHeader,
        SheetTitle,
        SheetTrigger,
        Skeleton,
        Table,
        TableBody,
        TableCaption,
        TableCell,
        TableHead,
        TableHeader,
        TableRow,
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
        Image,
        Link,
        motion,
        cn,
        children,
        module: { exports: {} },
        exports: {},
        require: (name: string) => {
          if (name === "react") return React
          if (name === "lucide-react") return LucideIcons
          if (name === "@/components/ui/button") return { Button }
          if (name === "@/components/ui/card")
            return { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription }
          if (name === "@/components/ui/input") return { Input }
          if (name === "@/components/ui/label") return { Label }
          if (name === "@/components/ui/badge") return { Badge }
          if (name === "@/components/ui/checkbox") return { Checkbox }
          if (name === "@/components/ui/radio-group") return { RadioGroup, RadioGroupItem }
          if (name === "@/components/ui/select")
            return { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
          if (name === "@/components/ui/slider") return { Slider }
          if (name === "@/components/ui/switch") return { Switch }
          if (name === "@/components/ui/tabs") return { Tabs, TabsContent, TabsList, TabsTrigger }
          if (name === "@/components/ui/textarea") return { Textarea }
          if (name === "@/components/ui/toggle") return { Toggle }
          if (name === "@/components/ui/tooltip") return { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
          if (name === "@/components/ui")
            return {
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
              Dialog,
              DialogContent,
              DialogHeader,
              DialogTitle,
              DialogTrigger,
              Popover,
              PopoverContent,
              PopoverTrigger,
              Separator,
              ScrollArea,
              Avatar,
              AvatarImage,
              AvatarFallback,
              Calendar,
              Command,
              CommandEmpty,
              CommandGroup,
              CommandInput,
              CommandItem,
              CommandList,
              DropdownMenu,
              DropdownMenuContent,
              DropdownMenuItem,
              DropdownMenuTrigger,
              Form,
              FormControl,
              FormDescription,
              FormField,
              FormItem,
              FormLabel,
              FormMessage,
              Sheet,
              SheetContent,
              SheetDescription,
              SheetHeader,
              SheetTitle,
              SheetTrigger,
              Skeleton,
              Table,
              TableBody,
              TableCaption,
              TableCell,
              TableHead,
              TableHeader,
              TableRow,
            }
          if (name === "framer-motion") return { motion }
          if (name === "@/lib/utils") return { cn }

          // Fix Next.js imports - return the actual component, not an object
          if (name === "next/image") return Image
          if (name === "next/link") return Link

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
          return {}
        },
      }

      // Execute the code in the context using a more efficient approach
      const executeCode = new Function(
        ...Object.keys(moduleContext),
        `
      "use strict";
      ${transformedCode};
      return module.exports.default || exports.default;
    `,
      )

      const ExportedComponent = executeCode(...Object.values(moduleContext))

      // Cache the component for future use
      componentCache.set(cacheKey, ExportedComponent)

      // Return the component with props directly applied
      const props = {
        ...element.attributes,
        className: element.className,
        style: element.style,
      }

      return React.createElement(ExportedComponent, props, element.textContent || children)
    } catch (error) {
      console.error("Error in component rendering:", error)
      setError(error instanceof Error ? error : new Error(String(error)))
      return null
    }
  }, [element, children, cacheKey, renderIconComponent])

  // Use useEffect to handle async rendering and avoid blocking the main thread
  useEffect(() => {
    // Reset error state
    setError(null)

    // Use requestIdleCallback or setTimeout to defer non-critical work
    const renderAsync = () => {
      try {
        const result = renderComponent()
        setRenderedComponent(result)
      } catch (err) {
        console.error("Async rendering error:", err)
        setError(err instanceof Error ? err : new Error(String(err)))
      }
    }

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      ;(window as any).requestIdleCallback(renderAsync)
    } else {
      setTimeout(renderAsync, 0)
    }
  }, [renderComponent])

  // If there's an error, show an error message
  if (error) {
    return (
      <div
        className={cn("relative p-2 border border-red-300 bg-red-50 text-red-800 rounded", element.className)}
        style={{ ...element.style, position: "relative" }}
      >
        <p className="text-sm font-medium">Error rendering {element.componentInfo?.importName || element.type}</p>
        <p className="text-xs">{error.message}</p>
        {children}
      </div>
    )
  }

  // Show a loading state if the component is still rendering
  if (!renderedComponent) {
    return (
      <div
        className={cn(
          "relative p-2 border border-gray-200 bg-gray-50 rounded flex items-center justify-center",
          element.className,
        )}
        style={element.style}
      >
        <div className="animate-pulse h-4 w-4 bg-gray-300 rounded-full"></div>
      </div>
    )
  }

  // Return the rendered component directly without any wrapper
  return renderedComponent
}

export default memo(ComponentRenderer)

