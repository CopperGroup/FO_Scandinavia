"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react"
import AuthShell, { FormError } from "@/components/storefront/auth/AuthShell"
import { resetPassword } from "@/lib/actions/user.actions"
import { cn } from "@/lib/utils"

// The same rules the page has always enforced: 8+ characters and three of the four kinds below.
const RULES: { label: string; test: (password: string) => boolean }[] = [
  { label: "8 символів або більше", test: (password) => password.length >= 8 },
  { label: "велика латинська літера", test: (password) => /[A-Z]/.test(password) },
  { label: "цифра", test: (password) => /[0-9]/.test(password) },
  { label: "інший символ (не латинська літера чи цифра)", test: (password) => /[^A-Za-z0-9]/.test(password) },
]

export default function NewPasswordPage({ searchParams }: { searchParams: { t?: string } }) {
  const router = useRouter()
  const token = searchParams.t

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const passed = RULES.map((rule) => rule.test(password))
  const strongEnough = passed[0] && passed.filter(Boolean).length >= 3

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError("")

    if (!token) return setError("Посилання недійсне. Запросіть відновлення пароля ще раз.")
    if (!strongEnough) return setError("Пароль закороткий або надто простий: виконайте щонайменше три умови, серед них довжину.")
    if (password !== confirm) return setError("Паролі не збігаються.")

    setLoading(true)
    try {
      await resetPassword({ token, newPassword: password })
      setSuccess(true)
      setTimeout(() => router.push("/login"), 3000)
    } catch {
      setError("Не вдалося змінити пароль. Можливо, посилання вже застаріло: запросіть нове.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthShell title="Пароль змінено" description="Зараз перенаправимо вас на сторінку входу.">
        <CheckCircle2 className="h-10 w-10 text-brand" aria-hidden="true" />
        <Link href="/login" className="btn-blue mt-6 w-full">
          Увійти
        </Link>
      </AuthShell>
    )
  }

  const type = visible ? "text" : "password"

  return (
    <AuthShell
      title="Новий пароль"
      description="Придумайте пароль, який ви не використовуєте на інших сайтах."
      footer={
        <Link href="/login" className="font-semibold text-brand hover:text-brand-deep focus-visible:outline-none focus-visible:underline">
          Повернутися до входу
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 short:space-y-3">
        <FormError>{error}</FormError>

        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-brand-ink">
            Новий пароль
          </label>
          <div className="relative mt-2">
            <input id="new-password" type={type} autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading} className="field pr-12" />
            <button
              type="button"
              onClick={() => setVisible(!visible)}
              aria-label={visible ? "Приховати пароль" : "Показати пароль"}
              className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center rounded-sm text-brand-muted hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {visible ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {RULES.map((rule, index) => (
              <li key={rule.label} className={cn("flex items-center gap-2", passed[index] ? "text-brand-ink" : "text-brand-muted")}>
                <Check className={cn("h-4 w-4 shrink-0", passed[index] ? "text-brand" : "text-brand-line")} aria-hidden="true" />
                {rule.label}
                <span className="sr-only">{passed[index] ? " — виконано" : " — не виконано"}</span>
              </li>
            ))}
          </ul>
        </div>

        <label className="block text-sm font-medium text-brand-ink">
          Повторіть пароль
          <input type={type} autoComplete="new-password" required value={confirm} onChange={(event) => setConfirm(event.target.value)} disabled={loading} className="field mt-2 font-normal" />
        </label>

        <button type="submit" disabled={loading || !password || !confirm} className="btn-blue w-full short:h-11">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : "Зберегти пароль"}
        </button>
      </form>
    </AuthShell>
  )
}
