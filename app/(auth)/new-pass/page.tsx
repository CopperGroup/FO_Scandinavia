"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Store } from "@/constants/store"
import { ArrowLeft, Eye, EyeOff, CheckCircle, AlertTriangle, Loader2 } from "lucide-react"
import { resetPassword } from "@/lib/actions/user.actions"

export default function NewPasswordPage({ searchParams }: { searchParams: any}) {
  const router = useRouter()
  const token = searchParams.t

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Password strength check
  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, text: "" }

    let strength = 0
    if (password.length >= 8) strength += 1
    if (/[A-Z]/.test(password)) strength += 1
    if (/[0-9]/.test(password)) strength += 1
    if (/[^A-Za-z0-9]/.test(password)) strength += 1

    let text = ""
    let color = ""

    switch (strength) {
      case 0:
      case 1:
        text = "Слабкий"
        color = "bg-red-500"
        break
      case 2:
        text = "Середній"
        color = "bg-yellow-500"
        break
      case 3:
        text = "Хороший"
        color = "bg-blue-500"
        break
      case 4:
        text = "Сильний"
        color = "bg-green-500"
        break
    }

    return { strength, text, color }
  }

  const passwordStrength = getPasswordStrength(newPassword)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (!token) {
      setError("Токен недійсний або відсутній.")
      setIsLoading(false)
      return
    }

    if (newPassword.length < 8) {
      setError("Пароль повинен містити мінімум 8 символів.")
      setIsLoading(false)
      return
    }

    if (passwordStrength.strength < 3) {
      setError("Пароль недостатньо надійний. Додайте великі літери, цифри та спеціальні символи.")
      setIsLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Паролі не співпадають.")
      setIsLoading(false)
      return
    }

    try {
      await resetPassword({ token, newPassword })
      setSuccess(true)
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Щось пішло не так. Можливо, термін дії посилання для скидання пароля закінчився.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="py-6 px-4 sm:px-6">
        <div className="max-w-sm mx-auto flex items-center">
          <button className="mr-4 text-gray-500 hover:text-gray-900 transition-colors" onClick={() => router.push("/")}>
            <ArrowLeft size={20} />
          </button>
          <Link href="/" className="text-2xl font-light text-gray-900">
            {Store.name}
          </Link>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6">
        <div className="w-full max-w-sm">
          {success ? (
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <h1 className="text-3xl font-light text-gray-900 mb-4">Пароль змінено</h1>
              <p className="text-base text-gray-500 mb-8">
                Ваш пароль було успішно оновлено. Зараз ви будете перенаправлені на сторінку входу.
              </p>
              <button
                className="inline-flex items-center justify-center px-6 py-3.5 bg-gray-900 text-white rounded-full hover:bg-black transition-colors"
                onClick={() => router.push("/login")}
              >
                Перейти до входу
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-light text-center text-gray-900 mb-4">Створення нового пароля</h1>
              <p className="text-center text-gray-500 mb-8">
                Введіть новий пароль для вашого облікового запису. Рекомендуємо використовувати надійний пароль, який ви
                не використовуєте на інших сайтах.
              </p>

              {error && (
                <div className="mb-6 px-4 py-3 bg-red-50 rounded-lg flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Введіть новий пароль"
                      className="block w-full px-4 py-3.5 bg-gray-50 border-0 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-gray-300 focus:outline-none pr-10"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>

                  {newPassword && (
                    <div className="mt-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-500">Надійність пароля:</span>
                        <span
                          className="text-xs font-medium"
                          style={{
                            color:
                              passwordStrength.color === "bg-red-500"
                                ? "#ef4444"
                                : passwordStrength.color === "bg-yellow-500"
                                  ? "#eab308"
                                  : passwordStrength.color === "bg-blue-500"
                                    ? "#3b82f6"
                                    : "#22c55e",
                          }}
                        >
                          {passwordStrength.text}
                        </span>
                      </div>
                      <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${passwordStrength.color}`}
                          style={{ width: `${(passwordStrength.strength / 4) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Підтвердіть новий пароль"
                    className="block w-full px-4 py-3.5 bg-gray-50 border-0 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-gray-300 focus:outline-none pr-10"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Паролі не співпадають</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3.5 px-4 rounded-full text-base font-medium text-white transition-colors duration-200 ${
                    isLoading ? "bg-gray-300" : "bg-gray-900 hover:bg-black"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                      Оновлення пароля...
                    </>
                  ) : (
                    "Зберегти новий пароль"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <footer className="py-6 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-8">
          <Link href="/support/faq" className="text-xs text-gray-500 hover:text-gray-700">
            Часті питання
          </Link>
          <Link href="/support/contact" className="text-xs text-gray-500 hover:text-gray-700">
            Підтримка
          </Link>
          <Link href="/privacy" className="text-xs text-gray-500 hover:text-gray-700">
            Конфіденційність
          </Link>
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} {Store.name}
          </p>
        </div>
      </footer>
    </div>
  )
}
