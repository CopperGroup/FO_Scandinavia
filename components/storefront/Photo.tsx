"use client"

import Image, { type ImageProps } from "next/image"
import { useState } from "react"
import { cn } from "@/lib/utils"

const SAMPLE = 24
/** How far the four corners may differ (per colour channel, of 255) and still count as one flat background. */
const TOLERANCE = 14

/**
 * The background colour of a studio photo: the colour its four corners share,
 * or null when they differ (a photo taken outdoors, a product cut by the edge)
 * or cannot be read (a transparent picture, an image from another origin).
 */
export function photoBackdrop(image: HTMLImageElement): string | null {
  try {
    if (!image.naturalWidth) return null
    const canvas = document.createElement("canvas")
    canvas.width = SAMPLE
    canvas.height = SAMPLE
    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (!context) return null
    context.drawImage(image, 0, 0, SAMPLE, SAMPLE)
    const { data } = context.getImageData(0, 0, SAMPLE, SAMPLE)

    const last = SAMPLE - 1
    const corners = [
      [0, 0],
      [last, 0],
      [0, last],
      [last, last],
    ].map(([x, y]) => {
      const at = (y * SAMPLE + x) * 4
      return [data[at], data[at + 1], data[at + 2], data[at + 3]]
    })
    if (corners.some((corner) => corner[3] < 250)) return null

    const channel = (index: number) => corners.map((corner) => corner[index])
    for (let index = 0; index < 3; index++) {
      const values = channel(index)
      if (Math.max(...values) - Math.min(...values) > TOLERANCE) return null
    }
    const mean = (index: number) => Math.round(channel(index).reduce((sum, value) => sum + value, 0) / corners.length)
    return `rgb(${mean(0)} ${mean(1)} ${mean(2)})`
  } catch {
    // A canvas that holds a picture from another origin cannot be read.
    return null
  }
}

type Props = Omit<ImageProps, "fill" | "onLoad" | "width" | "height"> & {
  /** Classes of the box the photo fills (it covers its positioned parent). */
  frameClassName?: string
  /** Told the background colour once the photo has loaded (null: no flat background). */
  onBackdrop?: (color: string | null) => void
}

/**
 * A product photo shown whole inside a frame of another shape.
 *
 * Suppliers shoot on white, on light grey, on beige. Shown whole in a white
 * frame, a grey photo leaves two white bands beside it. Here the frame takes
 * the photo's own background colour, so the photo looks as if it fills it.
 */
export default function Photo({ frameClassName, className, onBackdrop, alt, ...props }: Props) {
  const [backdrop, setBackdrop] = useState<string | null>(null)

  return (
    <span className={cn("absolute inset-0 block", frameClassName)} style={backdrop ? { backgroundColor: backdrop } : undefined}>
      <Image
        {...props}
        alt={alt}
        fill
        className={cn("object-contain", className)}
        onLoad={(event) => {
          const color = photoBackdrop(event.currentTarget)
          setBackdrop(color)
          onBackdrop?.(color)
        }}
      />
    </span>
  )
}
