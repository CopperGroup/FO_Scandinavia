import type { ActivePixels, PixelEventKey } from "@/lib/pixels/shared"

/**
 * Advertising pixels on the storefront (browser only).
 *
 * The active pixels come from the server with the page (see
 * components/pixel/FacebookPixel.tsx), so nothing is fetched here. Events sent
 * before the pixels are set up wait in a short queue instead of being lost.
 */

type EventData = Record<string, unknown>

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    _fbq?: unknown
    ttq?: any
    TiktokAnalyticsObject?: string
  }
}

let config: ActivePixels | null = null
const waiting: [string, EventData][] = []
const MAX_WAITING = 20

/** Which switch of the admin page governs an event. "Contact" (the phone and messenger buttons) counts as a lead. */
function switchFor(eventName: string): PixelEventKey {
  if (eventName === "Contact") return "lead"
  return (eventName.charAt(0).toLowerCase() + eventName.slice(1)) as PixelEventKey
}

/** TikTok calls some of the standard events differently. */
const TIKTOK_EVENT: Record<string, string> = {
  Purchase: "CompletePayment",
  Lead: "SubmitForm",
  Contact: "Contact",
}

function loadMeta(pixelId: string) {
  if (!window.fbq) {
    // The standard Meta base code: a queue that fbevents.js picks up once it has loaded.
    const fbq: any = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod.apply(fbq, args)
      else fbq.queue.push(args)
    }
    fbq.push = fbq
    fbq.loaded = true
    fbq.version = "2.0"
    fbq.queue = []
    window.fbq = fbq
    if (!window._fbq) window._fbq = fbq
    const script = document.createElement("script")
    script.async = true
    script.src = "https://connect.facebook.net/en_US/fbevents.js"
    document.head.appendChild(script)
  }
  window.fbq!("init", pixelId)
}

function loadTikTok(pixelId: string) {
  if (!window.ttq) {
    // The standard TikTok base code: method calls are queued until events.js has loaded.
    const name = "ttq"
    window.TiktokAnalyticsObject = name
    const ttq: any = (window.ttq = [])
    ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"]
    ttq.setAndDefer = (target: any, method: string) => {
      target[method] = (...args: unknown[]) => target.push([method, ...args])
    }
    for (const method of ttq.methods) ttq.setAndDefer(ttq, method)
    ttq.instance = (id: string) => {
      const instance = ttq._i[id] || []
      for (const method of ttq.methods) ttq.setAndDefer(instance, method)
      return instance
    }
    ttq.load = (id: string, options?: Record<string, unknown>) => {
      const source = "https://analytics.tiktok.com/i18n/pixel/events.js"
      ttq._i = ttq._i || {}
      ttq._i[id] = []
      ttq._i[id]._u = source
      ttq._t = ttq._t || {}
      ttq._t[id] = Date.now()
      ttq._o = ttq._o || {}
      ttq._o[id] = options || {}
      const script = document.createElement("script")
      script.type = "text/javascript"
      script.async = true
      script.src = `${source}?sdkid=${encodeURIComponent(id)}&lib=${name}`
      document.head.appendChild(script)
    }
  }
  window.ttq.load(pixelId)
}

/** Meta's event data in the shape TikTok expects. */
function forTikTok(data: EventData): EventData {
  const ids = Array.isArray(data.content_ids) ? data.content_ids : data.content_ids ? [data.content_ids] : []
  const result: EventData = {}
  if (ids.length > 0) {
    result.contents = ids.map((id) => ({ content_id: String(id), content_type: "product", content_name: typeof data.content_name === "string" ? data.content_name : undefined }))
  }
  if (typeof data.value === "number") result.value = data.value
  if (typeof data.currency === "string") result.currency = data.currency
  return result
}

function send(eventName: string, data: EventData) {
  if (!config) return
  const key = switchFor(eventName)
  if (config.meta && config.meta.events[key] !== false) window.fbq?.("track", eventName, data)
  if (config.tiktok && config.tiktok.events[key] !== false) window.ttq?.track(TIKTOK_EVENT[eventName] ?? eventName, forTikTok(data))
}

/** Sets the pixels up once per page load and sends whatever was waiting. */
export function initPixels(active: ActivePixels) {
  if (typeof window === "undefined" || config) return
  config = active
  try {
    if (active.meta) loadMeta(active.meta.id)
    if (active.tiktok) loadTikTok(active.tiktok.id)
    for (const [eventName, data] of waiting.splice(0)) send(eventName, data)
  } catch (error) {
    console.error("[pixels] could not start:", error)
  }
}

/** A standard event ("AddToCart", "Purchase"…) to every active pixel that has it switched on. */
export function trackFacebookEvent(eventName: string, eventData: EventData = {}) {
  if (typeof window === "undefined") return
  if (!config) {
    if (waiting.length < MAX_WAITING) waiting.push([eventName, eventData])
    return
  }
  try {
    send(eventName, eventData)
  } catch (error) {
    console.error("[pixels] could not send an event:", error)
  }
}

/** One page view; call it on every navigation. */
export function trackPageView() {
  if (typeof window === "undefined" || !config) return
  try {
    if (config.meta) window.fbq?.("track", "PageView")
    if (config.tiktok) window.ttq?.page()
  } catch (error) {
    console.error("[pixels] could not send a page view:", error)
  }
}
