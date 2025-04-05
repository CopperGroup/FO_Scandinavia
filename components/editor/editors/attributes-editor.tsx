"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Info, AlertCircle, ChevronDown } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { ParsedElement } from "@/types/editor"

interface AttributesEditorProps {
  element: ParsedElement
  updateElement: (element: ParsedElement) => void
}

// Define attribute type structure
interface AttributeDefinition {
  type: string
  optional?: boolean
  description?: string
  options?: string[]
}

// Function to list required & possible props
const getPropsFromType = <T extends Record<string, AttributeDefinition>>(props: T) => {
  const allProps = Object.keys(props)
  const requiredProps = allProps.filter((key) => !props[key]?.optional)

  return { requiredProps, allProps, definitions: props }
}

// Common attributes by element type
const attributesByElementType: Record<string, Record<string, AttributeDefinition>> = {
  // Common attributes for all elements
  common: {
    id: { type: "string", optional: true, description: "Unique identifier for the element" },
    title: { type: "string", optional: true, description: "Advisory information for the element" },
    tabindex: { type: "number", optional: true, description: "Tab order of the element" },
    "data-testid": { type: "string", optional: true, description: "Test identifier for testing" },
    "aria-label": { type: "string", optional: true, description: "Accessible label" },
    "aria-hidden": {
      type: "boolean",
      optional: true,
      description: "Hide from screen readers",
      options: ["true", "false"],
    },
  },

  // Image specific attributes
  img: {
    src: { type: "string", description: "Image source URL" },
    alt: { type: "string", description: "Alternative text description" },
    width: { type: "number", optional: true, description: "Width of the image" },
    height: { type: "number", optional: true, description: "Height of the image" },
    loading: { type: "select", optional: true, description: "Image loading behavior", options: ["eager", "lazy"] },
  },

  // Next.js Image component
  Image: {
    src: { type: "string", description: "Image source URL" },
    alt: { type: "string", description: "Alternative text description" },
    width: { type: "number", description: "Width of the image in pixels" },
    height: { type: "number", description: "Height of the image in pixels" },
    priority: { type: "boolean", optional: true, description: "Preload the image", options: ["true", "false"] },
    quality: { type: "number", optional: true, description: "Image quality (1-100)" },
    placeholder: { type: "select", optional: true, description: "Placeholder type", options: ["blur", "empty"] },
    blurDataURL: { type: "string", optional: true, description: "Base64 encoded blurred image" },
    sizes: { type: "string", optional: true, description: "Responsive image sizes" },
    fill: { type: "boolean", optional: true, description: "Fill parent container", options: ["true", "false"] },
    loading: { type: "select", optional: true, description: "Loading behavior", options: ["lazy", "eager"] },
  },

  // Link specific attributes
  a: {
    href: { type: "string", description: "URL of the link" },
    target: {
      type: "select",
      optional: true,
      description: "Where to open the link",
      options: ["_self", "_blank", "_parent", "_top"],
    },
    rel: { type: "string", optional: true, description: "Relationship of the target" },
    download: { type: "string", optional: true, description: "Download the target" },
  },

  // Next.js Link component
  Link: {
    href: { type: "string", description: "URL of the link" },
    prefetch: { type: "boolean", optional: true, description: "Prefetch the linked page", options: ["true", "false"] },
    replace: {
      type: "boolean",
      optional: true,
      description: "Replace current history state",
      options: ["true", "false"],
    },
    scroll: { type: "boolean", optional: true, description: "Scroll to top on navigation", options: ["true", "false"] },
    shallow: {
      type: "boolean",
      optional: true,
      description: "Update path without rerunning data fetching",
      options: ["true", "false"],
    },
    locale: { type: "string", optional: true, description: "Locale for internationalized routing" },
  },

  // Button specific attributes
  button: {
    type: { type: "select", description: "Button type", options: ["button", "submit", "reset"] },
    disabled: { type: "boolean", optional: true, description: "Disable the button", options: ["true", "false"] },
    form: { type: "string", optional: true, description: "Form ID the button belongs to" },
    name: { type: "string", optional: true, description: "Name of the button" },
    value: { type: "string", optional: true, description: "Value of the button" },
  },

  // Input specific attributes
  input: {
    type: {
      type: "select",
      description: "Input type",
      options: [
        "text",
        "password",
        "email",
        "number",
        "checkbox",
        "radio",
        "date",
        "file",
        "hidden",
        "search",
        "tel",
        "url",
      ],
    },
    name: { type: "string", description: "Name of the input" },
    value: { type: "string", optional: true, description: "Value of the input" },
    placeholder: { type: "string", optional: true, description: "Placeholder text" },
    required: { type: "boolean", optional: true, description: "Required field", options: ["true", "false"] },
    disabled: { type: "boolean", optional: true, description: "Disable the input", options: ["true", "false"] },
  },

  // Component specific attributes (for shadcn/ui components)
  Button: {
    variant: {
      type: "select",
      description: "Button variant",
      options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
    },
    size: {
      type: "select",
      optional: true,
      description: "Button size",
      options: ["default", "sm", "lg", "icon"],
    },
    asChild: {
      type: "boolean",
      optional: true,
      description: "Render as child",
      options: ["true", "false"],
    },
  },

  Card: {
    className: { type: "string", optional: true, description: "Additional CSS classes" },
  },

  Input: {
    type: {
      type: "select",
      description: "Input type",
      options: ["text", "password", "email", "number", "search", "tel", "url"],
    },
    placeholder: { type: "string", optional: true, description: "Placeholder text" },
    disabled: { type: "boolean", optional: true, description: "Disable the input", options: ["true", "false"] },
  },

  Badge: {
    variant: {
      type: "select",
      description: "Badge variant",
      options: ["default", "secondary", "destructive", "outline"],
    },
  },

  Switch: {
    checked: { type: "boolean", description: "Checked state", options: ["true", "false"] },
    disabled: { type: "boolean", optional: true, description: "Disable the switch", options: ["true", "false"] },
  },
}

// Get all attributes for an element type
const getAttributesForElement = (elementType: string) => {
  // Get common attributes
  const commonAttrs = attributesByElementType.common || {}

  // Get element-specific attributes
  const specificAttrs = attributesByElementType[elementType] || {}

  // For shadcn components, check if we have specific attributes
  const isComponent = elementType.charAt(0) === elementType.charAt(0).toUpperCase()
  const componentAttrs = isComponent ? attributesByElementType[elementType] || {} : {}

  // Combine all attributes
  const combinedAttrs = { ...commonAttrs, ...specificAttrs, ...componentAttrs }

  // Get required and all props
  return getPropsFromType(combinedAttrs)
}

const AttributesEditor: React.FC<AttributesEditorProps> = ({ element, updateElement }) => {
  const [newAttributeValue, setNewAttributeValue] = useState<string>("")
  const [openAttributeSelector, setOpenAttributeSelector] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // Get attributes for this element type
  const { requiredProps, allProps, definitions } = useMemo(() => getAttributesForElement(element.type), [element.type])

  // Current attributes
  const existingAttributeNames = Object.keys(element.attributes || {})

  // Filter available attributes based on search term
  const availableOptionalAttributes = useMemo(() => {
    return allProps
      .filter((name) => !requiredProps.includes(name)) // Only optional attributes
      .filter((name) => !existingAttributeNames.includes(name)) // Not already added
      .filter((name) => name.toLowerCase().includes(searchTerm.toLowerCase())) // Match search
      .sort() // Alphabetical order
  }, [allProps, requiredProps, existingAttributeNames, searchTerm])

  const handleAttributeChange = (name: string, value: string) => {
    const updatedAttributes = { ...(element.attributes || {}) }
    updatedAttributes[name] = value

    updateElement({
      ...element,
      attributes: updatedAttributes,
    })
  }

  const handleRemoveAttribute = (name: string) => {
    const updatedAttributes = { ...(element.attributes || {}) }
    delete updatedAttributes[name]

    updateElement({
      ...element,
      attributes: updatedAttributes,
    })
  }

  const handleAddAttribute = (name: string) => {
    if (!name) return

    // Get default value based on attribute type
    let defaultValue = ""
    const attrDef = definitions[name]

    if (attrDef) {
      if (attrDef.type === "boolean" || (attrDef.options && attrDef.options.length > 0)) {
        defaultValue = attrDef.options?.[0] || "true"
      }
    }

    const updatedAttributes = { ...(element.attributes || {}) }
    updatedAttributes[name] = defaultValue

    updateElement({
      ...element,
      attributes: updatedAttributes,
    })

    setNewAttributeValue("")
    setSearchTerm("")
  }

  // Render input based on attribute type
  const renderAttributeInput = (name: string, value: string) => {
    // Find attribute definition
    const attributeDef = definitions[name]

    if (!attributeDef) {
      // Default to text input if no definition found
      return (
        <Input
          value={value}
          onChange={(e) => handleAttributeChange(name, e.target.value)}
          className="flex-1 h-8 text-sm"
        />
      )
    }

    // Render based on type
    switch (attributeDef.type) {
      case "boolean":
        return (
          <Select value={value} onValueChange={(val) => handleAttributeChange(name, val)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
            </SelectContent>
          </Select>
        )

      case "select":
        return (
          <Select value={value} onValueChange={(val) => handleAttributeChange(name, val)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              {attributeDef.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case "number":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleAttributeChange(name, e.target.value)}
            className="flex-1 h-8 text-sm"
          />
        )

      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleAttributeChange(name, e.target.value)}
            className="flex-1 h-8 text-sm"
          />
        )
    }
  }

  return (
    <div className="space-y-4">
      {/* Element type indicator */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">{element.type} Attributes</h3>
        <Badge variant="outline" className="text-xs">
          {Object.keys(element.attributes || {}).length} attributes
        </Badge>
      </div>

      {/* Required attributes section */}
      {requiredProps.length > 0 && (
        <div className="space-y-3 bg-gray-50 p-3 rounded-md border">
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium text-gray-700">Required Attributes</Label>
            <Badge variant="destructive" className="text-xs">
              Required
            </Badge>
          </div>

          {requiredProps.map((propName) => {
            const value = (element.attributes && element.attributes[propName]) || ""
            const isMissing = !value && !existingAttributeNames.includes(propName)

            return (
              <div key={propName} className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={`w-1/3 flex items-center gap-1 ${isMissing ? "text-red-500" : ""}`}>
                        <span className="text-xs font-medium truncate">{propName}</span>
                        {isMissing && <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p className="text-xs">{definitions[propName]?.description || propName}</p>
                      {isMissing && <p className="text-xs text-red-500">This attribute is required!</p>}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="flex-1">{renderAttributeInput(propName, value as string)}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Optional attributes section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-gray-700">Optional Attributes</Label>

          {/* Add attribute dropdown */}
          <Popover open={openAttributeSelector} onOpenChange={setOpenAttributeSelector}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                Add Attribute
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <Command>
                <CommandInput
                  placeholder="Search attributes..."
                  className="h-9"
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                />
                <CommandList className="max-h-[300px]">
                  <CommandEmpty>No attributes found.</CommandEmpty>
                  <CommandGroup>
                    {availableOptionalAttributes.map((name) => (
                      <CommandItem
                        key={name}
                        value={name}
                        onSelect={() => {
                          handleAddAttribute(name)
                          setOpenAttributeSelector(false)
                        }}
                      >
                        <span>{name}</span>
                        <span className="ml-2 text-xs text-gray-400">{definitions[name]?.type}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Current optional attributes */}
        {Object.entries(element.attributes || {}).filter(([name]) => !requiredProps.includes(name)).length > 0 ? (
          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
            {Object.entries(element.attributes || {})
              .filter(([name]) => !requiredProps.includes(name))
              .map(([name, value]) => (
                <div key={name} className="flex items-center gap-2 bg-white p-2 rounded-md border">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-1/3 flex items-center gap-1">
                          <span className="text-xs font-medium truncate">{name}</span>
                          <Info className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p className="text-xs">{definitions[name]?.description || "Custom attribute"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <div className="flex-1">{renderAttributeInput(name, value as string)}</div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveAttribute(name)}
                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-xs text-gray-500 p-3 border rounded-md bg-gray-50 text-center">
            No optional attributes set. Click &quot;Add Attribute&quot; to add one.
          </div>
        )}
      </div>

      {/* Custom attribute input */}
      <div className="space-y-2 pt-2">
        <Label className="text-xs font-medium text-gray-700">Add Custom Attribute</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Custom attribute name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 text-sm"
          />
          <Input
            placeholder="Value"
            value={newAttributeValue}
            onChange={(e) => setNewAttributeValue(e.target.value)}
            className="h-8 text-sm"
          />
          <Button
            size="sm"
            onClick={() => {
              if (searchTerm.trim()) {
                const updatedAttributes = { ...(element.attributes || {}) }
                updatedAttributes[searchTerm] = newAttributeValue

                updateElement({
                  ...element,
                  attributes: updatedAttributes,
                })

                setSearchTerm("")
                setNewAttributeValue("")
              }
            }}
            disabled={!searchTerm.trim()}
            className="h-8"
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AttributesEditor

