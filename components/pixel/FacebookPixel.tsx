"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { initPixels, trackPageView } from "@/helpers/pixel"
import type { ActivePixels } from "@/lib/pixels/shared"

/**
 * Starts the active advertising pixels (Meta, TikTok) and reports a page view
 * on every navigation. The pixels arrive from the server with the page, so the
 * shop makes no request of its own to learn which ones are on.
 */
// The last path reported as a page view: an effect that runs twice for one page must not count it twice.
let reportedPath: string | null = null

export default function FacebookPixel({ pixels }: { pixels: ActivePixels }) {
  const pathname = usePathname()

  useEffect(() => {
    initPixels(pixels)
    if (reportedPath === pathname) return
    reportedPath = pathname
    trackPageView()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return null
}
