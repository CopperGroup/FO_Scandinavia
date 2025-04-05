"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ZoomIn,
  MoveHorizontal,
  Maximize2,
  Minimize2,
  RotateCw,
  MoveVertical,
  Zap,
  Sparkles,
  Wand2,
  Clock,
  Repeat,
  Play,
  Loader2,
  Hand,
  MousePointerClick,
  Eye,
} from "lucide-react"
import type { ParsedElement } from "@/types/editor"
import AnimationPreview from "../animation-preview"
import { cn } from "@/lib/utils"

interface AnimationEditorProps {
  element: ParsedElement
  updateElement: (updatedElement: ParsedElement) => void
  useDelayedUpdate?: boolean
}

const AnimationEditor: React.FC<AnimationEditorProps> = ({ element, updateElement, useDelayedUpdate = false }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("type")
  const [animationKey, setAnimationKey] = useState(0)

  // Add local state for animation properties
  const [localAnimations, setLocalAnimations] = useState(
    element.animations || {
      type: "fade",
      duration: 0.5,
      delay: 0,
      repeat: 0,
      ease: "easeInOut",
      enabled: false,
      trigger: "load",
      direction: "left",
      angle: 180,
      distance: 100,
      intensity: 1,
    },
  )

  // Update local state when element changes
  useEffect(() => {
    setLocalAnimations(
      element.animations || {
        type: "fade",
        duration: 0.5,
        delay: 0,
        repeat: 0,
        ease: "easeInOut",
        enabled: false,
        trigger: "load",
        direction: "left",
        angle: 180,
        distance: 100,
        intensity: 1,
      },
    )
  }, [element])

  const handleAnimationChange = (key: string, value: any) => {
    // Update local state immediately
    setLocalAnimations((prev) => ({
      ...prev,
      [key]: value,
    }))

    // If not using delayed updates or for certain properties that should update immediately
    // (like enabled, type, trigger), update the element immediately
    if (!useDelayedUpdate || ["enabled", "type", "trigger", "ease"].includes(key)) {
      const updatedElement = {
        ...element,
        animations: {
          ...(element.animations || {
            type: "fade",
            duration: 0.5,
            delay: 0,
            repeat: 0,
            ease: "easeInOut",
            enabled: false,
            trigger: "load",
            direction: "left",
            angle: 180,
            distance: 100,
            intensity: 1,
          }),
          [key]: value,
        },
      }

      // If enabling animations and no type is selected, set a default type
      if (
        key === "enabled" &&
        value === true &&
        (!updatedElement.animations.type || updatedElement.animations.type === "")
      ) {
        updatedElement.animations.type = "fade"
      }

      updateElement(updatedElement)

      // Force animation to restart
      setAnimationKey((prev) => prev + 1)
    }
  }

  const applyChanges = () => {
    if (useDelayedUpdate) {
      const updatedElement = {
        ...element,
        animations: localAnimations,
      }
      updateElement(updatedElement)

      // Force animation to restart
      setAnimationKey((prev) => prev + 1)
    }
  }

  const handlePreviewAnimation = () => {
    setIsPreviewOpen(true)
  }

  // Get animation type options based on the current type
  const getAnimationTypeOptions = () => {
    const baseTypes = [
      { value: "fade", label: "Fade", icon: <ZoomIn className="h-4 w-4 mr-2" /> },
      { value: "slide", label: "Slide", icon: <MoveHorizontal className="h-4 w-4 mr-2" /> },
      { value: "scale", label: "Scale", icon: <Maximize2 className="h-4 w-4 mr-2" /> },
      { value: "rotate", label: "Rotate", icon: <RotateCw className="h-4 w-4 mr-2" /> },
      { value: "bounce", label: "Bounce", icon: <MoveVertical className="h-4 w-4 mr-2" /> },
      { value: "pulse", label: "Pulse", icon: <Zap className="h-4 w-4 mr-2" /> },
      { value: "flip", label: "Flip", icon: <Sparkles className="h-4 w-4 mr-2" /> },
    ]

    return baseTypes
  }

  // Render animation subsettings based on the selected animation type
  const renderAnimationSubsettings = () => {
    if (!localAnimations.type) return null

    switch (localAnimations.type) {
      case "slide":
        return (
          <div className="mt-3 space-y-3 border-t pt-3">
            <Label className="text-xs font-medium">Slide Direction</Label>
            <RadioGroup
              value={localAnimations.direction || "left"}
              onValueChange={(value) => handleAnimationChange("direction", value)}
              className="grid grid-cols-2 gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="left" id="slide-left" className="h-4 w-4" />
                <Label htmlFor="slide-left" className="text-xs flex items-center">
                  <ArrowLeft className="h-3 w-3 mr-1" /> Left
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="right" id="slide-right" className="h-4 w-4" />
                <Label htmlFor="slide-right" className="text-xs flex items-center">
                  <ArrowRight className="h-3 w-3 mr-1" /> Right
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="up" id="slide-up" className="h-4 w-4" />
                <Label htmlFor="slide-up" className="text-xs flex items-center">
                  <ArrowUp className="h-3 w-3 mr-1" /> Up
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="down" id="slide-down" className="h-4 w-4" />
                <Label htmlFor="slide-down" className="text-xs flex items-center">
                  <ArrowDown className="h-3 w-3 mr-1" /> Down
                </Label>
              </div>
            </RadioGroup>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Distance</Label>
                <span className="text-xs">{localAnimations.distance || 100}px</span>
              </div>
              <Slider
                value={[localAnimations.distance || 100]}
                min={10}
                max={500}
                step={10}
                onValueChange={(value) => handleAnimationChange("distance", value[0])}
                onValueCommit={applyChanges}
              />
            </div>
          </div>
        )

      case "rotate":
        return (
          <div className="mt-3 space-y-3 border-t pt-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Rotation Angle</Label>
                <span className="text-xs">{localAnimations.angle || 180}°</span>
              </div>
              <Slider
                value={[localAnimations.angle || 180]}
                min={-360}
                max={360}
                step={15}
                onValueChange={(value) => handleAnimationChange("angle", value[0])}
                onValueCommit={applyChanges}
              />
            </div>
          </div>
        )

      case "scale":
        return (
          <div className="mt-3 space-y-3 border-t pt-3">
            <RadioGroup
              value={localAnimations.direction || "in"}
              onValueChange={(value) => handleAnimationChange("direction", value)}
              className="grid grid-cols-2 gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="in" id="scale-in" className="h-4 w-4" />
                <Label htmlFor="scale-in" className="text-xs flex items-center">
                  <Maximize2 className="h-3 w-3 mr-1" /> Scale In
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="out" id="scale-out" className="h-4 w-4" />
                <Label htmlFor="scale-out" className="text-xs flex items-center">
                  <Minimize2 className="h-3 w-3 mr-1" /> Scale Out
                </Label>
              </div>
            </RadioGroup>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Scale Intensity</Label>
                <span className="text-xs">{localAnimations.intensity || 1}x</span>
              </div>
              <Slider
                value={[localAnimations.intensity || 1]}
                min={0.1}
                max={3}
                step={0.1}
                onValueChange={(value) => handleAnimationChange("intensity", value[0])}
                onValueCommit={applyChanges}
              />
            </div>
          </div>
        )

      case "bounce":
        return (
          <div className="mt-3 space-y-3 border-t pt-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Bounce Height</Label>
                <span className="text-xs">{localAnimations.distance || 20}px</span>
              </div>
              <Slider
                value={[localAnimations.distance || 20]}
                min={5}
                max={100}
                step={5}
                onValueChange={(value) => handleAnimationChange("distance", value[0])}
                onValueCommit={applyChanges}
              />
            </div>
          </div>
        )

      case "pulse":
        return (
          <div className="mt-3 space-y-3 border-t pt-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Pulse Intensity</Label>
                <span className="text-xs">{localAnimations.intensity || 1.1}x</span>
              </div>
              <Slider
                value={[localAnimations.intensity || 1.1]}
                min={1.05}
                max={1.5}
                step={0.05}
                onValueChange={(value) => handleAnimationChange("intensity", value[0])}
                onValueCommit={applyChanges}
              />
            </div>
          </div>
        )

      case "flip":
        return (
          <div className="mt-3 space-y-3 border-t pt-3">
            <Label className="text-xs font-medium">Flip Direction</Label>
            <RadioGroup
              value={localAnimations.direction || "x"}
              onValueChange={(value) => handleAnimationChange("direction", value)}
              className="grid grid-cols-2 gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="x" id="flip-x" className="h-4 w-4" />
                <Label htmlFor="flip-x" className="text-xs flex items-center">
                  <MoveHorizontal className="h-3 w-3 mr-1" /> Horizontal
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="y" id="flip-y" className="h-4 w-4" />
                <Label htmlFor="flip-y" className="text-xs flex items-center">
                  <MoveVertical className="h-3 w-3 mr-1" /> Vertical
                </Label>
              </div>
            </RadioGroup>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-4 py-2">
      <div className="bg-white rounded-lg p-3 border shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="bg-gray-100 p-1.5 rounded-md">
              <Wand2 className="h-4 w-4 text-gray-600" />
            </div>
            <Label htmlFor="animation-enabled" className="text-sm font-medium">
              Enable Animation
            </Label>
          </div>
          <Switch
            id="animation-enabled"
            checked={localAnimations.enabled}
            onCheckedChange={(checked) => handleAnimationChange("enabled", checked)}
          />
        </div>

        {localAnimations.enabled && (
          <>
            {/* Animation Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-2">
              <TabsList className="grid w-full grid-cols-4 bg-gray-50 h-8">
                <TabsTrigger value="type" className="text-xs">
                  Type
                </TabsTrigger>
                <TabsTrigger value="trigger" className="text-xs">
                  Trigger
                </TabsTrigger>
                <TabsTrigger value="timing" className="text-xs">
                  Timing
                </TabsTrigger>
                <TabsTrigger value="easing" className="text-xs">
                  Easing
                </TabsTrigger>
              </TabsList>

              {/* Animation Type Tab */}
              <TabsContent value="type" className="p-3 space-y-3 mt-2 bg-white rounded-md border">
                <div className="grid grid-cols-2 gap-2">
                  {getAnimationTypeOptions().map((type) => (
                    <Button
                      key={type.value}
                      variant={localAnimations.type === type.value ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "justify-start h-8 text-xs",
                        localAnimations.type === type.value
                          ? "bg-gray-800 hover:bg-gray-900 text-white"
                          : "border-gray-200 text-gray-800 hover:bg-gray-50",
                      )}
                      onClick={() => handleAnimationChange("type", type.value)}
                    >
                      {type.icon}
                      {type.label}
                    </Button>
                  ))}
                </div>

                {/* Animation subsettings based on type */}
                {renderAnimationSubsettings()}
              </TabsContent>

              {/* Trigger Tab */}
              <TabsContent value="trigger" className="p-3 space-y-3 mt-2 bg-white rounded-md border">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={localAnimations.trigger === "load" ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "justify-start h-8 text-xs",
                      localAnimations.trigger === "load"
                        ? "bg-gray-800 hover:bg-gray-900 text-white"
                        : "border-gray-200 text-gray-800 hover:bg-gray-50",
                    )}
                    onClick={() => handleAnimationChange("trigger", "load")}
                  >
                    <Loader2 className="h-4 w-4 mr-2" />
                    On Load
                  </Button>
                  <Button
                    variant={localAnimations.trigger === "hover" ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "justify-start h-8 text-xs",
                      localAnimations.trigger === "hover"
                        ? "bg-gray-800 hover:bg-gray-900 text-white"
                        : "border-gray-200 text-gray-800 hover:bg-gray-50",
                    )}
                    onClick={() => handleAnimationChange("trigger", "hover")}
                  >
                    <Hand className="h-4 w-4 mr-2" />
                    On Hover
                  </Button>
                  <Button
                    variant={localAnimations.trigger === "click" ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "justify-start h-8 text-xs",
                      localAnimations.trigger === "click"
                        ? "bg-gray-800 hover:bg-gray-900 text-white"
                        : "border-gray-200 text-gray-800 hover:bg-gray-50",
                    )}
                    onClick={() => handleAnimationChange("trigger", "click")}
                  >
                    <MousePointerClick className="h-4 w-4 mr-2" />
                    On Click
                  </Button>
                  <Button
                    variant={localAnimations.trigger === "inView" ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "justify-start h-8 text-xs",
                      localAnimations.trigger === "inView"
                        ? "bg-gray-800 hover:bg-gray-900 text-white"
                        : "border-gray-200 text-gray-800 hover:bg-gray-50",
                    )}
                    onClick={() => handleAnimationChange("trigger", "inView")}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    In View
                  </Button>
                </div>
              </TabsContent>

              {/* Timing Tab */}
              <TabsContent value="timing" className="p-3 space-y-4 mt-2 bg-white rounded-md border">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-gray-100 p-1 rounded-md">
                        <Clock className="h-3 w-3 text-gray-600" />
                      </div>
                      <Label className="text-xs font-medium">Duration</Label>
                    </div>
                    <span className="text-xs font-medium bg-gray-50 px-2 py-1 rounded-md text-gray-700">
                      {localAnimations.duration}s
                    </span>
                  </div>
                  <Slider
                    value={[localAnimations.duration * 10]}
                    min={1}
                    max={30}
                    step={1}
                    onValueChange={(value) => handleAnimationChange("duration", value[0] / 10)}
                    onValueCommit={applyChanges}
                    className="py-1"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-gray-100 p-1 rounded-md">
                        <Clock className="h-3 w-3 text-gray-600" />
                      </div>
                      <Label className="text-xs font-medium">Delay</Label>
                    </div>
                    <span className="text-xs font-medium bg-gray-50 px-2 py-1 rounded-md text-gray-700">
                      {localAnimations.delay}s
                    </span>
                  </div>
                  <Slider
                    value={[localAnimations.delay * 10]}
                    min={0}
                    max={30}
                    step={1}
                    onValueChange={(value) => handleAnimationChange("delay", value[0] / 10)}
                    onValueCommit={applyChanges}
                    className="py-1"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-gray-100 p-1 rounded-md">
                      <Repeat className="h-3 w-3 text-gray-600" />
                    </div>
                    <Label className="text-xs font-medium">Repeat</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={localAnimations.repeat}
                      onChange={(e) => handleAnimationChange("repeat", Number.parseInt(e.target.value) || 0)}
                      className="w-20 h-8 text-sm border-gray-200 focus-visible:ring-gray-500"
                    />
                    <span className="text-xs text-gray-600">(0 = no repeat, Infinity = loop forever)</span>
                  </div>
                </div>
              </TabsContent>

              {/* Easing Tab */}
              <TabsContent value="easing" className="p-3 space-y-3 mt-2 bg-white rounded-md border">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Easing Function</Label>
                  <Select value={localAnimations.ease} onValueChange={(value) => handleAnimationChange("ease", value)}>
                    <SelectTrigger className="h-8 text-sm border-gray-200 focus:ring-gray-500">
                      <SelectValue placeholder="Select easing" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linear">Linear</SelectItem>
                      <SelectItem value="easeIn">Ease In</SelectItem>
                      <SelectItem value="easeOut">Ease Out</SelectItem>
                      <SelectItem value="easeInOut">Ease In Out</SelectItem>
                      <SelectItem value="circIn">Circular In</SelectItem>
                      <SelectItem value="circOut">Circular Out</SelectItem>
                      <SelectItem value="circInOut">Circular In Out</SelectItem>
                      <SelectItem value="backIn">Back In</SelectItem>
                      <SelectItem value="backOut">Back Out</SelectItem>
                      <SelectItem value="backInOut">Back In Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Easing visualization */}
                <div className="pt-2">
                  <EasingVisualization
                    ease={localAnimations.ease}
                    animationKey={animationKey}
                    onPlay={() => setAnimationKey((prev) => prev + 1)}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Preview Button */}
            <div className="mt-4">
              <Button
                onClick={handlePreviewAnimation}
                className="w-full bg-gray-800 hover:bg-gray-900 text-white"
                size="sm"
              >
                <Play className="h-4 w-4 mr-2" />
                Preview Animation
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Animation Preview Dialog */}
      <AnimationPreview element={element} isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} />
    </div>
  )
}

// Separate component for easing visualization
const EasingVisualization: React.FC<{
  ease: string
  animationKey: number
  onPlay: () => void
}> = ({ ease, animationKey, onPlay }) => {
  const ballRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // Get the path for the current easing function
  const getPathForEasing = (easing: string) => {
    switch (easing) {
      case "linear":
        return "M0,50 L200,0"
      case "easeIn":
        return "M0,50 Q100,50 200,0"
      case "easeOut":
        return "M0,50 Q100,0 200,0"
      case "easeInOut":
        return "M0,50 C50,50 150,0 200,0"
      case "circIn":
        return "M0,50 C150,50 180,0 200,0"
      case "circOut":
        return "M0,50 C20,0 50,0 200,0"
      case "circInOut":
        return "M0,50 C40,50 60,0 100,0 S160,0 200,0"
      case "backIn":
        return "M0,50 C60,50 120,70 160,0 S180,0 200,0"
      case "backOut":
        return "M0,50 C20,0 40,-20 80,0 S180,0 200,0"
      case "backInOut":
        return "M0,50 C30,60 50,70 80,30 S120,-10 160,30 S180,0 200,0"
      default:
        return "M0,50 L200,0"
    }
  }

  // Play the animation
  const playAnimation = () => {
    if (ballRef.current) {
      // Reset animation
      ballRef.current.style.animation = "none"
      void ballRef.current.offsetWidth // Force reflow

      // Set new animation
      const animationType =
        ease === "linear" ? `ballAnimation 2s ${ease} 1 forwards` : `followPath 2s ${ease} 1 forwards`

      ballRef.current.style.animation = animationType
      setIsPlaying(true)

      // Reset playing state after animation completes
      setTimeout(() => {
        setIsPlaying(false)
      }, 2000) // Match animation duration
    }
  }

  // Handle click on visualization
  const handleClick = () => {
    if (!isPlaying) {
      playAnimation()
      onPlay()
    }
  }

  // Update animation when easing changes
  useEffect(() => {
    if (ballRef.current) {
      ballRef.current.style.animation = "none"
    }
  }, [ease, animationKey])

  return (
    <div
      className="h-24 bg-gray-50 rounded-md border relative overflow-hidden cursor-pointer group"
      onClick={handleClick}
    >
      {/* Hover overlay with instruction */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs font-medium text-gray-600 bg-white/80 px-2 py-1 rounded-md shadow-sm">
          Click to preview
        </span>
      </div>

      {/* Path visualization */}
      <svg width="100%" height="100%" viewBox="0 0 200 50" preserveAspectRatio="none" className="absolute inset-0">
        <path d={getPathForEasing(ease)} stroke="rgba(0, 0, 0, 0.2)" strokeWidth="2" fill="none" />
      </svg>

      {/* Animated ball */}
      <div
        ref={ballRef}
        key={`ball-${animationKey}-${ease}`}
        className="h-4 w-4 rounded-full bg-blue-500 absolute bottom-0 left-0"
        style={{
          offsetPath: ease !== "linear" ? `path('${getPathForEasing(ease)}')` : "none",
        }}
      />

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes ballAnimation {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(100% - 16px)); }
        }
        
        @keyframes followPath {
          0% { offset-distance: 0%; }
          100% { offset-distance: 100%; }
        }
      `}</style>
    </div>
  )
}

export default AnimationEditor

