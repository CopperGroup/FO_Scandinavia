"use client"

import { Field, adminInput } from "@/components/admin/ui"

export type ClientValues = { name: string; surname: string; email: string; phoneNumber: string; role: "User" | "Admin" }
export type ClientErrors = Partial<Record<"name" | "email" | "role" | "form", string>>

/** Contact fields shared by "add client" and "edit client". */
export function ClientFields({
  values,
  errors,
  onChange,
  disabled,
  idPrefix,
  columns = 2,
}: {
  values: ClientValues
  errors: ClientErrors
  onChange: (values: ClientValues) => void
  disabled?: boolean
  idPrefix: string
  /** 1 inside a narrow column. */
  columns?: 1 | 2
}) {
  const set = (key: keyof ClientValues) => (event: React.ChangeEvent<HTMLInputElement>) => onChange({ ...values, [key]: event.target.value })
  return (
    <div className={columns === 2 ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
      <Field label="Ім’я" htmlFor={`${idPrefix}-name`} error={errors.name}>
        <input id={`${idPrefix}-name`} value={values.name} onChange={set("name")} disabled={disabled} autoComplete="off" required className={adminInput} aria-invalid={Boolean(errors.name)} />
      </Field>
      <Field label="Прізвище" htmlFor={`${idPrefix}-surname`} optional>
        <input id={`${idPrefix}-surname`} value={values.surname} onChange={set("surname")} disabled={disabled} autoComplete="off" className={adminInput} />
      </Field>
      <Field label="E-mail" htmlFor={`${idPrefix}-email`} error={errors.email}>
        <input id={`${idPrefix}-email`} type="email" value={values.email} onChange={set("email")} disabled={disabled} autoComplete="off" required className={adminInput} aria-invalid={Boolean(errors.email)} />
      </Field>
      <Field label="Телефон" htmlFor={`${idPrefix}-phone`} optional>
        <input id={`${idPrefix}-phone`} type="tel" value={values.phoneNumber} onChange={set("phoneNumber")} disabled={disabled} autoComplete="off" placeholder="+380" className={adminInput} />
      </Field>
    </div>
  )
}

export function validateClient(values: ClientValues): ClientErrors {
  const errors: ClientErrors = {}
  if (!values.name.trim()) errors.name = "Вкажіть ім’я."
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = "Перевірте адресу e-mail."
  return errors
}
