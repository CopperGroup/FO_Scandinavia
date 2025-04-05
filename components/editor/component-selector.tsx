"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package, Search, FileCode, Filter } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import DynamicIcon from "@/components/ui/dynamic-icon"
import dynamicIconImports from "lucide-react/dynamicIconImports"
import { useToast } from "@/components/ui/use-toast"

interface ComponentSelectorProps {
  onSelectComponent: (componentInfo: {
    type: string
    packageName: string
    importName: string
    importType: "default" | "named" | "namespace"
  }) => void
  triggerButton?: React.ReactNode
  imports?: any[]
  toggleImportActive?: (importName: string) => void
}

// Define available component categories
const componentCategories = {
  "UI Components": [
    { name: "Button", packageName: "@/components/ui/button", type: "named" },
    { name: "Card", packageName: "@/components/ui/card", type: "named" },
    { name: "CardContent", packageName: "@/components/ui/card", type: "named" },
    { name: "CardHeader", packageName: "@/components/ui/card", type: "named" },
    { name: "CardFooter", packageName: "@/components/ui/card", type: "named" },
    { name: "CardTitle", packageName: "@/components/ui/card", type: "named" },
    { name: "CardDescription", packageName: "@/components/ui/card", type: "named" },
    { name: "Input", packageName: "@/components/ui/input", type: "named" },
    { name: "Label", packageName: "@/components/ui/label", type: "named" },
    { name: "Badge", packageName: "@/components/ui/badge", type: "named" },
  ],
  "Form Components": [
    { name: "Checkbox", packageName: "@/components/ui/checkbox", type: "named" },
    { name: "RadioGroup", packageName: "@/components/ui/radio-group", type: "named" },
    { name: "RadioGroupItem", packageName: "@/components/ui/radio-group", type: "named" },
    { name: "Select", packageName: "@/components/ui/select", type: "named" },
    { name: "SelectContent", packageName: "@/components/ui/select", type: "named" },
    { name: "SelectItem", packageName: "@/components/ui/select", type: "named" },
    { name: "SelectTrigger", packageName: "@/components/ui/select", type: "named" },
    { name: "SelectValue", packageName: "@/components/ui/select", type: "named" },
    { name: "Slider", packageName: "@/components/ui/slider", type: "named" },
    { name: "Switch", packageName: "@/components/ui/switch", type: "named" },
    { name: "Textarea", packageName: "@/components/ui/textarea", type: "named" },
  ],
  "Navigation Components": [
    { name: "Tabs", packageName: "@/components/ui/tabs", type: "named" },
    { name: "TabsContent", packageName: "@/components/ui/tabs", type: "named" },
    { name: "TabsList", packageName: "@/components/ui/tabs", type: "named" },
    { name: "TabsTrigger", packageName: "@/components/ui/tabs", type: "named" },
  ],
  "Overlay Components": [
    { name: "Dialog", packageName: "@/components/ui/dialog", type: "named" },
    { name: "DialogContent", packageName: "@/components/ui/dialog", type: "named" },
    { name: "DialogHeader", packageName: "@/components/ui/dialog", type: "named" },
    { name: "DialogTitle", packageName: "@/components/ui/dialog", type: "named" },
    { name: "DialogTrigger", packageName: "@/components/ui/dialog", type: "named" },
    { name: "Tooltip", packageName: "@/components/ui/tooltip", type: "named" },
    { name: "TooltipContent", packageName: "@/components/ui/tooltip", type: "named" },
    { name: "TooltipProvider", packageName: "@/components/ui/tooltip", type: "named" },
    { name: "TooltipTrigger", packageName: "@/components/ui/tooltip", type: "named" },
  ],
  "Next.js Components": [
    { name: "Image", packageName: "next/image", type: "default" },
    { name: "Link", packageName: "next/link", type: "default" },
  ],
}

// Icon categories for filtering
const iconCategories = [
  { value: "all", label: "All Icons" },
  { value: "arrow", label: "Arrows" },
  { value: "chart", label: "Charts" },
  { value: "file", label: "Files" },
  { value: "layout", label: "Layout" },
  { value: "user", label: "Users" },
  { value: "alert", label: "Alerts" },
  { value: "communication", label: "Communication" },
  { value: "media", label: "Media" },
  { value: "device", label: "Devices" },
]

export const ComponentSelector: React.FC<ComponentSelectorProps> = ({
  onSelectComponent,
  triggerButton,
  imports = [],
  toggleImportActive,
}) => {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("ui")
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isLoadingIcons, setIsLoadingIcons] = useState(true)
  const [lucideIcons, setLucideIcons] = useState<string[]>([])

  // Load icons when the component mounts or when the dialog opens
  useEffect(() => {
    if (open && activeTab === "icons") {
      setIsLoadingIcons(true)
      // Simulate loading time for icons
      const timer = setTimeout(() => {
        setLucideIcons(Object.keys(dynamicIconImports).sort())
        setIsLoadingIcons(false)
      }, 800) // Simulate a loading delay

      return () => clearTimeout(timer)
    }
  }, [open, activeTab])

  // Reset loading state when tab changes
  useEffect(() => {
    if (activeTab === "icons" && lucideIcons.length === 0) {
      setIsLoadingIcons(true)
    }
  }, [activeTab, lucideIcons.length])

  // Filter components based on search term
  const filteredComponents = searchTerm
    ? Object.values(componentCategories)
        .flat()
        .filter((comp) => comp.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : []

  // Filter icons based on search term or category
  const filteredIcons = (() => {
    if (selectedCategory !== "all") {
      return lucideIcons.filter((icon) => icon.toLowerCase().includes(selectedCategory.toLowerCase()))
    }
    if (searchTerm) {
      return lucideIcons.filter((icon) => icon.toLowerCase().includes(searchTerm.toLowerCase()))
    }
    return lucideIcons
  })()

  // Handle component selection
  const handleSelectComponent = (name: string, packageName: string, type: "default" | "named" | "namespace") => {
    if (onSelectComponent) {
      onSelectComponent({
        type: name,
        packageName: packageName,
        importName: name,
        importType: type,
      })
    }
    toast({
      variant: "purple",
      description: (
        <div className="flex items-center gap-1">
          <DynamicIcon name={name.toLowerCase()} className="h-4 w-4" fallback={<Package className="h-4 w-4" />} />
          <span>
            Added <strong>{name}</strong> component
          </span>
        </div>
      ),
      duration: 2000,
    })
    setOpen(false)
  }

  // Handle icon selection
  const handleSelectIcon = (iconName: string) => {
    onSelectComponent({
      type: iconName,
      packageName: "lucide-react",
      importName: iconName,
      importType: "named",
    })
    toast({
      variant: "purple",
      description: (
        <div className="flex items-center gap-1">
          <DynamicIcon name={iconName} className="h-4 w-4" />
          <span>
            Added <strong>{iconName}</strong> icon
          </span>
        </div>
      ),
      duration: 2000,
    })
    setOpen(false)
  }

  // Handle category change
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    if (category === "all") {
      setSearchTerm("")
    }
  }

  // Generate skeleton placeholders for loading state
  const renderSkeletons = () => {
    return Array.from({ length: 24 }).map((_, index) => (
      <div
        key={`skeleton-${index}`}
        className="h-12 w-12 rounded-md bg-muted/40 animate-pulse flex items-center justify-center"
      >
        <div className="h-6 w-6 rounded-sm bg-muted/60"></div>
      </div>
    ))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton ? (
          triggerButton
        ) : (
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <FileCode className="h-3 w-3 mr-1" />
            Add Component
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] border-primary/10 shadow-md">
        <DialogHeader className="bg-primary/10 border-b border-primary/20 pb-4 pt-2 px-2 rounded-t-lg">
          <DialogTitle className="text-foreground flex items-center gap-2 px-2">
            <Package className="h-5 w-5 text-primary" />
            <span className="font-medium">Add Component</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 px-1 bg-background/80 rounded-md border border-primary/5">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-primary/60" />
            <Input
              placeholder="Search components or icons..."
              className="pl-8 border-primary/10 focus-visible:ring-primary/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1">
              <TabsTrigger value="ui" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Package className="h-3.5 w-3.5 mr-1.5" />
                UI Components
              </TabsTrigger>
              <TabsTrigger value="form" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <FileCode className="h-3.5 w-3.5 mr-1.5" />
                Form Components
              </TabsTrigger>
              <TabsTrigger value="icons" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <DynamicIcon name="shapes" className="h-3.5 w-3.5 mr-1.5" />
                Icons
              </TabsTrigger>
            </TabsList>

            {/* UI Components Tab */}
            <TabsContent value="ui" className="pt-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-primary/60"></div>
                <h3 className="text-sm font-medium text-primary-foreground/80">Browse Components</h3>
              </div>

              <ScrollArea className="h-[350px] pr-2">
                {searchTerm ? (
                  <div className="space-y-4">
                    <div className="bg-muted/30 rounded-lg p-3">
                      <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center">
                        <Search className="h-3 w-3 mr-1.5" />
                        Search Results
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {filteredComponents.map((comp, idx) => (
                          <Button
                            key={`${comp.name}-${idx}`}
                            variant="outline"
                            className="justify-start h-auto py-3 px-3 border-primary/5 hover:border-primary/20 hover:bg-primary/5 transition-colors group"
                            onClick={() => handleSelectComponent(comp.name, comp.packageName, comp.type as any)}
                          >
                            <div className="flex flex-col items-start text-left w-full">
                              <div className="flex items-center gap-2 w-full justify-between">
                                <div className="flex items-center">
                                  <span className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center mr-2">
                                    <Package className="h-3.5 w-3.5 text-primary" />
                                  </span>
                                  <span className="font-medium">{comp.name}</span>
                                </div>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <DynamicIcon name="plus-circle" className="h-4 w-4 text-primary/70" />
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground mt-1 truncate max-w-full pl-8">
                                {comp.packageName}
                              </span>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-primary/5 to-transparent rounded-lg p-3">
                      <h4 className="text-xs uppercase tracking-wider text-primary/70 mb-3 flex items-center border-b border-primary/10 pb-1.5">
                        <DynamicIcon name="layout" className="h-3.5 w-3.5 mr-1.5" />
                        UI Components
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {componentCategories["UI Components"].map((comp) => (
                          <Button
                            key={comp.name}
                            variant="outline"
                            className="justify-start h-auto py-3 px-3 border-primary/5 hover:border-primary/20 hover:bg-primary/5 transition-colors group relative overflow-hidden"
                            onClick={() => handleSelectComponent(comp.name, comp.packageName, comp.type as any)}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex items-center gap-2 w-full justify-between relative">
                              <div className="flex items-center">
                                <span className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center mr-2">
                                  <DynamicIcon
                                    name={comp.name.toLowerCase()}
                                    className="h-3.5 w-3.5 text-primary"
                                    fallback={<Package className="h-3.5 w-3.5 text-primary" />}
                                  />
                                </span>
                                <span className="font-medium">{comp.name}</span>
                              </div>
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <DynamicIcon name="plus-circle" className="h-4 w-4 text-primary/70" />
                              </span>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-muted/50 to-transparent rounded-lg p-3">
                      <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center border-b border-muted/30 pb-1.5">
                        <DynamicIcon name="link" className="h-3.5 w-3.5 mr-1.5" />
                        Next.js Components
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {componentCategories["Next.js Components"].map((comp) => (
                          <Button
                            key={comp.name}
                            variant="outline"
                            className="justify-start h-auto py-3 px-3 border-muted/30 hover:border-primary/20 hover:bg-primary/5 transition-colors group relative overflow-hidden"
                            onClick={() => handleSelectComponent(comp.name, comp.packageName, comp.type as any)}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex items-center gap-2 w-full justify-between relative">
                              <div className="flex items-center">
                                <span className="h-6 w-6 rounded-md bg-muted/40 flex items-center justify-center mr-2">
                                  <DynamicIcon
                                    name={comp.name.toLowerCase()}
                                    className="h-3.5 w-3.5"
                                    fallback={<FileCode className="h-3.5 w-3.5" />}
                                  />
                                </span>
                                <span className="font-medium">{comp.name}</span>
                              </div>
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <DynamicIcon name="plus-circle" className="h-4 w-4 text-primary/70" />
                              </span>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Form Components Tab */}
            <TabsContent value="form" className="pt-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-primary/60"></div>
                <h3 className="text-sm font-medium text-primary-foreground/80">Form Elements</h3>
              </div>

              <ScrollArea className="h-[350px] pr-2">
                {searchTerm ? (
                  <div className="space-y-4">
                    <div className="bg-muted/30 rounded-lg p-3">
                      <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center">
                        <Search className="h-3 w-3 mr-1.5" />
                        Search Results
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {filteredComponents.map((comp, idx) => (
                          <Button
                            key={`${comp.name}-${idx}`}
                            variant="outline"
                            className="justify-start h-auto py-3 px-3 border-primary/5 hover:border-primary/20 hover:bg-primary/5 transition-colors group"
                            onClick={() => handleSelectComponent(comp.name, comp.packageName, comp.type as any)}
                          >
                            <div className="flex flex-col items-start text-left w-full">
                              <div className="flex items-center gap-2 w-full justify-between">
                                <div className="flex items-center">
                                  <span className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center mr-2">
                                    <Package className="h-3.5 w-3.5 text-primary" />
                                  </span>
                                  <span className="font-medium">{comp.name}</span>
                                </div>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <DynamicIcon name="plus-circle" className="h-4 w-4 text-primary/70" />
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground mt-1 truncate max-w-full pl-8">
                                {comp.packageName}
                              </span>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-primary/5 to-transparent rounded-lg p-3">
                      <h4 className="text-xs uppercase tracking-wider text-primary/70 mb-3 flex items-center border-b border-primary/10 pb-1.5">
                        <DynamicIcon name="input" className="h-3.5 w-3.5 mr-1.5" />
                        Form Components
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {componentCategories["Form Components"].map((comp) => (
                          <Button
                            key={comp.name}
                            variant="outline"
                            className="justify-start h-auto py-3 px-3 border-primary/5 hover:border-primary/20 hover:bg-primary/5 transition-colors group relative overflow-hidden"
                            onClick={() => handleSelectComponent(comp.name, comp.packageName, comp.type as any)}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex items-center gap-2 w-full justify-between relative">
                              <div className="flex items-center">
                                <span className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center mr-2">
                                  <DynamicIcon
                                    name={comp.name.toLowerCase()}
                                    className="h-3.5 w-3.5 text-primary"
                                    fallback={<Package className="h-3.5 w-3.5 text-primary" />}
                                  />
                                </span>
                                <span className="font-medium">{comp.name}</span>
                              </div>
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <DynamicIcon name="plus-circle" className="h-4 w-4 text-primary/70" />
                              </span>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-muted/50 to-transparent rounded-lg p-3">
                      <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center border-b border-muted/30 pb-1.5">
                        <DynamicIcon name="layout-panel-left" className="h-3.5 w-3.5 mr-1.5" />
                        Navigation & Overlay
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          ...componentCategories["Navigation Components"],
                          ...componentCategories["Overlay Components"],
                        ].map((comp) => (
                          <Button
                            key={comp.name}
                            variant="outline"
                            className="justify-start h-auto py-3 px-3 border-muted/30 hover:border-primary/20 hover:bg-primary/5 transition-colors group relative overflow-hidden"
                            onClick={() => handleSelectComponent(comp.name, comp.packageName, comp.type as any)}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex items-center gap-2 w-full justify-between relative">
                              <div className="flex items-center">
                                <span className="h-6 w-6 rounded-md bg-muted/40 flex items-center justify-center mr-2">
                                  <DynamicIcon
                                    name={comp.name.toLowerCase()}
                                    className="h-3.5 w-3.5"
                                    fallback={<FileCode className="h-3.5 w-3.5" />}
                                  />
                                </span>
                                <span className="font-medium">{comp.name}</span>
                              </div>
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <DynamicIcon name="plus-circle" className="h-4 w-4 text-primary/70" />
                              </span>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Icons Tab */}
            <TabsContent value="icons" className="pt-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-primary/60"></div>
                <h3 className="text-sm font-medium text-primary-foreground/80">Browse Icons</h3>
              </div>

              <div className="flex flex-col space-y-3">
                <div className="flex items-center gap-1.5 bg-muted/30 p-2 rounded-md border border-muted/50">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-primary/60" />
                    <Input
                      placeholder="Search icons..."
                      className="pl-8 h-8 text-xs rounded-md border-primary/10"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value)
                        if (e.target.value) {
                          setSelectedCategory("all")
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-1 h-8 px-2 text-xs rounded-md border border-primary/10 bg-background">
                    <Filter className="h-3.5 w-3.5 text-primary/60" />
                    <select
                      className="bg-transparent border-none outline-none text-xs w-full"
                      value={selectedCategory}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                    >
                      {iconCategories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedIcon && !isLoadingIcons && (
                  <div className="flex items-center justify-center p-3 border border-primary/10 rounded-md bg-primary/5">
                    <div className="flex flex-col items-center">
                      <DynamicIcon name={selectedIcon as any} className="h-8 w-8 mb-2 text-primary" />
                      <span className="text-xs font-medium">{selectedIcon}</span>
                    </div>
                  </div>
                )}

                <div className="bg-gradient-to-r from-muted/30 to-transparent rounded-lg p-3 border border-muted/30">
                  <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center border-b border-muted/30 pb-1.5">
                    <DynamicIcon name="shapes" className="h-3.5 w-3.5 mr-1.5" />
                    {selectedCategory !== "all"
                      ? `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Icons`
                      : "All Icons"}
                  </h4>

                  <ScrollArea className="h-[260px] pr-1">
                    <div className="grid grid-cols-6 gap-2">
                      {isLoadingIcons ? (
                        renderSkeletons()
                      ) : (
                        <TooltipProvider>
                          {filteredIcons.slice(0, 100).map((iconName) => (
                            <Tooltip key={iconName}>
                              <TooltipTrigger asChild>
                                <Button
                                  variant={selectedIcon === iconName ? "default" : "ghost"}
                                  className={`h-12 w-12 p-0 flex items-center justify-center rounded-md transition-colors ${
                                    selectedIcon === iconName
                                      ? "bg-primary/10 text-primary border border-primary/20"
                                      : "hover:bg-primary/5 hover:text-primary/80 border border-transparent hover:border-primary/10"
                                  }`}
                                  onClick={() => {
                                    setSelectedIcon(iconName)
                                    handleSelectIcon(iconName)
                                  }}
                                >
                                  <DynamicIcon name={iconName as any} className="h-6 w-6" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <p>{iconName}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </TooltipProvider>
                      )}
                    </div>
                    {!isLoadingIcons && filteredIcons.length > 100 && (
                      <div className="text-center mt-4 text-sm text-primary/60 bg-primary/5 p-2 rounded-md">
                        Showing first 100 icons. Use search to find more.
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}

