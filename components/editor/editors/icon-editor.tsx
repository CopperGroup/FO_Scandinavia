"use client"

import React from "react"
import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import * as LucideIcons from "lucide-react"
import type { ParsedElement } from "@/types/editor"
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

// Create a map of React Icons
const ReactIconsMap: Record<string, React.ComponentType<any>> = {
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
}

interface IconEditorProps {
  element: ParsedElement
  updateElement: (element: ParsedElement) => void
}

// Remove the default icon type and focus only on import-based approach
const IconEditor: React.FC<IconEditorProps> = ({ element, updateElement }) => {
  const [selectedIcon, setSelectedIcon] = useState<string>("")
  const [selectedLibrary, setSelectedLibrary] = useState<"lucide" | "react-icons">("lucide")

  // Get all Lucide icons
  const lucideIcons = Object.keys(LucideIcons)
    .filter((key) => key !== "default" && typeof LucideIcons[key as keyof typeof LucideIcons] === "function")
    .sort()

  // Get all React icons
  const reactIcons = Object.keys(ReactIconsMap)

  // Apply the selected icon
  const applyIcon = (iconName: string, library: string) => {
    if (!element) return

    // Create a new element with the icon properties
    const newElement = { ...element }

    if (library === "lucide") {
      // For Lucide icons, set the component info directly
      newElement.componentInfo = {
        isComponent: true,
        packageName: "lucide-react",
        importName: iconName,
        importType: "named",
      }

      // Update the type to match the icon name
      newElement.type = iconName

      // Ensure the icon is rendered correctly
      if (library === "lucide") {
        const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons]
        if (IconComponent) {
          // The icon exists, we're good to go
          console.log(`Applied Lucide icon: ${iconName}`)
        }
      }

      // Remove any text content as icons don't have text
      delete newElement.textContent

      // Add a default className if none exists
      newElement.className = newElement.className || "h-6 w-6 text-blue-500"

      // Ensure no attributes are added by default
      newElement.attributes = {}
    } else if (library === "react-icons") {
      // For React Icons, set the component info
      const prefix = iconName.substring(0, 2) // e.g., "Fa" from "FaGithub"
      let packageName = ""

      // Determine the package name based on the prefix
      switch (prefix) {
        case "Fa":
          packageName = "react-icons/fa"
          break
        case "Md":
          packageName = "react-icons/md"
          break
        default:
          packageName = "react-icons/fa" // Default to Font Awesome
      }

      newElement.componentInfo = {
        isComponent: true,
        packageName,
        importName: iconName,
        importType: "named",
      }

      // Update the type to match the icon name
      newElement.type = iconName

      // Ensure the icon is rendered correctly
      if (library === "react-icons") {
        const IconComponent = ReactIconsMap[iconName]
        if (IconComponent) {
          // The icon exists, we're good to go
          console.log(`Applied React icon: ${iconName}`)
        }
      }

      // Remove any text content as icons don't have text
      delete newElement.textContent

      // Add a default className if none exists
      newElement.className = newElement.className || "h-6 w-6 text-blue-500"

      // Ensure no attributes are added by default
      newElement.attributes = {}
    }

    // Update the element in the tree
    updateElement(newElement)
  }

  return (
    <div className="space-y-4 py-2">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Icon Library</Label>
            <div className="flex gap-2">
              <Button
                variant={selectedLibrary === "lucide" ? "default" : "outline"}
                onClick={() => setSelectedLibrary("lucide")}
              >
                Lucide Icons
              </Button>
              <Button
                variant={selectedLibrary === "react-icons" ? "default" : "outline"}
                onClick={() => setSelectedLibrary("react-icons")}
              >
                React Icons
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Select an Icon</Label>
            <ScrollArea className="h-60 border rounded-md p-2">
              <div className="grid grid-cols-4 gap-2">
                {selectedLibrary === "lucide"
                  ? lucideIcons.map((iconName) => {
                      const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons] as React.FC<any>
                      return (
                        <Button
                          key={iconName}
                          variant={selectedIcon === iconName ? "default" : "outline"}
                          className="h-auto p-2 flex flex-col items-center"
                          onClick={() => setSelectedIcon(iconName)}
                        >
                          <IconComponent size={24} />
                          <span className="text-xs mt-1 truncate w-full text-center">{iconName}</span>
                        </Button>
                      )
                    })
                  : reactIcons.map((iconName) => {
                      const IconComponent = ReactIconsMap[iconName]
                      return (
                        <Button
                          key={iconName}
                          variant={selectedIcon === iconName ? "default" : "outline"}
                          className="h-auto p-2 flex flex-col items-center"
                          onClick={() => setSelectedIcon(iconName)}
                        >
                          <IconComponent size={24} />
                          <span className="text-xs mt-1 truncate w-full text-center">{iconName}</span>
                        </Button>
                      )
                    })}
              </div>
            </ScrollArea>
          </div>

          {selectedIcon && (
            <div className="pt-2 border-t">
              <Label className="text-sm font-medium mb-2 block">Selected Icon</Label>
              <div className="flex items-center justify-center p-4 bg-gray-50 rounded-md">
                {selectedLibrary === "lucide"
                  ? React.createElement(LucideIcons[selectedIcon as keyof typeof LucideIcons], { size: 32 })
                  : React.createElement(ReactIconsMap[selectedIcon], { size: 32 })}
              </div>
              <p className="text-center text-sm mt-2">{selectedIcon}</p>

              <Button className="w-full mt-4" onClick={() => applyIcon(selectedIcon, selectedLibrary)}>
                Insert Icon
              </Button>
            </div>
          )}

          <div className="pt-2 border-t text-sm text-gray-500">
            <p>Note: Icons are inserted as components and must be imported in your project.</p>
            <p className="mt-1">Make sure the following imports are active in the Imports Manager:</p>
            <ul className="list-disc pl-5 mt-1">
              <li>lucide-react (for Lucide icons)</li>
              <li>react-icons/fa (for Font Awesome icons)</li>
              <li>react-icons/md (for Material Design icons)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default IconEditor

