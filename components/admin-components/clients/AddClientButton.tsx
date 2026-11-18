"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { Field, adminButton, adminInput } from "@/components/admin/ui"
import { AdminDialog } from "@/components/admin-components/AdminDialog"
import { createuserByMyself } from "@/lib/actions/user.actions"
import { ClientFields, validateClient, type ClientErrors, type ClientValues } from "./ClientFields"

const EMPTY: ClientValues = { name: "", surname: "", email: "", phoneNumber: "", role: "User" }

/** "Add client": a customer record without a password (they can claim it by signing up with the same e-mail). */
export function AddClientButton({ canGrantAdmin }: { canGrantAdmin: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<ClientValues>(EMPTY)
  const [errors, setErrors] = useState<ClientErrors>({})
  const [confirmation, setConfirmation] = useState("")
  const [pending, startTransition] = useTransition()

  const close = () => {
    setOpen(false)
    setValues(EMPTY)
    setErrors({})
    setConfirmation("")
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const found = validateClient(values)
    if (values.role === "Admin" && confirmation.trim().toLowerCase() !== "так") found.role = "Щоб надати права адміністратора, введіть «так»."
    setErrors(found)
    if (Object.keys(found).length > 0) return

    startTransition(async () => {
      try {
        const result = await createuserByMyself({ ...values, role: canGrantAdmin ? values.role : "User" })
        if (!result.ok) {
          setErrors({ [result.field ?? "form"]: result.error })
          return
        }
        close()
        router.push(`/admin/clients/${result.user._id}`)
      } catch {
        setErrors({ form: "Не вдалося додати клієнта. Спробуйте ще раз." })
      }
    })
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={adminButton.primary}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Додати клієнта
      </button>

      <AdminDialog
        open={open}
        onClose={close}
        title="Новий клієнт"
        description="Запис без пароля. Клієнт зможе створити акаунт із цією адресою і побачить свої замовлення."
        size="lg"
        footer={
          <>
            <button type="button" onClick={close} className={adminButton.secondary}>
              Скасувати
            </button>
            <button type="submit" form="add-client-form" disabled={pending} className={adminButton.primary}>
              {pending ? "Додаємо…" : "Додати клієнта"}
            </button>
          </>
        }
      >
        <form id="add-client-form" onSubmit={submit} noValidate className="space-y-4">
          <ClientFields idPrefix="add-client" values={values} errors={errors} onChange={setValues} disabled={pending} />
          {canGrantAdmin && (
            <label className="flex items-start gap-3 rounded-md border border-neutral-200 p-3 text-sm">
              <input
                type="checkbox"
                checked={values.role === "Admin"}
                onChange={(event) => setValues({ ...values, role: event.target.checked ? "Admin" : "User" })}
                disabled={pending}
                className="check mt-0.5"
              />
              <span>
                <span className="font-medium">Зробити адміністратором</span>
                <span className="block text-neutral-500">Отримає доступ до панелі керування: замовлення, товари, клієнти.</span>
              </span>
            </label>
          )}
          {values.role === "Admin" && (
            <Field label="Підтвердження" htmlFor="add-client-confirm" hint="Введіть «так», щоб надати права адміністратора." error={errors.role}>
              <input id="add-client-confirm" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={pending} autoComplete="off" className={adminInput} />
            </Field>
          )}
          {errors.role && values.role !== "Admin" && <p role="alert" className="text-sm text-red-700">{errors.role}</p>}
          {errors.form && <p role="alert" className="text-sm text-red-700">{errors.form}</p>}
        </form>
      </AdminDialog>
    </>
  )
}
