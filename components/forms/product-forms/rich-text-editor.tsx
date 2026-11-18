"use client"

import { useEffect } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Heading from "@tiptap/extension-heading"
import { Bold, Heading2, Heading3, Italic, List, ListOrdered } from "lucide-react"
import { cn } from "@/lib/utils"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  id?: string
  invalid?: boolean
  describedBy?: string
  /** Accessible name of the editing area (a <label> cannot point at it). */
  label?: string
}

/**
 * Inline editor for the product description (HTML). The toolbar covers what the
 * storefront renders. It starts compact and grows with the text up to 60% of
 * the window, then scrolls.
 */
export function RichTextEditor({ value, onChange, id, invalid, describedBy, label }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Heading.configure({ levels: [2, 3] }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        role: "textbox",
        "aria-multiline": "true",
        ...(label ? { "aria-label": label } : {}),
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(invalid ? { "aria-invalid": "true" } : {}),
        class:
          "min-h-[8.75rem] max-h-[60vh] overflow-y-auto px-3 py-2.5 text-sm leading-6 focus:outline-none [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:my-1.5 [&_ul]:ml-5 [&_ul]:list-disc",
      },
    },
    immediatelyRender: false,
  })

  // Keep the editor in step when the value is replaced from outside (e.g. a reset).
  useEffect(() => {
    if (editor && !editor.isFocused && editor.getHTML() !== value) editor.commands.setContent(value || "", false)
  }, [value, editor])

  const tool = (label: string, active: boolean, onClick: () => void, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex h-control-sm w-control-sm items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black",
        active && "bg-neutral-900 text-white hover:bg-neutral-800 hover:text-white",
      )}
    >
      {icon}
    </button>
  )

  return (
    <div
      className={cn(
        "rounded-md border bg-white transition-colors focus-within:border-black focus-within:ring-2 focus-within:ring-black/10",
        invalid ? "border-red-600" : "border-neutral-300",
      )}
    >
      <div className="flex min-h-[calc(2.5rem+1px)] flex-wrap gap-1 border-b border-neutral-200 p-1">
        {editor && (
          <>
            {tool("Заголовок", editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 className="h-4 w-4" aria-hidden="true" />)}
            {tool("Підзаголовок", editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), <Heading3 className="h-4 w-4" aria-hidden="true" />)}
            {tool("Жирний", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), <Bold className="h-4 w-4" aria-hidden="true" />)}
            {tool("Курсив", editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), <Italic className="h-4 w-4" aria-hidden="true" />)}
            {tool("Маркований список", editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), <List className="h-4 w-4" aria-hidden="true" />)}
            {tool("Нумерований список", editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="h-4 w-4" aria-hidden="true" />)}
          </>
        )}
      </div>
      {/* Until the editor is ready, keep its height so the page does not jump. */}
      {editor ? <EditorContent editor={editor} /> : <div className="min-h-[8.75rem]" aria-hidden="true" />}
    </div>
  )
}
