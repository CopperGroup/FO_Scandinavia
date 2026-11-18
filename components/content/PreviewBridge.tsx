"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Lives in the storefront only while it is shown inside the page editor of
 * the admin panel (the layout renders it for a preview request). It lets the
 * editor and the page talk:
 *
 *   editor → page   "refresh": the texts changed, draw them again;
 *                   "focus":   the admin is in this field, show where it is;
 *   page → editor   "ready":   the page is drawn;
 *                   "select":  the admin clicked this piece of text.
 *
 * Elements that hold editable text carry data-edit="<page>:<field>". In the
 * preview nothing navigates: a click only picks what to edit.
 */
export default function PreviewBridge() {
  const router = useRouter()

  useEffect(() => {
    if (window.parent === window) return
    const origin = window.location.origin
    const post = (message: Record<string, unknown>) => window.parent.postMessage({ source: "nordiva-preview", ...message }, origin)

    // The editor names a field from the most exact mark to the least ("facts.2.title", "facts.2", "facts"): the first one on the page wins.
    let active: string[] = []
    const find = () => {
      for (const field of active) {
        const element = document.querySelector<HTMLElement>(`[data-edit="${field.replace(/"/g, "")}"]`)
        if (element) return element
      }
      return null
    }
    const mark = (scroll: boolean) => {
      document.querySelectorAll("[data-edit-active]").forEach((element) => element.removeAttribute("data-edit-active"))
      const element = find()
      if (!element) return
      element.setAttribute("data-edit-active", "")
      if (scroll) element.scrollIntoView({ block: "center", behavior: "smooth" })
    }

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin || event.data?.source !== "nordiva-editor") return
      if (event.data.type === "refresh") {
        router.refresh()
        // The page is drawn again after the refresh: put the highlight back.
        window.setTimeout(() => mark(false), 400)
        window.setTimeout(() => mark(false), 1200)
      } else if (event.data.type === "focus") {
        active = Array.isArray(event.data.fields) ? event.data.fields.map(String) : []
        mark(true)
      }
    }

    const onClick = (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const target = (event.target as Element | null)?.closest?.("[data-edit]")
      if (!target) return
      const field = target.getAttribute("data-edit") ?? ""
      active = [field]
      mark(false)
      post({ type: "select", field })
    }
    const stop = (event: Event) => event.preventDefault()

    window.addEventListener("message", onMessage)
    document.addEventListener("click", onClick, true)
    document.addEventListener("submit", stop, true)
    post({ type: "ready" })
    return () => {
      window.removeEventListener("message", onMessage)
      document.removeEventListener("click", onClick, true)
      document.removeEventListener("submit", stop, true)
    }
  }, [router])

  return (
    <style>{`
      [data-edit] { cursor: pointer; }
      [data-edit]:hover { outline: 2px dashed #0057b7; outline-offset: 4px; }
      [data-edit][data-edit-active] { outline: 2px solid #0057b7; outline-offset: 4px; }
      a, button { cursor: default; }
      [data-edit] a, [data-edit] button { cursor: pointer; }
    `}</style>
  )
}
