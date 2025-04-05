"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, X } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import type { ParsedElement } from "@/types/editor"

// Tailwind utility categories
const tailwindCategories = {
  display: ["block", "inline", "inline-block", "flex", "inline-flex", "grid", "inline-grid", "hidden"],
  position: ["static", "fixed", "absolute", "relative", "sticky"],
  overflow: ["overflow-auto", "overflow-hidden", "overflow-visible", "overflow-scroll"],
  typography: [
    "text-left",
    "text-center",
    "text-right",
    "text-justify",
    "font-thin",
    "font-extralight",
    "font-light",
    "font-normal",
    "font-medium",
    "font-semibold",
    "font-bold",
    "font-extrabold",
    "font-black",
    "italic",
    "not-italic",
    "uppercase",
    "lowercase",
    "capitalize",
    "normal-case",
    "truncate",
    "text-ellipsis",
    "text-clip",
  ],
  effects: [
    "opacity-0",
    "opacity-25",
    "opacity-50",
    "opacity-75",
    "opacity-100",
    "blur-none",
    "blur-sm",
    "blur",
    "blur-md",
    "blur-lg",
    "blur-xl",
    "blur-2xl",
    "blur-3xl",
    "grayscale",
    "grayscale-0",
    "invert",
    "invert-0",
    "sepia",
    "sepia-0",
  ],
  transitions: [
    "transition",
    "transition-all",
    "transition-colors",
    "transition-opacity",
    "transition-shadow",
    "transition-transform",
    "duration-75",
    "duration-100",
    "duration-150",
    "duration-200",
    "duration-300",
    "duration-500",
    "duration-700",
    "duration-1000",
    "ease-linear",
    "ease-in",
    "ease-out",
    "ease-in-out",
  ],
  transforms: [
    "scale-0",
    "scale-50",
    "scale-75",
    "scale-90",
    "scale-95",
    "scale-100",
    "scale-105",
    "scale-110",
    "scale-125",
    "scale-150",
    "rotate-0",
    "rotate-45",
    "rotate-90",
    "rotate-180",
    "-rotate-45",
    "-rotate-90",
    "-rotate-180",
    "translate-x-0",
    "translate-x-1",
    "translate-x-2",
    "translate-x-4",
    "translate-x-8",
    "-translate-x-1",
    "-translate-x-2",
    "-translate-x-4",
    "-translate-x-8",
    "translate-y-0",
    "translate-y-1",
    "translate-y-2",
    "translate-y-4",
    "translate-y-8",
    "-translate-y-1",
    "-translate-y-2",
    "-translate-y-4",
    "-translate-y-8",
  ],
  interactivity: [
    "cursor-auto",
    "cursor-default",
    "cursor-pointer",
    "cursor-wait",
    "cursor-text",
    "cursor-move",
    "cursor-not-allowed",
    "pointer-events-none",
    "pointer-events-auto",
    "select-none",
    "select-text",
    "select-all",
    "select-auto",
  ],
}

interface TailwindClassesEditorProps {
  element: ParsedElement
  updateElement: (element: ParsedElement) => void
}

const TailwindClassesEditor: React.FC<TailwindClassesEditorProps> = ({ element, updateElement }) => {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("display")
  const [currentClasses, setCurrentClasses] = useState<string[]>([])

  // Initialize current classes from element
  useEffect(() => {
    if (element.className) {
      setCurrentClasses(element.className.split(" ").filter(Boolean))
    } else {
      setCurrentClasses([])
    }
  }, [element.className])

  // Filter utilities based on search term
  const filteredUtilities = searchTerm
    ? Object.values(tailwindCategories)
        .flat()
        .filter((utility) => utility.toLowerCase().includes(searchTerm.toLowerCase()))
    : tailwindCategories[activeCategory as keyof typeof tailwindCategories] || []

  // Toggle a class
  const toggleClass = (className: string) => {
    let updatedClasses: string[]

    if (currentClasses.includes(className)) {
      // Remove class
      updatedClasses = currentClasses.filter((c) => c !== className)
    } else {
      // Add class, but first remove any conflicting classes from the same group
      // For example, if adding "text-center", remove "text-left", "text-right", etc.
      const prefix = className.split("-")[0]
      const conflictingClasses = currentClasses.filter(
        (c) =>
          c.startsWith(`${prefix}-`) &&
          // Special handling for certain prefixes

          // For text alignment
          ((prefix === "text" && ["text-left", "text-center", "text-right", "text-justify"].includes(c)) ||
            // For font weight
            (prefix === "font" && c.startsWith("font-")) ||
            // For opacity
            (prefix === "opacity" && c.startsWith("opacity-")) ||
            // For blur
            (prefix === "blur" && (c === "blur" || c.startsWith("blur-"))) ||
            // For scale
            (prefix === "scale" && c.startsWith("scale-")) ||
            // For rotate
            (prefix === "rotate" && c.startsWith("rotate-")) ||
            // For cursor
            (prefix === "cursor" && c.startsWith("cursor-")) ||
            // For general cases
            c.startsWith(`${prefix}-`)),
      )

      updatedClasses = currentClasses.filter((c) => !conflictingClasses.includes(c))
      updatedClasses.push(className)
    }

    // Update element
    updateElement({
      ...element,
      className: updatedClasses.join(" "),
    })

    // Update local state
    setCurrentClasses(updatedClasses)
  }

  // Add custom class
  const addCustomClass = () => {
    if (!searchTerm.trim()) return

    const newClass = searchTerm.trim()
    if (!currentClasses.includes(newClass)) {
      const updatedClasses = [...currentClasses, newClass]

      updateElement({
        ...element,
        className: updatedClasses.join(" "),
      })

      setCurrentClasses(updatedClasses)
      setSearchTerm("")
    }
  }

  // Remove a class
  const removeClass = (className: string) => {
    const updatedClasses = currentClasses.filter((c) => c !== className)

    updateElement({
      ...element,
      className: updatedClasses.join(" "),
    })

    setCurrentClasses(updatedClasses)
  }

  return (
    <Card className="border border-gray-100 shadow-sm">
      <CardContent className="p-4 space-y-4">
        {/* Tailwind categories */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="grid grid-cols-4 h-8">
            <TabsTrigger value="display" className="text-xs h-7">
              Display
            </TabsTrigger>
            <TabsTrigger value="typography" className="text-xs h-7">
              Typography
            </TabsTrigger>
            <TabsTrigger value="effects" className="text-xs h-7">
              Effects
            </TabsTrigger>
            <TabsTrigger value="interactivity" className="text-xs h-7">
              Interactivity
            </TabsTrigger>
          </TabsList>

          {Object.keys(tailwindCategories).map((category) => (
            <TabsContent key={category} value={category} className="mt-2">
              <div className="flex flex-wrap gap-1 max-h-[150px] overflow-y-auto p-1">
                {(searchTerm ? filteredUtilities : tailwindCategories[category as keyof typeof tailwindCategories]).map(
                  (utility) => (
                    <Badge
                      key={utility}
                      variant={currentClasses.includes(utility) ? "default" : "outline"}
                      className={`text-xs cursor-pointer ${currentClasses.includes(utility) ? "bg-primary" : "hover:bg-gray-100"}`}
                      onClick={() => toggleClass(utility)}
                    >
                      {utility}
                    </Badge>
                  ),
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Search and add */}
        <div className="space-y-2 pt-2 border-t">
          <div className="text-xs font-medium text-gray-700">Add Custom Class</div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Enter custom class..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addCustomClass()
                  }
                }}
              />
            </div>
            <Button size="sm" onClick={addCustomClass} disabled={!searchTerm.trim()} className="h-8">
              Add
            </Button>
          </div>
        </div>

        {/* Current classes */}
        <div className="space-y-2 pt-2 border-t">
          <div className="text-xs font-medium text-gray-700">Applied Classes</div>
          <div className="flex flex-wrap gap-1 min-h-[40px] p-2 border rounded-md bg-gray-50">
            {currentClasses.length > 0 ? (
              currentClasses.map((className) => (
                <Badge key={className} variant="secondary" className="text-xs gap-1 h-6">
                  {className}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 rounded-full hover:bg-gray-200"
                    onClick={() => removeClass(className)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))
            ) : (
              <div className="text-xs text-gray-500 flex items-center justify-center w-full">No classes applied</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TailwindClassesEditor

