"use client"

import { useState, useCallback } from "react"
import { v4 as uuidv4 } from "uuid"
import type { ImportStatement } from "@/types/editor"

export function useJsxImports() {
  // Default imports that are always available
  const defaultImports: ImportStatement[] = [
    {
      id: "next-image",
      packageName: "next/image",
      importNames: [{ name: "Image", type: "default" }],
      isActive: true,
    },
    {
      id: "next-link",
      packageName: "next/link",
      importNames: [{ name: "Link", type: "default" }],
      isActive: true,
    },
    {
      id: "react",
      packageName: "react",
      importNames: [
        { name: "React", type: "default" },
        { name: "useState", type: "named" },
        { name: "useEffect", type: "named" },
        { name: "useCallback", type: "named" },
        { name: "useMemo", type: "named" },
        { name: "useRef", type: "named" },
      ],
      isActive: true,
    },
    {
      id: "lucide-react",
      packageName: "lucide-react",
      importNames: [
        { name: "*", alias: "LucideIcons", type: "namespace" },
        { name: "Home", type: "named" },
        { name: "Settings", type: "named" },
        { name: "User", type: "named" },
        { name: "Mail", type: "named" },
        { name: "Bell", type: "named" },
        { name: "Calendar", type: "named" },
        { name: "Search", type: "named" },
        { name: "Heart", type: "named" },
        { name: "Star", type: "named" },
        { name: "Github", type: "named" },
        { name: "Twitter", type: "named" },
        { name: "Facebook", type: "named" },
        { name: "Instagram", type: "named" },
        { name: "Linkedin", type: "named" },
        { name: "Check", type: "named" },
        { name: "X", type: "named" },
        { name: "Menu", type: "named" },
        { name: "ChevronDown", type: "named" },
        { name: "ChevronRight", type: "named" },
        { name: "ChevronLeft", type: "named" },
        { name: "ChevronUp", type: "named" },
        { name: "ArrowRight", type: "named" },
        { name: "ArrowLeft", type: "named" },
        { name: "ArrowUp", type: "named" },
        { name: "ArrowDown", type: "named" },
        { name: "Plus", type: "named" },
        { name: "Minus", type: "named" },
        { name: "Edit", type: "named" },
        { name: "Trash", type: "named" },
        { name: "Copy", type: "named" },
        { name: "Save", type: "named" },
        { name: "Download", type: "named" },
        { name: "Upload", type: "named" },
        { name: "Image", type: "named" },
        { name: "Video", type: "named" },
        { name: "File", type: "named" },
        { name: "Folder", type: "named" },
      ],
      isActive: true,
    },
    {
      id: "shadcn-button",
      packageName: "@/components/ui/button",
      importNames: [{ name: "Button", type: "named" }],
      isActive: true,
    },
    {
      id: "shadcn-card",
      packageName: "@/components/ui/card",
      importNames: [
        { name: "Card", type: "named" },
        { name: "CardContent", type: "named" },
        { name: "CardHeader", type: "named" },
        { name: "CardFooter", type: "named" },
        { name: "CardTitle", type: "named" },
        { name: "CardDescription", type: "named" },
      ],
      isActive: true,
    },
    {
      id: "shadcn-input",
      packageName: "@/components/ui/input",
      importNames: [{ name: "Input", type: "named" }],
      isActive: true,
    },
    {
      id: "shadcn-label",
      packageName: "@/components/ui/label",
      importNames: [{ name: "Label", type: "named" }],
      isActive: true,
    },
    {
      id: "shadcn-badge",
      packageName: "@/components/ui/badge",
      importNames: [{ name: "Badge", type: "named" }],
      isActive: true,
    },
    // Add more shadcn components
    {
      id: "shadcn-checkbox",
      packageName: "@/components/ui/checkbox",
      importNames: [{ name: "Checkbox", type: "named" }],
      isActive: true,
    },
    {
      id: "shadcn-radio-group",
      packageName: "@/components/ui/radio-group",
      importNames: [
        { name: "RadioGroup", type: "named" },
        { name: "RadioGroupItem", type: "named" },
      ],
      isActive: true,
    },
    {
      id: "shadcn-select",
      packageName: "@/components/ui/select",
      importNames: [
        { name: "Select", type: "named" },
        { name: "SelectContent", type: "named" },
        { name: "SelectItem", type: "named" },
        { name: "SelectTrigger", type: "named" },
        { name: "SelectValue", type: "named" },
      ],
      isActive: true,
    },
    {
      id: "shadcn-slider",
      packageName: "@/components/ui/slider",
      importNames: [{ name: "Slider", type: "named" }],
      isActive: true,
    },
    {
      id: "shadcn-switch",
      packageName: "@/components/ui/switch",
      importNames: [{ name: "Switch", type: "named" }],
      isActive: true,
    },
    {
      id: "shadcn-tabs",
      packageName: "@/components/ui/tabs",
      importNames: [
        { name: "Tabs", type: "named" },
        { name: "TabsContent", type: "named" },
        { name: "TabsList", type: "named" },
        { name: "TabsTrigger", type: "named" },
      ],
      isActive: true,
    },
    {
      id: "shadcn-textarea",
      packageName: "@/components/ui/textarea",
      importNames: [{ name: "Textarea", type: "named" }],
      isActive: true,
    },
    {
      id: "shadcn-toggle",
      packageName: "@/components/ui/toggle",
      importNames: [{ name: "Toggle", type: "named" }],
      isActive: true,
    },
    {
      id: "shadcn-tooltip",
      packageName: "@/components/ui/tooltip",
      importNames: [
        { name: "Tooltip", type: "named" },
        { name: "TooltipContent", type: "named" },
        { name: "TooltipProvider", type: "named" },
        { name: "TooltipTrigger", type: "named" },
      ],
      isActive: true,
    },
    {
      id: "framer-motion",
      packageName: "framer-motion",
      importNames: [{ name: "motion", type: "named" }],
      isActive: true,
    },
    {
      id: "cn-util",
      packageName: "@/lib/utils",
      importNames: [{ name: "cn", type: "named" }],
      isActive: true,
    },
    {
      id: "react-icons",
      packageName: "react-icons/fa",
      importNames: [
        { name: "FaGithub", type: "named" },
        { name: "FaTwitter", type: "named" },
        { name: "FaFacebook", type: "named" },
        { name: "FaLinkedin", type: "named" },
        { name: "FaInstagram", type: "named" },
        { name: "FaHome", type: "named" },
        { name: "FaUser", type: "named" },
        { name: "FaCog", type: "named" },
        { name: "FaBell", type: "named" },
        { name: "FaEnvelope", type: "named" },
        { name: "FaCheck", type: "named" },
        { name: "FaTimes", type: "named" },
        { name: "FaPlus", type: "named" },
        { name: "FaMinus", type: "named" },
        { name: "FaEdit", type: "named" },
        { name: "FaTrash", type: "named" },
        { name: "FaSave", type: "named" },
      ],
      isActive: true,
    },
    {
      id: "react-icons-md",
      packageName: "react-icons/md",
      importNames: [
        { name: "MdHome", type: "named" },
        { name: "MdSettings", type: "named" },
        { name: "MdPerson", type: "named" },
        { name: "MdEmail", type: "named" },
        { name: "MdNotifications", type: "named" },
        { name: "MdMenu", type: "named" },
        { name: "MdSearch", type: "named" },
        { name: "MdAdd", type: "named" },
        { name: "MdDelete", type: "named" },
        { name: "MdEdit", type: "named" },
        { name: "MdCheck", type: "named" },
        { name: "MdClose", type: "named" },
        { name: "MdArrowBack", type: "named" },
        { name: "MdArrowForward", type: "named" },
        { name: "MdArrowUpward", type: "named" },
        { name: "MdArrowDownward", type: "named" },
      ],
      isActive: true,
    },
  ]

  const [imports, setImports] = useState<ImportStatement[]>(defaultImports)

  // Add a new import
  const addImport = useCallback((importStatement: Omit<ImportStatement, "id">) => {
    const newImport: ImportStatement = {
      ...importStatement,
      id: uuidv4(),
    }

    setImports((prevImports) => [...prevImports, newImport])
    return newImport
  }, [])

  // Update an existing import
  const updateImport = useCallback((id: string, updates: Partial<ImportStatement>) => {
    setImports((prevImports) => prevImports.map((imp) => (imp.id === id ? { ...imp, ...updates } : imp)))
  }, [])

  // Remove an import
  const removeImport = useCallback((id: string) => {
    setImports((prevImports) => prevImports.filter((imp) => imp.id !== id))
  }, [])

  // Toggle import active state
  const toggleImportActive = useCallback((id: string) => {
    setImports((prevImports) => prevImports.map((imp) => (imp.id === id ? { ...imp, isActive: !imp.isActive } : imp)))
  }, [])

  // Add an import name to an existing import
  const addImportName = useCallback(
    (importId: string, name: string, type: "default" | "named" | "namespace" | "type", alias?: string) => {
      setImports((prevImports) =>
        prevImports.map((imp) => {
          if (imp.id === importId) {
            // Check if the name already exists
            const nameExists = imp.importNames.some((n) => n.name === name && n.type === type)
            if (nameExists) return imp

            return {
              ...imp,
              importNames: [...imp.importNames, { name, type, alias }],
            }
          }
          return imp
        }),
      )
    },
    [],
  )

  // Remove an import name from an existing import
  const removeImportName = useCallback((importId: string, name: string, type: string) => {
    setImports((prevImports) =>
      prevImports.map((imp) => {
        if (imp.id === importId) {
          return {
            ...imp,
            importNames: imp.importNames.filter((n) => !(n.name === name && n.type === type)),
          }
        }
        return imp
      }),
    )
  }, [])

  // Find an import by package name
  const findImportByPackage = useCallback(
    (packageName: string) => {
      return imports.find((imp) => imp.packageName === packageName)
    },
    [imports],
  )

  // Find an import by component name
  const findImportByComponent = useCallback(
    (componentName: string) => {
      return imports.find((imp) => imp.importNames.some((n) => n.name === componentName || n.alias === componentName))
    },
    [imports],
  )

  // Get active imports
  const getActiveImports = useCallback(() => {
    return imports.filter((imp) => imp.isActive)
  }, [imports])

  // Generate import statements as string
  const generateImportStatements = useCallback(() => {
    return getActiveImports()
      .map((imp) => {
        const defaultImports = imp.importNames
          .filter((n) => n.type === "default")
          .map((n) => (n.alias ? `${n.name} as ${n.alias}` : n.name))
          .join(", ")

        const namedImports = imp.importNames
          .filter((n) => n.type === "named")
          .map((n) => (n.alias ? `${n.name} as ${n.alias}` : n.name))
          .join(", ")

        const namespaceImports = imp.importNames
          .filter((n) => n.type === "namespace")
          .map((n) => `* as ${n.alias || n.name}`)
          .join(", ")

        const typeImports = imp.importNames
          .filter((n) => n.type === "type")
          .map((n) => (n.alias ? `type ${n.name} as ${n.alias}` : `type ${n.name}`))
          .join(", ")

        const allImports = [
          defaultImports,
          namedImports ? `{ ${namedImports} }` : "",
          namespaceImports,
          typeImports ? `{ ${typeImports} }` : "",
        ]
          .filter(Boolean)
          .join(", ")

        return `import ${allImports} from "${imp.packageName}";`
      })
      .join("\n")
  }, [getActiveImports])

  return {
    imports,
    addImport,
    updateImport,
    removeImport,
    toggleImportActive,
    addImportName,
    removeImportName,
    findImportByPackage,
    findImportByComponent,
    getActiveImports,
    generateImportStatements,
  }
}

