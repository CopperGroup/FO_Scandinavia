"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { parseWidth, getActiveBreakpoints } from "@/lib/responsive-simulator"

interface ResponsiveContainerProps {
  width: string
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({ width, children, style = {}, className = "" }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // Update data attributes when width changes
  useEffect(() => {
    if (!containerRef.current) return

    const updateResponsiveAttributes = () => {
      const container = containerRef.current
      if (!container) return

      // Get container width (either from props or actual element width)
      const numericWidth = parseWidth(width)
      const actualWidth = container.getBoundingClientRect().width

      // Use the actual width for calculations to ensure accuracy
      const effectiveWidth = Math.min(numericWidth, actualWidth)

      // Clear all breakpoint attributes
      container.removeAttribute("data-bp-sm")
      container.removeAttribute("data-bp-md")
      container.removeAttribute("data-bp-lg")
      container.removeAttribute("data-bp-xl")
      container.removeAttribute("data-bp-2xl")

      // Set data-width attribute
      container.setAttribute("data-width", effectiveWidth.toString())

      // Set breakpoint attributes based on width
      const activeBreakpoints = getActiveBreakpoints(effectiveWidth)
      activeBreakpoints.forEach((bp) => {
        container.setAttribute(`data-bp-${bp}`, "true")
      })
    }

    // Run once on mount
    updateResponsiveAttributes()

    // Create a ResizeObserver to monitor size changes
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateResponsiveAttributes)
      observer.observe(containerRef.current)

      // Cleanup
      return () => {
        if (containerRef.current) {
          observer.unobserve(containerRef.current)
        }
      }
    }
  }, [width])

  return (
    <div
      ref={containerRef}
      className={`responsive-container @container ${className}`}
      data-responsive-container
      style={{
        width,
        overflow: "auto",
        marginLeft: "auto",
        marginRight: "auto",
        height: "100%",
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export default ResponsiveContainer

