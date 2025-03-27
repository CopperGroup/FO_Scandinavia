"use client"

import type React from "react"

import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { ParsedElement } from "@/lib/types/types"

interface ClassNameEditorProps {
  element: ParsedElement
  updateElement: (element: ParsedElement) => void
}

const ClassNameEditor: React.FC<ClassNameEditorProps> = ({ element, updateElement }) => {
  const handleClassNameChange = (value: string) => {
    updateElement({ ...element, className: value })
  }

  return (
    <div className="space-y-4 py-2">
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>
          Editing className directly can lead to unexpected styling changes. Consider using the Text and Colors tabs for
          common style changes.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="p-4">
          <Label htmlFor="class-name" className="text-sm font-medium mb-2 block">
            Tailwind Classes
          </Label>
          <textarea
            id="class-name"
            className="w-full p-3 border border-gray-300 rounded-md min-h-[120px] font-mono text-sm"
            value={element.className || ""}
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

