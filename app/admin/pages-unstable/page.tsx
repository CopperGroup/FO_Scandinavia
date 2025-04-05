"use client"

import EditorPage from "@/components/editor/editor-page"
import { useState } from "react"
import { Toaster } from "@/components/ui/toaster"

export default function Home() {
  const [savedJsx, setSavedJsx] = useState(`
  <div className="container mx-auto p-4">
    <h1 className="text-2xl font-bold mb-4" style={{ color: 'blue' }}>Welcome to JSX Editor</h1>
    <p className="mb-2">This is a paragraph that you can edit.</p>
    <div className="flex flex-col @md:flex-row items-center gap-4 mb-4">
      <img 
        src="/placeholder.svg?height=200&width=300" 
        alt="Placeholder image" 
        className="rounded-lg shadow-md" 
        width="300" 
        height="200" 
      />
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Image Example</h2>
        <p>You can now edit images and links in the JSX editor.</p>
        <a href="https://example.com" className="text-blue-500 hover:underline" target="_blank">Visit Example Site</a>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <button className="bg-blue-500 text-white px-4 py-2 rounded">Click Me</button>
      <span className="text-green-500">This is a span element</span>
    </div>
  </div>
`)

  const handleSave = (updatedJsx: string) => {
    console.log("Updated JSX:", updatedJsx)
    // Save the updated JSX to state so it persists
    setSavedJsx(updatedJsx)
  }

  return (
    <section className="w-full">
      <EditorPage initialContent={savedJsx} onSave={handleSave} />
      <Toaster />
    </section>
  )
}

