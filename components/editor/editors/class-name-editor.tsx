"use client"

import type React from "react"
import { useState, useEffect } from "react"

import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { ParsedElement } from "@/types/editor"

interface ClassNameEditorProps {
  element: ParsedElement
  updateElement: (element: ParsedElement) => void
}

const ClassNameEditor: React.FC<ClassNameEditorProps> = ({ element, updateElement }) => {
  // Add debouncing for className changes
  const [localClassName, setLocalClassName] = useState<string>("")
  const [debouncedClassUpdate, setDebouncedClassUpdate] = useState<NodeJS.Timeout | null>(null)

  // Initialize local state when element changes
  useEffect(() => {
    setLocalClassName(element.className || "")
  }, [element.id, element.className])

  // Update the handleClassNameChange function to use debouncing
  const handleClassNameChange = (value: string) => {
    // Update local state immediately for responsive UI
    setLocalClassName(value)

    // Clear any existing timeout
    if (debouncedClassUpdate) {
      clearTimeout(debouncedClassUpdate)
    }

    // Set a new timeout to update the actual element after a delay
    const timeout = setTimeout(() => {
      updateElement({
        ...element,
        className: value,
      })
    }, 300) // 300ms debounce time

    setDebouncedClassUpdate(timeout)
  }

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (debouncedClassUpdate) {
        clearTimeout(debouncedClassUpdate)
      }
    }
  }, [debouncedClassUpdate])

  return (
    <div className="space-y-4 py-2">
      <Card className="border border-gray-100 shadow-sm">
        <CardContent className="p-4">
          <Alert variant="warning" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Editing className directly can lead to unexpected styling changes. Consider using the Layout & Styling and
              Colors tabs for common style changes.
            </AlertDescription>
          </Alert>

          <Label htmlFor="class-name" className="text-sm font-medium mb-2 block">
            Raw Tailwind Classes
          </Label>
          <textarea
            id="class-name"
            className="w-full p-3 border border-gray-300 rounded-md min-h-[120px] font-mono text-sm"
            value={localClassName}
            onChange={(e) => handleClassNameChange(e.target.value)}
            placeholder="Enter Tailwind classes separated by spaces (e.g., text-lg font-bold text-blue-500)"
          />
          <p className="text-xs text-gray-500 mt-2">
            Common Tailwind classes: flex, items-center, justify-between, p-4, m-2, text-lg, font-bold, text-blue-500,
            bg-gray-100, rounded-md, shadow-md
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default ClassNameEditor

