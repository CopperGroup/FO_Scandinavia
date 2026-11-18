"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import axios from "axios"
import { signIn, useSession } from "next-auth/react"
import { Loader2 } from "lucide-react"
import GoogleSignIn from "@/components/authButtons/GoogleSignIn"
import AuthShell, { Divider, FormError, TextField } from "@/components/storefront/auth/AuthShell"
import { trackFacebookEvent } from "@/helpers/pixel"

const MIN_PASSWORD_LENGTH = 8

export default function SignupPage() {
  const session = useSession()
  const router = useRouter()

  const [user, setUser] = useState({ username: "", email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  // Set when the address already has orders: the account opens from the link sent there.
  const [confirmSentTo, setConfirmSentTo] = useState("")

  useEffect(() => {
    if (session.status === "authenticated") router.replace("/")
  }, [session.status, router])

  async function onSignup(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    if (user.password.length < MIN_PASSWORD_LENGTH) {
      setError(`Пароль має містити щонайменше ${MIN_PASSWORD_LENGTH} символів`)
      return
    }

    setLoading(true)
    try {
      const { data } = await axios.post("/api/users/signup", { ...user, email: user.email.trim() })
      if (data?.confirmEmail) {
        setConfirmSentTo(user.email.trim())
        return
      }
      trackFacebookEvent("CompleteRegistration", { registration_method: "email" })

      // Sign the new customer in straight away; if that fails they can do it on the login page.
      const response = await signIn("credentials", { email: user.email.trim(), password: user.password, redirect: false })
      router.replace(response?.error ? "/login" : "/")
    } catch (error: any) {
      setError(
        error?.response?.status === 400
          ? "Обліковий запис із цією адресою вже існує. Увійдіть або відновіть пароль."
          : error?.response?.data?.code === "EMAIL_FAILED"
            ? "Не вдалося надіслати лист для підтвердження адреси. Спробуйте ще раз за хвилину або увійдіть через Google."
            : "Не вдалося зареєструватися. Спробуйте ще раз за хвилину.",
      )
    } finally {
      setLoading(false)
    }
  }

  const complete = user.username.trim() && user.email.trim() && user.password

  if (confirmSentTo) {
    return (
      <AuthShell
        title="Підтвердьте e-mail"
        description={`Ми надіслали лист на ${confirmSentTo}. Відкрийте посилання з нього, щоб завершити реєстрацію.`}
        footer={
          <>
            Уже підтвердили?{" "}
            <Link href="/login" className="font-semibold text-brand hover:text-brand-deep focus-visible:outline-none focus-visible:underline">
              Увійти
            </Link>
          </>
        }
      >
        <div className="space-y-3 text-base leading-6 text-brand-ink">
          <p>З цієї адреси вже робили замовлення без реєстрації, тому ми маємо переконатися, що скринька ваша. Після підтвердження ці замовлення будуть у вашому обліковому записі.</p>
          <p className="text-brand-muted">Посилання діє 24 години. Якщо листа немає, перевірте папку «Спам».</p>
        </div>
        <button type="button" onClick={() => setConfirmSentTo("")} className="btn-secondary mt-6 w-full">
          Вказати іншу адресу
        </button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Реєстрація"
      description="Після реєстрації надішлемо на пошту промокод на −10% для першого замовлення."
      footer={
        <>
          Уже маєте обліковий запис?{" "}
          <Link href="/login" className="font-semibold text-brand hover:text-brand-deep focus-visible:outline-none focus-visible:underline">
            Увійти
          </Link>
        </>
      }
    >
      <GoogleSignIn label="Продовжити з Google" />
      <Divider>або</Divider>

      <form onSubmit={onSignup} className="space-y-4 short:space-y-3">
        <FormError>{error}</FormError>
        <TextField label="Ім’я" autoComplete="given-name" required value={user.username} onChange={(event) => setUser({ ...user, username: event.target.value })} disabled={loading} />
        <TextField label="E-mail" type="email" autoComplete="email" inputMode="email" required value={user.email} onChange={(event) => setUser({ ...user, email: event.target.value })} disabled={loading} />
        <TextField
          label="Пароль"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          hint={`Щонайменше ${MIN_PASSWORD_LENGTH} символів`}
          value={user.password}
          onChange={(event) => setUser({ ...user, password: event.target.value })}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !complete} className="btn-blue w-full short:h-11">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : "Зареєструватися"}
        </button>
        <p className="text-sm leading-6 text-brand-muted">
          Реєструючись, ви погоджуєтеся з{" "}
          <Link href="/info/public-offer" className="link-quiet">
            публічною офертою
          </Link>{" "}
          та{" "}
          <Link href="/info/conf-policy" className="link-quiet">
            політикою конфіденційності
          </Link>
          .
        </p>
      </form>
    </AuthShell>
  )
}
