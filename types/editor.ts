export interface ParsedElement {
  id: string
  type: string
  className?: string
  style?: Record<string, string>
  textContent?: string
  attributes?: Record<string, string>
  children?: ParsedElement[]
  originalTag?: string
  parent?: string
  animations?: {
    type: string
    duration: number
    delay: number
    repeat: number
    ease: string
    enabled: boolean
    trigger?: "load" | "hover" | "click" | "inView"
    direction?: string
    angle?: number
    distance?: number
    intensity?: number
  }
  componentInfo?: {
    isComponent: boolean
    packageName?: string
    importName?: string
    importType?: "default" | "named" | "namespace"
  }
  isRootFragment?: boolean // Flag to identify root fragments
}

export interface ImportStatement {
  id: string
  packageName: string
  importNames: Array<{
    name: string
    alias?: string
    type: "default" | "named" | "namespace" | "type"
  }>
  isActive: boolean
}

