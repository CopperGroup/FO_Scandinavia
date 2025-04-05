"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import type { ParsedElement } from "@/types/editor"
import { Play, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface AnimationPreviewProps {
  element: ParsedElement
  isOpen: boolean
  onClose: () => void
}

const AnimationPreview: React.FC<AnimationPreviewProps> = ({ element, isOpen, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [key, setKey] = useState(0)
  const isSelfClosingRef = useRef(false)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      setIsPlaying(true)
    } else {
      setIsPlaying(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (isSelfClosingRef.current && isPlaying) {
      toast({
        title: "Self-closing element detected",
        description: "Self-closing elements can't be animated directly. Consider wrapping it in a div element.",
        variant: "destructive",
      })
    }
  }, [isPlaying])

  const resetAnimation = () => {
    setIsPlaying(false)
    setTimeout(() => {
      setKey((prev) => prev + 1)
      setIsPlaying(true)
    }, 100)
  }

  if (!element.animations?.enabled) {
    return null
  }

  const previewContent = () => {
    if (!element) return null

    // Create a copy of the element with animations enabled
    const previewElement = {
      ...element,
      animations: {
        ...element.animations,
        enabled: true,
      },
    }

    // Check if element is a self-closing tag
    const selfClosingTags = [
      "img",
      "input",
      "br",
      "hr",
      "meta",
      "link",
      "area",
      "base",
      "col",
      "embed",
      "source",
      "track",
      "wbr",
    ]
    const isSelfClosing = selfClosingTags.includes(element.type.toLowerCase())
    isSelfClosingRef.current = isSelfClosing

    // Create the appropriate motion component based on the element type
    const MotionComponent = motion[element.type as keyof typeof motion] || motion.div

    // Set up animation props based on animation type
    const getAnimationProps = () => {
      if (!previewElement.animations) return {}

      const { type, duration, delay, repeat, ease, direction, angle, distance, intensity } = previewElement.animations
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

      // For preview, we always use "load" trigger to show the animation
      return {
        initial: "hidden",
        animate: "visible",
        variants,
        transition,
      }
    }

    // Get animation props
    const animationProps = getAnimationProps()

    // Render the preview with the appropriate element type
    return (
      <div className="flex items-center justify-center w-full h-full p-8">
        {isSelfClosing ? (
          <MotionComponent
            key={key}
            className={element.className || "p-4 bg-gray-100 rounded-md"}
            style={element.style || {}}
            {...animationProps}
            {...(element.props || {})}
          />
        ) : (
          <MotionComponent
            key={key}
            className={element.className || "p-4 bg-gray-100 rounded-md"}
            style={element.style || {}}
            {...animationProps}
          >
            {element.textContent || ""}
          </MotionComponent>
        )}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base">Animation Preview</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center items-center p-4 bg-gray-50 rounded-md min-h-[180px] border-2 border-dashed border-red-400">
          {previewContent()}
        </div>
        <DialogFooter className="flex justify-between pt-2">
          <Button variant="outline" onClick={onClose} size="sm">
            <X className="h-4 w-4 mr-1" />
            Close
          </Button>
          <Button onClick={resetAnimation} className="bg-gray-800 hover:bg-gray-900" size="sm">
            <Play className="h-4 w-4 mr-1" />
            Replay
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AnimationPreview

