"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import Select from "@/components/admin/Select"
import { Field, Panel, adminButton, adminInput } from "@/components/admin/ui"
import { ClientFields, validateClient, type ClientErrors, type ClientValues } from "@/components/admin-components/clients/ClientFields"
import { editUser } from "@/lib/actions/user.actions"
import { ROLE_LABEL } from "@/lib/admin/status"

export type EditableClient = { id: string; name: string; surname: string; email: string; phoneNumber: string; role: string }

/**
 * Contact data of a client, read-only until "Редагувати". Only the owner sees
 * the role control, and granting the administrator role asks for a typed
 * confirmation. The owner's own record is not editable here.
 */
export function EditUserForm({ client, canManageAdmins }: { client: EditableClient; canManageAdmins: boolean }) {
  const router = useRouter()
  const initial: ClientValues = {
    name: client.name,
    surname: client.surname,
    email: client.email,
    phoneNumber: client.phoneNumber,
    role: client.role === "Admin" ? "Admin" : "User",
  }
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState<ClientValues>(initial)
  const [errors, setErrors] = useState<ClientErrors>({})
  const [confirmation, setConfirmation] = useState("")
  const [pending, startTransition] = useTransition()

  const isOwnerRecord = client.role === "Owner"
  const grantsAdmin = values.role === "Admin" && client.role !== "Admin"

  const cancel = () => {
    setEditing(false)
    setValues(initial)
    setErrors({})
    setConfirmation("")
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const found = validateClient(values)
    if (grantsAdmin && confirmation.trim().toLowerCase() !== "так") found.role = "Щоб надати права адміністратора, введіть «так»."
    setErrors(found)
    if (Object.keys(found).length > 0) return

    startTransition(async () => {
      try {
        const result = await editUser({ userId: client.id, ...values, role: canManageAdmins ? values.role : initial.role })
        if (!result.ok) {
          setErrors({ [result.field ?? "form"]: result.error })
          return
        }
        toast.success("Зміни збережено")
        setEditing(false)
        setConfirmation("")
        router.refresh()
      } catch {
        setErrors({ form: "Не вдалося зберегти зміни. Спробуйте ще раз." })
      }
    })
  }

  if (!editing) {
    return (
      <Panel
        title="Контакти"
        action={
          !isOwnerRecord && (
            <button type="button" onClick={() => setEditing(true)} className={adminButton.secondary}>
              Редагувати
            </button>
          )
        }
      >
        <dl className="space-y-3 text-sm">
          {[
            ["Ім’я", [client.name, client.surname].filter(Boolean).join(" ") || "—"],
            ["E-mail", client.email],
            ["Телефон", client.phoneNumber || "—"],
            ["Роль", ROLE_LABEL[client.role] ?? client.role],
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[96px_1fr] gap-3">
              <dt className="text-neutral-500">{label}</dt>
              <dd className="break-words text-neutral-900">{value}</dd>
            </div>
          ))}
        </dl>
        {isOwnerRecord && <p className="mt-4 text-xs text-neutral-500">Дані власника магазину тут не змінюються.</p>}
      </Panel>
    )
  }

  return (
    <Panel title="Контакти">
      <form onSubmit={submit} noValidate className="space-y-4">
        <ClientFields idPrefix="edit-client" columns={1} values={values} errors={errors} onChange={setValues} disabled={pending} />

        {canManageAdmins ? (
          <Field label="Роль" htmlFor="edit-client-role" error={grantsAdmin ? undefined : errors.role}>
            <Select
              id="edit-client-role"
              value={values.role}
              onChange={(value) => setValues({ ...values, role: value === "Admin" ? "Admin" : "User" })}
              disabled={pending}
              options={[
                { value: "User", label: "Клієнт" },
                { value: "Admin", label: "Адміністратор", hint: "доступ до панелі керування" },
              ]}
            />
          </Field>
        ) : (
          <p className="text-xs text-neutral-500">Роль змінює лише власник магазину.</p>
        )}

        {grantsAdmin && (
          <Field label="Підтвердження" htmlFor="edit-client-confirm" hint="Введіть «так», щоб надати права адміністратора." error={errors.role}>
            <input id="edit-client-confirm" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={pending} autoComplete="off" className={adminInput} />
          </Field>
        )}

        {errors.form && (
          <p role="alert" className="text-sm text-red-700">
            {errors.form}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={cancel} disabled={pending} className={adminButton.secondary}>
            Скасувати
          </button>
          <button type="submit" disabled={pending} className={adminButton.primary}>
            {pending ? "Зберігаємо…" : "Зберегти зміни"}
          </button>
        </div>
      </form>
    </Panel>
  )
}
