"use client"

import type React from "react"

import { useState } from "react"
import { Plus, X, ChevronDown, ChevronRight, Package, FileCode, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { ImportStatement } from "@/types/editor"

interface ImportsManagerProps {
  imports: ImportStatement[]
  addImport: (importStatement: Omit<ImportStatement, "id">) => ImportStatement
  updateImport: (id: string, updates: Partial<ImportStatement>) => void
  removeImport: (id: string) => void
  toggleImportActive: (id: string) => void
  addImportName: (
    importId: string,
    name: string,
    type: "default" | "named" | "namespace" | "type",
    alias?: string,
  ) => void
  removeImportName: (importId: string, name: string, type: string) => void
  generateImportStatements: () => string
}

export const ImportsManager: React.FC<ImportsManagerProps> = ({
  imports,
  addImport,
  updateImport,
  removeImport,
  toggleImportActive,
  addImportName,
  removeImportName,
  generateImportStatements,
}) => {
  const [newImportPackage, setNewImportPackage] = useState("")
  const [newImportName, setNewImportName] = useState("")
  const [newImportType, setNewImportType] = useState<"default" | "named" | "namespace" | "type">("named")
  const [newImportAlias, setNewImportAlias] = useState("")
  const [expandedImports, setExpandedImports] = useState<Record<string, boolean>>({})
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Toggle expanded state for an import
  const toggleExpanded = (id: string) => {
    setExpandedImports((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  // Handle adding a new import
  const handleAddImport = () => {
    if (!newImportPackage || !newImportName) return

    // Check if import already exists
    const existingImport = imports.find((imp) => imp.packageName === newImportPackage)

    if (existingImport) {
      // Add to existing import
      addImportName(existingImport.id, newImportName, newImportType, newImportAlias || undefined)
    } else {
      // Create new import
      const newImport = addImport({
        packageName: newImportPackage,
        importNames: [
          {
            name: newImportName,
            type: newImportType,
            alias: newImportAlias || undefined,
          },
        ],
        isActive: true,
      })

      // Auto-expand the new import
      setExpandedImports((prev) => ({
        ...prev,
        [newImport.id]: true,
      }))
    }

    // Reset form
    setNewImportPackage("")
    setNewImportName("")
    setNewImportType("named")
    setNewImportAlias("")
    setIsAddDialogOpen(false)
  }

  // Filter imports based on active tab and search query
  const filteredImports = imports.filter((imp) => {
    const matchesSearch =
      searchQuery === "" ||
      imp.packageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      imp.importNames.some(
        (name) =>
          name.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (name.alias && name.alias.toLowerCase().includes(searchQuery.toLowerCase())),
      )

    if (!matchesSearch) return false

    if (activeTab === "all") return true
    if (activeTab === "active") return imp.isActive
    if (activeTab === "inactive") return !imp.isActive
    return true
  })

  // Group imports by category
  const groupedImports = filteredImports.reduce<Record<string, ImportStatement[]>>((acc, imp) => {
    const category = getImportCategory(imp.packageName)
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(imp)
    return acc
  }, {})

  // Get import category based on package name
  function getImportCategory(packageName: string): string {
    if (packageName.startsWith("next/")) return "Next.js"
    if (packageName.startsWith("@/components/ui/")) return "shadcn/ui"
    if (packageName.startsWith("@/")) return "Project"
    if (packageName === "react") return "React"
    if (packageName === "lucide-react") return "Icons"
    if (packageName === "framer-motion") return "Animation"
    return "Other"
  }

  // Add a function to check if an import name is a component
  const isComponent = (name: string): boolean => {
    // Components start with uppercase letters and aren't hooks
    return name[0] === name[0].toUpperCase() && !name.startsWith("use")
  }

  // Update the renderImportTypeBadge function to add a component badge
  const renderImportTypeBadge = (type: string, name: string) => {
    // Add a component badge for components
    if (isComponent(name)) {
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          component
        </Badge>
      )
    }

    switch (type) {
      case "default":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            default
          </Badge>
        )
      case "named":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            named
          </Badge>
        )
      case "namespace":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            namespace
          </Badge>
        )
      case "type":
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            type
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Imports Manager</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Import
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Import</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="package-name">Package Name</Label>
                <Input
                  id="package-name"
                  placeholder="e.g., next/image, @/components/ui/button"
                  value={newImportPackage}
                  onChange={(e) => setNewImportPackage(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="import-type">Import Type</Label>
                <select
                  id="import-type"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={newImportType}
                  onChange={(e) => setNewImportType(e.target.value as any)}
                >
                  <option value="default">Default Import</option>
                  <option value="named">Named Import</option>
                  <option value="namespace">Namespace Import</option>
                  <option value="type">Type Import</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="import-name">Import Name</Label>
                <Input
                  id="import-name"
                  placeholder={
                    newImportType === "default"
                      ? "e.g., Image"
                      : newImportType === "named"
                        ? "e.g., Button"
                        : newImportType === "namespace"
                          ? "e.g., *"
                          : "e.g., ButtonProps"
                  }
                  value={newImportName}
                  onChange={(e) => setNewImportName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="import-alias">
                  Alias (Optional)
                  {newImportType === "namespace" && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  id="import-alias"
                  placeholder="e.g., MyButton"
                  value={newImportAlias}
                  onChange={(e) => setNewImportAlias(e.target.value)}
                />
                {newImportType === "namespace" && (
                  <p className="text-xs text-red-500">* Required for namespace imports</p>
                )}
              </div>

              <Button
                className="w-full mt-4"
                onClick={handleAddImport}
                disabled={!newImportPackage || !newImportName || (newImportType === "namespace" && !newImportAlias)}
              >
                Add Import
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search imports..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <Button variant="ghost" size="sm" className="absolute right-1 top-1 h-7" onClick={() => setSearchQuery("")}>
            Clear
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="all">All Imports</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
        </TabsList>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Import Statements</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px] px-4 pb-4">
              {Object.entries(groupedImports).length > 0 ? (
                Object.entries(groupedImports).map(([category, categoryImports]) => (
                  <div key={category} className="mb-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">{category}</h3>
                    <div className="space-y-2">
                      {categoryImports.map((imp) => (
                        <Collapsible
                          key={imp.id}
                          open={expandedImports[imp.id]}
                          onOpenChange={() => toggleExpanded(imp.id)}
                          className="border rounded-md overflow-hidden"
                        >
                          <div className="flex items-center justify-between p-3 bg-gray-50">
                            <div className="flex items-center gap-2">
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  {expandedImports[imp.id] ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-gray-500" />
                                <span className="font-mono text-sm">{imp.packageName}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch checked={imp.isActive} onCheckedChange={() => toggleImportActive(imp.id)} />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-red-500 hover:text-red-700"
                                onClick={() => removeImport(imp.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <CollapsibleContent>
                            <div className="p-3 border-t bg-white">
                              <div className="space-y-2">
                                {imp.importNames.map((importName, idx) => (
                                  <div
                                    key={`${importName.name}-${importName.type}-${idx}`}
                                    className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50"
                                  >
                                    <div className="flex items-center gap-2">
                                      <FileCode className="h-4 w-4 text-gray-500" />
                                      <span className="font-mono text-sm">
                                        {importName.name}
                                        {importName.alias && ` as ${importName.alias}`}
                                      </span>
                                      {renderImportTypeBadge(importName.type, importName.name)}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-red-500 hover:text-red-700"
                                      onClick={() => removeImportName(imp.id, importName.name, importName.type)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-3 pt-3 border-t flex items-center gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="text-xs">
                                      <Plus className="h-3 w-3 mr-1" />
                                      Add Import Name
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Add Import Name to {imp.packageName}</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="add-import-type">Import Type</Label>
                                        <select
                                          id="add-import-type"
                                          className="w-full p-2 border border-gray-300 rounded-md"
                                          value={newImportType}
                                          onChange={(e) => setNewImportType(e.target.value as any)}
                                        >
                                          <option value="default">Default Import</option>
                                          <option value="named">Named Import</option>
                                          <option value="namespace">Namespace Import</option>
                                          <option value="type">Type Import</option>
                                        </select>
                                      </div>

                                      <div className="space-y-2">
                                        <Label htmlFor="add-import-name">Import Name</Label>
                                        <Input
                                          id="add-import-name"
                                          placeholder="e.g., Button"
                                          value={newImportName}
                                          onChange={(e) => setNewImportName(e.target.value)}
                                        />
                                      </div>

                                      <div className="space-y-2">
                                        <Label htmlFor="add-import-alias">Alias (Optional)</Label>
                                        <Input
                                          id="add-import-alias"
                                          placeholder="e.g., MyButton"
                                          value={newImportAlias}
                                          onChange={(e) => setNewImportAlias(e.target.value)}
                                        />
                                      </div>

                                      <Button
                                        className="w-full mt-4"
                                        onClick={() => {
                                          if (newImportName) {
                                            addImportName(
                                              imp.id,
                                              newImportName,
                                              newImportType,
                                              newImportAlias || undefined,
                                            )
                                            setNewImportName("")
                                            setNewImportType("named")
                                            setNewImportAlias("")
                                          }
                                        }}
                                        disabled={!newImportName}
                                      >
                                        Add
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  {searchQuery ? "No imports found matching your search" : "No imports found in this category"}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </Tabs>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Generated Import Statements</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-50 p-3 rounded-md overflow-x-auto text-sm font-mono">
            {generateImportStatements() || "// No active imports"}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

