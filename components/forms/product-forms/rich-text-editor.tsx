"use client"

import { useState, useEffect } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Heading from "@tiptap/extension-heading"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Bold, Italic, List, ListOrdered, Edit3, Heading2, Heading3, Heading4 } from "lucide-react"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function RichTextEditor({ value, onChange, placeholder = "Введіть опис..." }: RichTextEditorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(true)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Heading.configure({
        levels: [2, 3, 4],
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html)
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[200px] max-h-[400px] overflow-y-auto p-4 border rounded-md [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2 [&_h4]:text-base [&_h4]:font-medium [&_h4]:mt-2 [&_h4]:mb-1",
      },
    },
  })

  useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value, false)
    }
  }, [value, editor])

  const handleSave = () => {
    if (editor) {
      const content = editor.getHTML()
      onChange(content)
      setIsOpen(false)
    }
  }

  const handleCancel = () => {
    if (editor) {
      editor.commands.setContent(value, false)
    }
    setIsOpen(false)
    setIsEditing(true)
  }
  
  const getPlainText = (html: string) => {
    const div = document.createElement("div")
    div.innerHTML = html
    return div.textContent || div.innerText || ""
  }

  const hasContent = value && getPlainText(value).trim().length > 0

  if (!editor) {
    return null
  }

  return (
    <div className="w-full">
      <div className="relative min-h-[80px] p-3 text-small-regular text-gray-700 text-[13px] bg-neutral-100 border rounded-md ml-1 focus-within:ring-1 focus-within:ring-black">
        {hasContent ? (
          <div
            className="prose prose-sm max-w-none [&>*]:my-1 [&>ul]:my-2 [&>ol]:my-2 [&>li]:my-0 [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mt-3 [&>h2]:mb-2 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:mt-2 [&>h3]:mb-1 [&>h4]:text-base [&>h4]:font-medium [&>h4]:mt-1 [&>h4]:mb-1 [&_p:empty]:min-h-[1em]"
            dangerouslySetInnerHTML={{ __html: value }}
          />
        ) : (
          <p className="text-gray-400">{placeholder}</p>
        )}

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-white/80"
              title="Редагувати опис"
            >
              <Edit3 className="h-3 w-3" />
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-4xl max-h-[80vh] bg-white">
            <DialogHeader>
              <DialogTitle>Редагування опису</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex gap-2 p-2 border-b flex-wrap">
                <Button
                  type="button"
                  variant={isEditing ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-8 px-2 text-xs font-medium"
                  title="Режим редагування"
                >
                  Редагувати
                </Button>
                <Button
                  type="button"
                  variant={!isEditing ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="h-8 px-2 text-xs font-medium"
                  title="Попередній перегляд HTML"
                >
                  HTML Попередній перегляд
                </Button>

                <div className="w-px h-6 bg-gray-300 mx-1" />

                {isEditing && (
                  <>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant={editor.isActive("heading", { level: 2 }) ? "default" : "outline"}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className="h-8 px-2 text-xs font-medium"
                        title="Великий заголовок"
                      >
                        <Heading2 className="h-4 w-4 mr-1" />
                      </Button>
                      <Button
                        type="button"
                        variant={editor.isActive("heading", { level: 3 }) ? "default" : "outline"}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        className="h-8 px-2 text-xs font-medium"
                        title="Середній заголовок"
                      >
                        <Heading3 className="h-4 w-4 mr-1" />
                      </Button>
                      <Button
                        type="button"
                        variant={editor.isActive("heading", { level: 4 }) ? "default" : "outline"}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
                        className="h-8 px-2 text-xs font-medium"
                        title="Малий заголовок"
                      >
                        <Heading4 className="h-4 w-4 mr-1" />
                      </Button>
                    </div>

                    <div className="w-px h-6 bg-gray-300 mx-1" />

                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant={editor.isActive("bold") ? "default" : "outline"}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className="h-8 w-8 p-0"
                        title="Жирний текст"
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant={editor.isActive("italic") ? "default" : "outline"}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className="h-8 w-8 p-0"
                        title="Курсивний текст"
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="w-px h-6 bg-gray-300 mx-1" />

                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant={editor.isActive("bulletList") ? "default" : "outline"}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className="h-8 w-8 p-0"
                        title="Маркований список"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant={editor.isActive("orderedList") ? "default" : "outline"}
                        size="sm"
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        className="h-8 w-8 p-0"
                        title="Нумерований список"
                      >
                        <ListOrdered className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {isEditing ? (
                <div className="border rounded-md focus-within:ring-2 focus-within:ring-black">
                  <EditorContent
                    editor={editor}
                    className="[&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:max-h-[280px] [&_.ProseMirror]:overflow-y-auto [&_.ProseMirror]:p-4 [&_.ProseMirror]:focus:outline-none [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ul]:ml-4 [&_.ProseMirror_ol]:ml-4 [&_.ProseMirror_li]:my-1 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mt-4 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mt-3 [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h4]:text-base [&_.ProseMirror_h4]:font-medium [&_.ProseMirror_h4]:mt-2 [&_.ProseMirror_h4]:mb-1 [&_.ProseMirror_p:empty]:min-h-[1em]"
                  />
                </div>
              ) : (
                <div
                  className="prose prose-sm p-4 border rounded-md bg-gray-50 overflow-auto min-h-[200px] max-h-[280px] [&_p:empty]:min-h-[1em]"
                  dangerouslySetInnerHTML={{ __html: value }}
                />
              )}
              
              {isEditing && (
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  <p className="font-medium mb-1">Швидкі поради:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span>• Використовуйте H2 для основних розділів</span>
                    <span>• Використовуйте H3 для підрозділів</span>
                    <span>• Використовуйте H4 для дрібних заголовків</span>
                    <span>• Жирний/Курсив для акцентів</span>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Скасувати
                </Button>
                <Button type="button" onClick={handleSave} className="bg-black text-white hover:bg-gray-800">
                  Зберегти зміни
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}