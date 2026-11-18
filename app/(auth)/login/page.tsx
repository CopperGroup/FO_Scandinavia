"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import { Loader2 } from "lucide-react"
import GoogleSignIn from "@/components/authButtons/GoogleSignIn"
import AuthShell, { Divider, FormError, TextField } from "@/components/storefront/auth/AuthShell"
import { fetchUserByEmail } from "@/lib/actions/user.actions"

export default function LoginPage() {
  const session = useSession()
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<React.ReactNode>("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session.status === "authenticated") router.replace("/")
  }, [session.status, router])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    setLoading(true)
    try {
      const user = JSON.parse(await fetchUserByEmail({ email: email.trim() }, "json"))

      // Guest checkouts create an account without a password; such a customer registers to set one.
      if (!user || user.selfCreated) {
        setError(
          <>
            Облікового запису з паролем для цієї адреси ще немає.{" "}
            <Link href="/signup" className="font-semibold underline underline-offset-2">
              Зареєструватися
            </Link>
          </>,
        )
        return
      }

      const response = await signIn("credentials", { email: email.trim(), password, redirect: false })
      if (response?.error) {
        setError("Неправильний e-mail або пароль")
        return
      }
      router.replace("/")
    } catch {
      setError("Не вдалося увійти. Перевірте з’єднання і спробуйте ще раз.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Вхід"
      description="Замовлення, обране та промокоди зберігаються у вашому обліковому записі."
      footer={
        <>
          Ще не з нами?{" "}
          <Link href="/signup" className="font-semibold text-brand hover:text-brand-deep focus-visible:outline-none focus-visible:underline">
            Зареєструватися
          </Link>
        </>
      }
    >
      <GoogleSignIn label="Увійти через Google" />
      <Divider>або</Divider>

      <form onSubmit={handleSubmit} className="space-y-4 short:space-y-3">
        <FormError>{error}</FormError>
        <TextField label="E-mail" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading} />
        <div>
          <TextField label="Пароль" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading} />
          <Link href="/resetPass" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:text-brand-deep focus-visible:outline-none focus-visible:underline">
            Забули пароль?
          </Link>
        </div>
        <button type="submit" disabled={loading || !email || !password} className="btn-blue w-full short:h-11">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : "Увійти"}
        </button>
      </form>
    </AuthShell>
  )
}
