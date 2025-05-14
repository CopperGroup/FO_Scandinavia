"use client"

import type React from "react"
import { useState, useEffect } from "react"
import axios from "axios"
import Link from "next/link"
import { Store } from "@/constants/store"
import { AtSign, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
import { useRouter } from "next/navigation"
import { sendResetPasswordEmail } from "@/lib/email/resetPass"

const ResetPass = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [disabled, setDisabled] = useState(true)
  const [email, setEmail] = useState("")
  const [wasSended, setWasSended] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    if (email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setDisabled(false)
    } else {
      setDisabled(true)
    }
  }, [email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      await sendResetPasswordEmail({ email })
      setWasSended(true)
    } catch (error: any) {
      console.log(error)
      setError(error.response?.data?.message || "Помилка при відправці листа. Спробуйте пізніше.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex justify-center mb-8">
          <h1 className="text-2xl font-medium text-gray-900">{Store.name}</h1>
        </Link>
        
        {wasSended ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AtSign className="h-8 w-8 text-gray-600" />
            </div>
            <h2 className="text-3xl font-light text-gray-900 mb-4">Лист відправлено</h2>
            <p className="text-gray-500 mb-8">
              Ми надіслали інструкції з відновлення пароля на вашу електронну адресу. Перевірте вашу пошту, включаючи папку &quot;Спам&quot;.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="px-6 py-3.5 bg-gray-900 text-white rounded-lg hover:bg-black transition-all duration-200"
            >
              Повернутися до входу
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-500 hover:text-gray-700 mb-8"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span>Назад</span>
            </button>
            
            <h2 className="text-3xl font-light text-gray-900 mb-2">Відновлення пароля</h2>
            <p className="text-gray-500 mb-8">
              Введіть адресу електронної пошти, пов&apos;язану з вашим обліковим записом, і ми надішлемо вам посилання для скидання пароля.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center p-3 text-sm text-red-500 bg-red-50 rounded-lg">
                  <AlertCircle className="flex-shrink-0 w-4 h-4 mr-2" />
                  <span>{error}</span>
                </div>
              )}
              
              <div className="space-y-2">
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setError("")
                    }}
                    className="block w-full px-4 py-3.5 text-gray-900 bg-gray-50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
                    placeholder="Email"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <AtSign className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={disabled || isLoading}
                className={`w-full flex justify-center items-center py-3.5 px-4 rounded-lg text-white text-base font-medium transition-all duration-200 ${
                  disabled || isLoading
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-gray-900 hover:bg-black"
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Відправка...
                  </>
                ) : (
                  "Відправити інструкції"
                )}
              </button>
            </form>
          </>
        )}
      </div>
      
      <footer className="mt-16 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} {Store.name}. Усі права захищені.</p>
      </footer>
    </div>
  )
}

export default ResetPass
