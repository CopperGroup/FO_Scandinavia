"use client"

import React from "react"
import { motion } from "framer-motion"
import type { ParsedElement } from "@/types/editor"

interface AnimationRendererProps {
  element: ParsedElement
  children: React.ReactNode
  isEditMode: boolean
}

const AnimationRenderer: React.FC<AnimationRendererProps> = ({ element, children, isEditMode }) => {
  const useMotion = !isEditMode && element.animations?.enabled

  if (!useMotion || !React.isValidElement(children)) {
    return <>{children}</>
  }

  // Get animation trigger
  const trigger = element.animations?.trigger || "load"

  // Set up animation props based on animation type
  const getAnimationProps = () => {
    if (!element.animations || !element.animations.enabled) return {}

    const { type, duration, delay, repeat, ease, direction, angle, distance, intensity } = element.animations
    const transition = {
      duration,
      delay,
      repeat: repeat || 0,
      ease,
    }

    // Base animation variants
    let variants: any = {}

    switch (type) {
      case "fade":
        variants = {
          hidden: { opacity: 0 },
          visible: { opacity: 1 },
        }
        break
      case "slide":
        // Handle different slide directions
        if (direction === "left" || !direction) {
          variants = {
            hidden: { x: -(distance || 100), opacity: 0 },
            visible: { x: 0, opacity: 1 },
          }
        } else if (direction === "right") {
          variants = {
            hidden: { x: distance || 100, opacity: 0 },
            visible: { x: 0, opacity: 1 },
          }
        } else if (direction === "up") {
          variants = {
            hidden: { y: -(distance || 100), opacity: 0 },
            visible: { y: 0, opacity: 1 },
          }
        } else if (direction === "down") {
          variants = {
            hidden: { y: distance || 100, opacity: 0 },
            visible: { y: 0, opacity: 1 },
          }
        }
        break
      case "scale":
        if (direction === "out") {
          variants = {
            hidden: { scale: (intensity || 1) + 1, opacity: 0 },
            visible: { scale: 1, opacity: 1 },
          }
        } else {
          variants = {
            hidden: { scale: 0, opacity: 0 },
            visible: { scale: 1, opacity: 1 },
          }
        }
        break
      case "rotate":
        variants = {
          hidden: { rotate: -(angle || 180), opacity: 0 },
          visible: { rotate: 0, opacity: 1 },
        }
        break
      case "bounce":
        // For bounce, we use a special animation
        return {
          animate: {
            y: [0, -(distance || 20), 0],
            transition: {
              duration,
              delay,
              repeat: repeat || Number.POSITIVE_INFINITY,
              ease,
              times: [0, 0.5, 1],
            },
          },
        }
      case "pulse":
        return {
          animate: {
            scale: [1, intensity || 1.1, 1],
            transition: {
              duration,
              delay,
              repeat: repeat || Number.POSITIVE_INFINITY,
              ease,
              times: [0, 0.5, 1],
            },
          },
        }
      case "flip":
        if (direction === "y") {
          return {
            animate: {
              rotateY: [0, 180, 360],
              transition: {
                duration,
                delay,
                repeat: repeat || 0,
                ease,
              },
            },
          }
        } else {
          return {
            animate: {
              rotateX: [0, 180, 360],
              transition: {
                duration,
                delay,
                repeat: repeat || 0,
                ease,
              },
            },
          }
        }
      default:
        variants = {
          hidden: { opacity: 0 },
          visible: { opacity: 1 },
        }
    }

    // Handle different triggers
    switch (trigger) {
      case "load":
        return {
          initial: "hidden",
          animate: "visible",
          variants,
          transition,
        }
      case "hover":
        return {
          initial: "visible",
          whileHover: "hidden",
          variants,
          transition,
        }
      case "click":
        return {
          initial: "visible",
          whileTap: "hidden",
          variants,
          transition,
        }
      case "inView":
        return {
          initial: "hidden",
          whileInView: "visible",
          viewport: { once: false, amount: 0.3 },
          variants,
          transition,
        }
      default:
        return {
          initial: "hidden",
          animate: "visible",
          variants,
          transition,
        }
    }
  }

  // Get animation props
  const animationProps = getAnimationProps()

  // Create the appropriate motion component based on the element type
  const MotionComponent = motion[element.type as keyof typeof motion] || motion.div

  // Extract the props from the children
  const { className, style, children: childrenContent, ...otherProps } = children.props

  // Clone the element with motion props
  return (
    <MotionComponent className={className} style={style} {...otherProps} {...animationProps}>
      {childrenContent}
    </MotionComponent>
  )
}

export default React.memo(AnimationRenderer)

