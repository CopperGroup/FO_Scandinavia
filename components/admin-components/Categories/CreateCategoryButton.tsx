"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Plus } from "lucide-react"
import AdminDialog from "@/components/admin-components/modals/AdminDialog"
import { Field, adminButton, adminInput } from "@/components/admin/ui"
import Select from "@/components/admin/Select"
import { createCategoryAction } from "@/lib/actions/categories.actions"
import { categoryNameKey, categoryNameProblem } from "@/lib/admin/catalog-shared"
import { cn } from "@/lib/utils"

/** "Нова категорія": name and optional parent, then opens the new category. Secondary by default: the pane has its own main button. */
export default function CreateCategoryButton({
  categories,
  primary = false,
  defaultParentId = "",
  label = "Нова категорія",
  className,
}: {
  categories: { id: string; name: string; path?: string }[]
  primary?: boolean
  defaultParentId?: string
  label?: React.ReactNode
  className?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [parentId, setParentId] = useState(defaultParentId)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const duplicate = categories.find((category) => categoryNameKey(category.name) === categoryNameKey(name))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const problem = categoryNameProblem(name) ?? (duplicate ? `Категорія «${duplicate.name}» уже існує.` : null)
    if (problem) return setError(problem)
    setBusy(true)
    setError("")
    try {
      const result = await createCategoryAction({ name, parentId: parentId || undefined })
      if (!result.ok) return setError(result.error)
      setOpen(false)
      setName("")
      setParentId(defaultParentId)
      router.push(`/admin/categories?id=${result.id}`)
      router.refresh()
    } catch {
      setError("Не вдалося створити категорію. Спробуйте ще раз.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button type="button" className={cn(primary ? adminButton.primary : adminButton.secondary, className)} onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        {label}
      </button>
      <AdminDialog
        open={open}
        onClose={() => setOpen(false)}
        busy={busy}
        title="Нова категорія"
        footer={
          <>
            <button type="button" className={adminButton.secondary} onClick={() => setOpen(false)} disabled={busy}>
              Скасувати
            </button>
            <button type="submit" form="create-category" className={adminButton.primary} disabled={busy}>
              {busy ? "Створюємо…" : "Створити категорію"}
            </button>
          </>
        }
      >
        <form id="create-category" onSubmit={submit} className="space-y-4">
          <Field label="Назва" htmlFor="new-category-name" error={error}>
            <input id="new-category-name" value={name} onChange={(event) => setName(event.target.value)} className={cn(adminInput, error && "border-red-600")} maxLength={80} autoComplete="off" />
          </Field>
          <Field label="Батьківська категорія" htmlFor="new-category-parent" optional hint="Порожньо — категорія верхнього рівня.">
            <Select
              id="new-category-parent"
              value={parentId}
              onChange={setParentId}
              searchable
              searchPlaceholder="Знайти категорію"
              options={[{ value: "", label: "Верхній рівень" }, ...categories.map((category) => ({ value: category.id, label: category.name, hint: category.path || undefined }))]}
            />
          </Field>
        </form>
      </AdminDialog>
    </>
  )
}
