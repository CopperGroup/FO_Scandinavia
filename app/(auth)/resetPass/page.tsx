"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, MailCheck } from "lucide-react"
import AuthShell, { FormError, TextField } from "@/components/storefront/auth/AuthShell"
import { sendResetPasswordEmail } from "@/lib/email/resetPass"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ResetPass() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError("")
    try {
      await sendResetPasswordEmail({ email: email.trim() })
      setSent(true)
    } catch {
      setError("Не вдалося надіслати лист. Перевірте адресу і спробуйте ще раз.")
    } finally {
      setLoading(false)
    }
  }

  const backToLogin = (
    <Link href="/login" className="font-semibold text-brand hover:text-brand-deep focus-visible:outline-none focus-visible:underline">
      Повернутися до входу
    </Link>
  )

  if (sent) {
    return (
      <AuthShell title="Лист надіслано" description={<>Інструкцію з відновлення пароля надіслано на {email.trim()}. Якщо листа немає, перевірте папку «Спам».</>} footer={backToLogin}>
        <MailCheck className="h-10 w-10 text-brand" aria-hidden="true" />
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-5 block text-sm font-semibold text-brand hover:text-brand-deep focus-visible:outline-none focus-visible:underline"
        >
          Надіслати на іншу адресу
        </button>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Відновлення пароля" description="Вкажіть e-mail, з яким ви реєструвалися. Надішлемо посилання для створення нового пароля." footer={backToLogin}>
      <form onSubmit={handleSubmit} className="space-y-4 short:space-y-3">
        <FormError>{error}</FormError>
        <TextField label="E-mail" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading} />
        <button type="submit" disabled={loading || !EMAIL_PATTERN.test(email.trim())} className="btn-blue w-full short:h-11">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : "Надіслати посилання"}
        </button>
      </form>
    </AuthShell>
  )
}
