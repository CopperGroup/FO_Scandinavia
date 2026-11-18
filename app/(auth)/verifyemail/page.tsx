"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import axios from "axios"
import { CheckCircle2, Loader2 } from "lucide-react"
import AuthShell from "@/components/storefront/auth/AuthShell"

type State = "checking" | "verified" | "failed" | "no-token"

export default function VerifyEmailPage() {
  const [state, setState] = useState<State>("checking")

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") ?? window.location.search.split("=")[1] ?? ""
    if (!token) {
      setState("no-token")
      return
    }
    axios
      .post("/api/users/verifyemail", { token })
      .then(() => setState("verified"))
      .catch(() => setState("failed"))
  }, [])

  if (state === "checking") {
    return (
      <AuthShell title="Перевіряємо адресу" description="Це займе кілька секунд.">
        <Loader2 className="h-8 w-8 animate-spin text-brand" aria-hidden="true" />
      </AuthShell>
    )
  }

  if (state === "verified") {
    return (
      <AuthShell title="E-mail підтверджено" description="Обліковий запис готовий. Можна входити й робити покупки.">
        <CheckCircle2 className="h-10 w-10 text-brand" aria-hidden="true" />
        <Link href="/login" className="btn-blue mt-6 w-full">
          Увійти
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Не вдалося підтвердити адресу"
      description={
        state === "no-token"
          ? "У посиланні бракує коду підтвердження. Відкрийте його з листа ще раз."
          : "Посилання вже використане або застаріло. Якщо ви щойно підтвердили адресу, просто увійдіть; інакше зареєструйтеся ще раз."
      }
    >
      <div className="grid gap-3">
        <Link href="/login" className="btn-blue w-full">
          Увійти
        </Link>
        <Link href="/signup" className="btn-secondary w-full">
          Зареєструватися ще раз
        </Link>
      </div>
    </AuthShell>
  )
}
