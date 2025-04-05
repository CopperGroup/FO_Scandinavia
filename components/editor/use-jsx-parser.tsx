import type { ParsedElement } from "../../types/editor" // Assuming ParsedElement is defined here

// Update the generateJSX function to properly handle imported components with animations

const generateJSX = (element: ParsedElement, indentLevel = 0): string => {
  const indent = "  ".repeat(indentLevel)

  // Special handling for imported components with animations
  if (element.animations?.enabled && element.componentInfo?.isComponent) {
    // Generate the animation props
    const animationProps = generateAnimationProps(element.animations)

    // Generate the inner component JSX without animation props
    const componentJSX = generateComponentJSX(element, indentLevel + 1)

    // Wrap in motion.div
    return `${indent}<motion.div ${animationProps}>\n${componentJSX}\n${indent}</motion.div>`
  }

  // Regular handling for HTML elements with animations
  if (element.animations?.enabled && !element.componentInfo?.isComponent) {
    const tag = `motion.${element.type}`
    const animationProps = generateAnimationProps(element.animations)

    let styleProps = ""
    if (element.style) {
      styleProps = `style={{${Object.entries(element.style)
        .map(([key, value]) => `${key}: '${value}'`)
        .join(", ")}}}`
    }

    const classNameProp = element.className ? `className="${element.className}"` : ""

    // Add attributes
    let attributeProps = ""
    if (element.attributes) {
      attributeProps = Object.entries(element.attributes)
        .map(([key, value]) => {
          // For numeric attributes, don't use quotes
          const numericAttributes = ["width", "height", "size", "strokeWidth"]
          if (numericAttributes.includes(key)) {
            return `${key}={${value}}`
          } else {
            return `${key}="${value}"`
          }
        })
        .join(" ")
    }

    // Combine all props
    const props = [classNameProp, styleProps, animationProps, attributeProps].filter(Boolean).join(" ")

    // Generate children JSX
    let childrenJSX = ""
    if (element.children && element.children.length > 0) {
      childrenJSX = element.children.map((child) => generateJSX(child, indentLevel + 1)).join("\n")
    }

    // Text content
    const textContent = element.textContent || ""

    // Generate the JSX
    if (element.children && element.children.length > 0) {
      return `${indent}<${tag} ${props}>\n${textContent}${childrenJSX}\n${indent}</${tag}>`
    } else if (textContent) {
      return `${indent}<${tag} ${props}>${textContent}</${tag}>`
    } else {
      return `${indent}<${tag} ${props} />`
    }
  }

  // Regular handling for elements without animations
  const tag = element.type

  let styleProps = ""
  if (element.style) {
    styleProps = `style={{${Object.entries(element.style)
      .map(([key, value]) => `${key}: '${value}'`)
      .join(", ")}}}`
  }

  const classNameProp = element.className ? `className="${element.className}"` : ""

  // Add attributes
  let attributeProps = ""
  if (element.attributes) {
    attributeProps = Object.entries(element.attributes)
      .map(([key, value]) => {
        // For numeric attributes, don't use quotes
        const numericAttributes = ["width", "height", "size", "strokeWidth"]
        if (numericAttributes.includes(key)) {
          return `${key}={${value}}`
        } else {
          return `${key}="${value}"`
        }
      })
      .join(" ")
  }

  // Combine all props
  const props = [classNameProp, styleProps, attributeProps].filter(Boolean).join(" ")

  // Generate children JSX
  let childrenJSX = ""
  if (element.children && element.children.length > 0) {
    childrenJSX = element.children.map((child) => generateJSX(child, indentLevel + 1)).join("\n")
  }

  // Text content
  const textContent = element.textContent || ""

  // Generate the JSX
  if (element.children && element.children.length > 0) {
    return `${indent}<${tag} ${props}>\n${textContent}${childrenJSX}\n${indent}</${tag}>`
  } else if (textContent) {
    return `${indent}<${tag} ${props}>${textContent}</${tag}>`
  } else {
    return `${indent}<${tag} ${props} />`
  }
}

// Add these helper functions

const generateAnimationProps = (animations: any): string => {
  if (!animations || !animations.enabled) return ""

  const { type, duration, delay, repeat, ease, trigger, direction, angle, distance, intensity } = animations

  let variantsObj: any = {}
  let animationTriggerProps: any = {}

  // Generate variants based on animation type
  switch (type) {
    case "fade":
      variantsObj = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        hover: { opacity: 0.7 },
        tap: { opacity: 0.5 },
      }
      break
    case "slide":
      // Handle different slide directions
      if (direction === "left" || !direction) {
        variantsObj = {
          hidden: { x: -(distance || 100), opacity: 0 },
          visible: { x: 0, opacity: 1 },
          hover: { x: -(distance || 100) * 0.1 },
          tap: { x: -(distance || 100) * 0.05 },
        }
      } else if (direction === "right") {
        variantsObj = {
          hidden: { x: distance || 100, opacity: 0 },
          visible: { x: 0, opacity: 1 },
          hover: { x: (distance || 100) * 0.1 },
          tap: { x: (distance || 100) * 0.05 },
        }
      } else if (direction === "up") {
        variantsObj = {
          hidden: { y: -(distance || 100), opacity: 0 },
          visible: { y: 0, opacity: 1 },
          hover: { y: -(distance || 100) * 0.1 },
          tap: { y: -(distance || 100) * 0.05 },
        }
      } else if (direction === "down") {
        variantsObj = {
          hidden: { y: distance || 100, opacity: 0 },
          visible: { y: 0, opacity: 1 },
          hover: { y: (distance || 100) * 0.1 },
          tap: { y: (distance || 100) * 0.05 },
        }
      }
      break
    // Add other animation types...
  }

  // Generate animation trigger props based on trigger type
  switch (trigger) {
    case "load":
      animationTriggerProps = {
        initial: "hidden",
        animate: "visible",
      }
      break
    case "hover":
      animationTriggerProps = {
        whileHover: "hover",
      }
      break
    case "click":
      animationTriggerProps = {
        whileTap: "tap",
      }
      break
    case "inView":
      animationTriggerProps = {
        initial: "hidden",
        whileInView: "visible",
        viewport: { once: false, amount: 0.3 },
      }
      break
  }

  // Combine all props
  const transitionObj = {
    duration: duration / 1000,
    delay: delay / 1000,
    repeat: repeat === -1 ? "Infinity" : repeat,
    ease,
  }

  // Convert to string format for JSX
  return `
    variants={${JSON.stringify(variantsObj)}}
    ${Object.entries(animationTriggerProps)
      .map(([key, value]) => `${key}=${typeof value === "string" ? `"${value}"` : `{${JSON.stringify(value)}}`}`)
      .join(" ")}
    transition={${JSON.stringify(transitionObj)}}
  `
}

const generateComponentJSX = (element: ParsedElement, indentLevel: number): string => {
  const indent = "  ".repeat(indentLevel)
  const { componentInfo, className, style, attributes, textContent, children } = element

  if (!componentInfo) return ""

  let componentJSX = `${indent}<${componentInfo.importName}`

  // Add className
  if (className) {
    componentJSX += ` className="${className}"`
  }

  // Add style
  if (style && Object.keys(style).length > 0) {
    const styleStr = Object.entries(style)
      .map(([key, value]) => `${key}: '${value}'`)
      .join(", ")
    componentJSX += ` style={{ ${styleStr} }}`
  }

  // Add attributes
  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      // For numeric attributes, don't use quotes
      const numericAttributes = ["width", "height", "size", "strokeWidth"]
      if (numericAttributes.includes(key)) {
        componentJSX += ` ${key}={${value}}`
      } else {
        componentJSX += ` ${key}="${value}"`
      }
    })
  }

  // Close the tag
  if (textContent) {
    componentJSX += `>${textContent}</${componentInfo.importName}>`
  } else if (children && children.length > 0) {
    componentJSX += `>\n`
    componentJSX += children.map((child) => generateJSX(child, indentLevel + 1)).join("\n")
    componentJSX += `\n${indent}</${componentInfo.importName}>`
  } else {
    componentJSX += ` />`
  }

  return componentJSX
}

export const useJsxParser = () => {
  const parseToJSX = (elements: ParsedElement[]): string => {
    return elements.map((element) => generateJSX(element)).join("\n")
  }

  return { parseToJSX }
}

