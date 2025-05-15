"use client"

import { Label } from "@/components/ui/label"

import type React from "react"

import type * as z from "zod"
import Image from "next/image"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { OrderValidation } from "@/lib/validations/order"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { useAppContext } from "@/app/(root)/context"
import { createOrder, fetchOrder } from "@/lib/actions/order.actions"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import {
  CheckCircle,
  Truck,
  CreditCard,
  MessageSquare,
  ShoppingCart,
  Phone,
  Package,
  Loader2,
  Tag,
  AlertCircle,
  User,
  Mail,
} from "lucide-react"
import Confetti from "react-confetti"
import { trackFacebookEvent } from "@/helpers/pixel"
import { Store } from "@/constants/store"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { signIn } from "next-auth/react"
import { fetchUserByEmail } from "@/lib/actions/user.actions"
import axios from "axios"
import { MailIcon, Lock, UserIcon, ArrowLeft, RefreshCw } from "lucide-react"
import { CitySelect } from "@/components/interface/nova/city-select"
import { WarehouseSelect } from "@/components/interface/nova/warehouse-select"
import { validatePromoCode } from "@/lib/actions/promocode.actions"
import { sendOrderEmail } from "@/lib/email/order"
import { sendAdminOrderNotification } from "@/lib/email/admin-order"

type CartProduct = {
  id: string
  name: string
  image: string
  price: number
  priceWithoutDiscount: number
  quantity: number
}

type AuthView = "login" | "register" | "success"

const CreateOrder = ({ stringifiedUser, email }: { stringifiedUser: string; email: string }) => {
  const currentUser = JSON.parse(stringifiedUser)
  const router = useRouter()
  const { cartData, setCartData } = useAppContext()
  const [isOrderCreated, setIsOrderCreated] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  const [showThankYou, setShowThankYou] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [position, setPosition] = useState<"fixed" | "relative">("fixed")

  // Promocode states
  const [promocode, setPromocode] = useState("")
  const [isApplyingPromo, setIsApplyingPromo] = useState(false)
  const [promoError, setPromoError] = useState("")
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null)
  const [promoResult, setPromoResult] = useState<string | null>(null)

  // Auth modal states
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authView, setAuthView] = useState<AuthView>("register") // Default to register for non-logged users
  const [isLoading, setIsLoading] = useState(false)
  const [discountCodeSent, setDiscountCodeSent] = useState(false)
  const [resendingCode, setResendingCode] = useState(false)
  const [loginError, setLoginError] = useState("")
  const [registerError, setRegisterError] = useState("")

  // Form states
  const [loginForm, setLoginForm] = useState({ email: "", password: "" })
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", phone: "", password: "" })

  // Calculate original price
  const originalPrice = cartData.reduce(
    (acc: number, data: { price: number; quantity: number }) => acc + data.price * data.quantity,
    0,
  )

  // Calculate price with discount
  const priceToPay = appliedPromo ? originalPrice * (1 - appliedPromo.discount / 100) : originalPrice

  // Format price to display with 2 decimal places
  const formattedPriceToPay = priceToPay.toFixed(2)
  const discountAmount = appliedPromo ? (originalPrice - priceToPay).toFixed(2) : "0.00"

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener("resize", handleResize)
    handleResize()

    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Reset form and view state when modal closes
  useEffect(() => {
    if (!showAuthModal) {
      setTimeout(() => {
        setLoginForm({ email: "", password: "" })
        setRegisterForm({ name: "", email: "", phone: "", password: "" })
        setDiscountCodeSent(false)
      }, 300)
    }
  }, [showAuthModal])

  const defaultValues = {
    email: email,
    cityRef: "",
    warehouseRef: "",
    warehouseIndex: "",
    name: currentUser?.name || "",
    surname: currentUser?.surname || "",
    phoneNumber: currentUser?.phoneNumber || "",
    paymentType: undefined,
    deliveryMethod: undefined,
    city: "",
    comment: "",
  }

  const form = useForm<z.infer<typeof OrderValidation>>({
    resolver: zodResolver(OrderValidation),
    defaultValues,
  })

  // Reset fields when delivery method changes
  useEffect(() => {
    const deliveryMethod = form.watch("deliveryMethod")
    if (deliveryMethod) {
      // Reset fields when delivery method changes
      form.setValue("warehouseRef", "")
      form.setValue("warehouseIndex", "")
    }
  }, [form.watch("deliveryMethod"), form])

  const products = cartData.map((product: CartProduct) => ({
    product: product.id,
    amount: product.quantity,
  }))

  // Update the handleApplyPromocode function in the CreateOrder component
  const handleApplyPromocode = async () => {
    // If user is not logged in, show auth modal
    if (!email) {
      setShowAuthModal(true)
      return
    }

    setIsApplyingPromo(true)
    setPromoError("")

    try {
      // For custom promo codes, use the provided function
      const result = await validatePromoCode({
        promoCode: promocode,
        email: email,
      })

      setPromoResult(result)

      if (result === "UNVALID") {
        setPromoError("Недійсний промокод. Перевірте правильність введення або термін дії.")
      } else {
        // Extract discount from the promo code
        const promoParts = result.split("-")
        if (promoParts.length >= 2) {
          const body = promoParts[1]
          // Extract discount value based on the function logic
          const discountEndIndex = body.length - (4 + 3 + 8 + 1)
          const discountValue = Number.parseInt(body.slice(0, discountEndIndex))

          if (!isNaN(discountValue)) {
            setAppliedPromo({
              code: promocode.toUpperCase(),
              discount: discountValue,
            })
            // Update the promocode to the new one with reduced uses
            setPromocode(result)
          } else {
            setPromoError("Помилка при обробці промокоду.")
          }
        }
      }
    } catch (error) {
      console.error("Error applying promocode:", error)
      setPromoError("Помилка при перевірці промокоду. Спробуйте пізніше.")
    } finally {
      setIsApplyingPromo(false)
    }
  }

  const handleRemovePromocode = () => {
    setAppliedPromo(null)
    setPromocode("")
    setPromoError("")
  }

  const onSubmit = async (values: z.infer<typeof OrderValidation>) => {
    try {
      setIsSubmitting(true)

      // Include promocode info in the order if applied
      const orderData = {
        products: products,
        userId: currentUser?._id,
        value: Number.parseFloat(formattedPriceToPay), // Use the discounted price
        name: values.name,
        surname: values.surname,
        phoneNumber: values.phoneNumber,
        email: values.email,
        paymentType: values.paymentType,
        deliveryMethod: values.deliveryMethod,
        city: values.city,
        comment: values.comment,
        promocode: appliedPromo ? appliedPromo.code : undefined,
        discount: appliedPromo ? appliedPromo.discount : undefined,
        promoResult: promoResult || undefined,
        cityRef: values.cityRef,
        warehouse: values.warehouse,
        warehouseRef: values.warehouseRef,
        warehouseIndex: values.warehouseIndex,
        adress: "",
        postalCode: "",
        streetRef: "",
        buildingNumber: "E",
        apartment: "",
      }

      const result = await createOrder(orderData, "json")

      const createdOrder = await fetchOrder({ orderId: JSON.parse(result).id }, "json");

      const order = JSON.parse(createdOrder)

      trackFacebookEvent("Purchase", {
        value: Number.parseFloat(formattedPriceToPay),
        currency: "UAH",
        content_ids: cartData.map((product: CartProduct) => product.id),
      })

      setCartData([])
      await sendOrderEmail(order)
      await sendAdminOrderNotification(order)
      setIsOrderCreated(true)
      setOrderId(order.id)
      setTimeout(() => setShowThankYou(true), 3000)
      setTimeout(() => setShowConfetti(true), 3500)
    } catch (error) {
      console.error("Error creating order:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Auth modal handlers
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setLoginError("")

    try {
      const result = await fetchUserByEmail({ email: loginForm.email }, "json")
      const user = JSON.parse(result)

      if (user) {
        if (!user.selfCreated) {
          try {
            const res = await signIn("credentials", {
              email: loginForm.email,
              password: loginForm.password,
              redirect: false,
            })

            if (res?.error) {
              setLoginError("Неправильний email або пароль")
              setIsLoading(false)
              return
            }

            setShowAuthModal(false)
            // Apply the WELCOME10 promocode automatically after login
            // setAppliedPromo({ code: "WELCOME10", discount: 10 })
            // setPromocode("WELCOME10")
          } catch (error) {
            console.log(error)
            setLoginError("Помилка входу. Спробуйте пізніше.")
          }
        }
      } else {
        setLoginError("Користувача не знайдено")
      }
    } catch (error) {
      console.error("Error during login:", error)
      setLoginError("Помилка входу. Спробуйте пізніше.")
    }

    setIsLoading(false)
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setRegisterError("")

    try {
      // Create user object from form data
      const user = {
        name: registerForm.name,
        email: registerForm.email,
        phone: registerForm.phone,
        password: registerForm.password,
      }

      // Send registration request
      await axios.post("/api/users/signup", user)

      // After successful registration, show success view
      setAuthView("success")
      setDiscountCodeSent(true)

      // Auto-login after registration
      try {
        await signIn("credentials", {
          email: registerForm.email,
          password: registerForm.password,
          redirect: false,
        })

        // Apply the WELCOME10 promocode automatically after registration
        // setAppliedPromo({ code: "WELCOME10", discount: 10 })
        // setPromocode("WELCOME10")
      } catch (loginError) {
        console.error("Error during auto-login after registration:", loginError)
      }
    } catch (error) {
      console.error("Error during registration:", error)
      setRegisterError("Помилка реєстрації. Можливо, цей email вже використовується.")
    }

    setIsLoading(false)
  }

  const handleResendCode = () => {
    setResendingCode(true)

    // Simulate resending code
    setTimeout(() => {
      setResendingCode(false)
      setDiscountCodeSent(true)
    }, 1500)
  }

  // Auth modal views
  const renderLoginView = () => (
    <>
      <DialogHeader className="space-y-2 px-1 sm:px-0">
        <DialogTitle className="text-lg sm:text-xl font-semibold text-center">Увійти до облікового запису</DialogTitle>
        <DialogDescription className="text-center text-sm sm:text-base">
          Увійдіть, щоб отримати знижку 10% на ваше замовлення
        </DialogDescription>
      </DialogHeader>

      {loginError && (
        <Alert variant="destructive" className="mt-3 text-xs sm:text-sm py-2">
          <AlertDescription>{loginError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleLoginSubmit} className="space-y-3 sm:space-y-4 mt-3">
        <div className="space-y-1 sm:space-y-2">
          <Label htmlFor="email" className="text-xs sm:text-sm">
            Email
          </Label>
          <div className="relative">
            <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
            <Input
              id="email"
              type="email"
              placeholder="ваш@email.com"
              className="pl-8 sm:pl-10 rounded-xl h-10 text-sm"
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-1 sm:space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="password" className="text-xs sm:text-sm">
              Пароль
            </Label>
            <a href="#" className="text-xs text-gray-500 hover:text-gray-900">
              Забули пароль?
            </a>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="pl-8 sm:pl-10 rounded-xl h-10 text-sm"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full py-2 text-sm"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              Вхід...
            </>
          ) : (
            "Увійти"
          )}
        </Button>
      </form>

      <div className="mt-4 sm:mt-6 text-center">
        <p className="text-xs sm:text-sm text-gray-500">
          Новенький тут?{" "}
          <button
            type="button"
            onClick={() => setAuthView("register")}
            className="text-gray-900 font-medium hover:underline"
            disabled={isLoading}
          >
            Можеш <span className="text-red-600 font-bold">зареєструватися і отримати -10%</span> на перше замовлення
          </button>
        </p>
      </div>
    </>
  )

  const renderRegisterView = () => (
    <>
      <DialogHeader className="space-y-2 px-1 sm:px-0">
        <DialogTitle className="text-lg sm:text-xl font-semibold text-center">Створити обліковий запис</DialogTitle>
        <DialogDescription className="text-center text-sm sm:text-base">
          Зареєструйтеся та отримайте <span className="text-red-600 font-bold">знижку 10%</span> на перше замовлення
        </DialogDescription>
      </DialogHeader>

      <button
        type="button"
        onClick={() => setAuthView("login")}
        className="flex items-center text-xs sm:text-sm text-gray-500 hover:text-gray-900 mb-3"
        disabled={isLoading}
      >
        <ArrowLeft className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
        Вже маєте обліковий запис? Увійти
      </button>

      {registerError && (
        <Alert variant="destructive" className="mb-3 text-xs sm:text-sm py-2">
          <AlertDescription>{registerError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleRegisterSubmit} className="space-y-3 sm:space-y-4">
        <div className="space-y-1 sm:space-y-2">
          <Label htmlFor="name" className="text-xs sm:text-sm">
            Ім&apos;я
          </Label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
            <Input
              id="name"
              type="text"
              placeholder="Ваше ім'я"
              className="pl-8 sm:pl-10 rounded-xl h-10 text-sm"
              value={registerForm.name}
              onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-1 sm:space-y-2">
          <Label htmlFor="register-email" className="text-xs sm:text-sm">
            Email
          </Label>
          <div className="relative">
            <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
            <Input
              id="register-email"
              type="email"
              placeholder="ваш@email.com"
              className="pl-8 sm:pl-10 rounded-xl h-10 text-sm"
              value={registerForm.email}
              onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-1 sm:space-y-2">
          <Label htmlFor="phone" className="text-xs sm:text-sm">
            Номер телефону
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
            <Input
              id="phone"
              type="tel"
              placeholder="+380 XX XXX XX XX"
              className="pl-8 sm:pl-10 rounded-xl h-10 text-sm"
              value={registerForm.phone}
              onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-1 sm:space-y-2">
          <Label htmlFor="register-password" className="text-xs sm:text-sm">
            Пароль
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
            <Input
              id="register-password"
              type="password"
              placeholder="••••••••"
              className="pl-8 sm:pl-10 rounded-xl h-10 text-sm"
              value={registerForm.password}
              onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full py-2 text-sm"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              Реєстрація...
            </>
          ) : (
            "Зареєструватися та отримати знижку"
          )}
        </Button>
      </form>
    </>
  )

  const renderSuccessView = () => (
    <>
      <DialogHeader className="space-y-1 sm:space-y-2 px-1 sm:px-0">
        <DialogTitle className="text-lg sm:text-xl font-semibold text-center">Реєстрація успішна!</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col items-center justify-center py-4 sm:py-6">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
          <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
        </div>
        <p className="text-center text-sm sm:text-base text-gray-700 mb-4 sm:mb-6">
          Дякуємо за реєстрацію! Ваш промокод на знижку 10% надіслано на вашу електронну пошту.
        </p>

        <Alert className="bg-gray-50 border-gray-200">
          <AlertDescription className="text-xs sm:text-sm text-gray-700">
            {discountCodeSent ? (
              <>
                Перевірте вашу електронну пошту. Не отримали код?{" "}
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="text-gray-900 font-medium hover:underline inline-flex items-center"
                  disabled={resendingCode}
                >
                  {resendingCode ? (
                    <>
                      <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                      Надсилаємо...
                    </>
                  ) : (
                    "Надіслати ще раз"
                  )}
                </button>
              </>
            ) : (
              <>
                <RefreshCw className="inline mr-1 h-3 w-3 animate-spin" />
                Надсилаємо промокод на вашу електронну пошту...
              </>
            )}
          </AlertDescription>
        </Alert>
      </div>

      <DialogFooter>
        <Button
          onClick={() => setShowAuthModal(false)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full py-2 text-sm"
        >
          Продовжити оформлення замовлення
        </Button>
      </DialogFooter>
    </>
  )

  // Check if delivery method is selected
  const isDeliveryMethodSelected = !!form.watch("deliveryMethod")

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12 overflow-x-hidden bg-blue-50 rounded-2xl sm:rounded-3xl">
      {isOrderCreated ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative w-full flex flex-col items-center max-[425px]:pt-24"
        >
          <AnimatePresence>
            {showConfetti && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 pointer-events-none"
              >
                <Confetti
                  width={windowSize.width}
                  height={windowSize.height}
                  recycle={false}
                  numberOfPieces={200}
                  gravity={0.1}
                  colors={["#f3f4f6", "#e5e7eb", "#d1d5db", "#9ca3af"]}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 20, 1] }}
            transition={{
              duration: 1,
              times: [0, 0.7, 1],
              ease: "easeInOut",
            }}
            style={{
              position: position,
              left: position === "fixed" ? "50%" : "0%",
              translateX: position === "fixed" ? "-50%" : "0%",
              translateY: position === "fixed" ? "-50%" : "0%",
            }}
            onAnimationComplete={() => setPosition("relative")}
            className="bg-white rounded-full p-8 mb-8 overflow-hidden shadow-lg"
          >
            <motion.div
              initial={{ y: -200, rotate: 0 }}
              animate={{ y: 0, rotate: [0, -10, 10, -5, 5, 0] }}
              transition={{
                y: { delay: 1.2, duration: 0.3 },
                rotate: { delay: 1.5, duration: 0.5, ease: "easeInOut" },
              }}
            >
              <Package className="w-16 h-16 text-gray-900" />
            </motion.div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.2, duration: 0.5 }}
            className="text-center mt-7"
          >
            <motion.h1
              className="text-4xl font-semibold text-gray-900 mb-6 tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.5 }}
            >
              Замовлення створено успішно!
            </motion.h1>
            <motion.p
              className="text-lg text-gray-500 mb-8 max-w-md mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.7 }}
            >
              Дякуємо за ваше замовлення. Ми вже почали готувати його до відправлення.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.9 }}
            >
              <Button
                onClick={() => router.push(`/myOrders/${orderId}`)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 h-auto rounded-full text-base font-medium transition duration-300 w-full sm:w-auto shadow-md"
              >
                {windowSize.width > 380 ? "Переглянути деталі замовлення" : "Переглянути деталі"}
              </Button>
              <Button
                onClick={() => router.push("/")}
                variant="outline"
                className="px-6 py-3 h-auto rounded-full text-base font-medium border-gray-300 hover:bg-gray-100 transition duration-300 w-full sm:w-auto"
              >
                Повернутися до магазину
              </Button>
            </motion.div>
            <AnimatePresence>
              {showThankYou && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="mt-12 text-lg font-medium text-gray-900"
                >
                  Дякуємо за покупку!
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      ) : (
        <>
          <h1 className="w-full text-2xl sm:text-3xl md:text-4xl font-semibold text-gray-900 mb-3 sm:mb-6 text-center tracking-tight">
            Оформлення замовлення
          </h1>
          <p className="text-center text-sm sm:text-base text-gray-500 mb-6 sm:mb-10 max-w-2xl mx-auto">
            Заповніть форму нижче, щоб завершити ваше замовлення. Всі поля, позначені зірочкою (*), є
            обов&apos;язковими.
          </p>

          {!email && (
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 sm:p-6 rounded-3xl text-white mb-6 sm:mb-8 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="bg-yellow-400/30 p-3 rounded-full hidden sm:block">
                  <Tag className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center sm:hidden mb-3">
                    <div className="bg-yellow-400/30 p-2 rounded-full mr-3">
                      <Tag className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-lg font-medium">Знижка 10%</h3>
                  </div>
                  <h3 className="text-xl font-medium mb-2 hidden sm:block">Отримайте знижку 10% на ваше замовлення!</h3>
                  <p className="text-gray-200 mb-4 text-sm sm:text-base">
                    Зареєструйтеся або увійдіть, щоб отримати знижку 10% на ваше перше замовлення.
                  </p>
                  <Button
                    onClick={() => setShowAuthModal(true)}
                    className="w-full sm:w-auto bg-white text-gray-900 hover:bg-gray-100 rounded-full shadow-sm text-sm sm:text-base"
                  >
                    Зареєструватися та отримати знижку
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl border-blue-100 shadow-sm">
                    <h2 className="text-lg sm:text-xl font-medium text-gray-900 mb-4 sm:mb-6 flex items-center">
                      <User className="w-5 h-5 mr-2 text-gray-900" />
                      Особисті дані
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Ім&apos;я *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="rounded-2xl border-blue-100 shadow-sm h-12 px-4 transition-all focus:border-gray-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormMessage className="text-sm" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="surname"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Прізвище *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className="rounded-2xl border-blue-100 shadow-sm h-12 px-4 transition-all focus:border-gray-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormMessage className="text-sm" />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                      <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Номер телефону *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                <Input
                                  {...field}
                                  className="pl-10 rounded-2xl border-blue-100 shadow-sm h-12 transition-all focus:border-gray-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                  disabled={isSubmitting}
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-sm" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Email *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                <Input
                                  {...field}
                                  className="pl-10 rounded-2xl border-blue-100 shadow-sm h-12 transition-all focus:border-gray-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                  disabled={isSubmitting}
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-sm" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl border-blue-100 shadow-sm">
                    <h2 className="text-lg sm:text-xl font-medium text-gray-900 mb-4 sm:mb-6 flex items-center">
                      <Truck className="w-5 h-5 mr-2 text-gray-900" />
                      Доставка
                    </h2>
                    <FormField
                      control={form.control}
                      name="deliveryMethod"
                      render={({ field }) => (
                        <FormItem className="mb-6">
                          <FormLabel className="text-sm font-medium text-gray-700">Спосіб доставки *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                            <FormControl>
                              <SelectTrigger className="rounded-2xl border-blue-100 shadow-sm h-12 transition-all focus:border-gray-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50">
                                <SelectValue placeholder="Виберіть спосіб доставки" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-2xl shadow-md">
                              <SelectItem value="Нова пошта (У відділення)">Нова пошта (У відділення)</SelectItem>
                              <SelectItem value="Нова пошта (Поштомат)">Нова пошта (Поштомат)</SelectItem>
                              <SelectItem value="УкрПошта (Відділення)">УкрПошта (Відділення)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-sm" />
                        </FormItem>
                      )}
                    />

                    {/* City field - always required */}
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => {
                        const deliveryMethod = form.watch("deliveryMethod") || ""
                        const isUkrPoshta = deliveryMethod.includes("УкрПошта")

                        return (
                          <FormItem className="mb-6">
                            <FormLabel className="text-sm font-medium text-gray-700">Місто *</FormLabel>
                            {isUkrPoshta ? (
                              <FormControl>
                                <Input
                                  {...field}
                                  className="rounded-2xl border-blue-100 shadow-sm h-12 px-4 transition-all focus:border-gray-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                  disabled={isSubmitting}
                                  placeholder="Введіть назву міста"
                                />
                              </FormControl>
                            ) : (
                              <CitySelect
                                value={field.value}
                                onChange={(value, ref) => {
                                  field.onChange(value)
                                  form.setValue("city", value)
                                  form.setValue("cityRef", ref)
                                  // Reset warehouse when city changes
                                  form.setValue("warehouseRef", "")
                                  form.setValue("warehouseIndex", "")
                                }}
                                disabled={isSubmitting || !isDeliveryMethodSelected}
                              />
                            )}
                            <FormMessage className="text-sm" />
                          </FormItem>
                        )
                      }}
                    />

                    {/* Warehouse select for Nova Poshta office/poshtomat or direct input for UkrPoshta */}
                    {isDeliveryMethodSelected && (
                      <FormField
                        control={form.control}
                        name="warehouseRef"
                        render={({ field }) => {
                          const deliveryMethod = form.watch("deliveryMethod") || ""
                          const isUkrPoshta = deliveryMethod.includes("УкрПошта")

                          if (isUkrPoshta) {
                            return (
                              <FormItem className="mb-6">
                                <FormLabel className="text-sm font-medium text-gray-700">Відділення *</FormLabel>
                                <FormControl>
                                  <Input
                                    value={field.value}
                                    onChange={(e) => {
                                      field.onChange(e.target.value)
                                      form.setValue("warehouse", e.target.value)
                                    }}
                                    className="rounded-2xl border-blue-100 shadow-sm h-12 px-4 transition-all focus:border-gray-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                    disabled={isSubmitting}
                                    placeholder="Введіть номер відділення"
                                  />
                                </FormControl>
                                <FormMessage className="text-sm" />
                              </FormItem>
                            )
                          }

                          const warehouseType = deliveryMethod.includes("Поштомат") ? "Postomat" : "Branch"

                          return (
                            <FormItem className="mb-6">
                              <FormLabel className="text-sm font-medium text-gray-700">
                                {deliveryMethod.includes("Поштомат") ? "Поштомат" : "Відділення"} *
                              </FormLabel>
                              <WarehouseSelect
                                cityRef={form.watch("cityRef")}
                                value={field.value}
                                onChange={(value, ref, index) => {
                                  field.onChange(ref)
                                  if (index) form.setValue("warehouseIndex", index)
                                  if (value) form.setValue("warehouse", value)
                                }}
                                disabled={isSubmitting || !form.watch("cityRef")}
                                type={warehouseType}
                              />
                              <FormMessage className="text-sm" />
                            </FormItem>
                          )
                        }}
                      />
                    )}

                    <input type="hidden" {...form.register("cityRef")} />
                    <input type="hidden" {...form.register("warehouseRef")} />
                    <input type="hidden" {...form.register("warehouseIndex")} />
                  </div>

                  <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl border-blue-100 shadow-sm">
                    <h2 className="text-lg sm:text-xl font-medium text-gray-900 mb-4 sm:mb-6 flex items-center">
                      <CreditCard className="w-5 h-5 mr-2 text-gray-900" />
                      Оплата
                    </h2>
                    <FormField
                      control={form.control}
                      name="paymentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Спосіб оплати *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={isSubmitting || !isDeliveryMethodSelected}
                          >
                            <FormControl>
                              <SelectTrigger className="rounded-2xl border-blue-100 shadow-sm h-12 transition-all focus:border-gray-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50">
                                <SelectValue placeholder="Виберіть спосіб оплати" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-2xl shadow-md">
                              <SelectItem value="Накладний платіж">Накладний платіж</SelectItem>
                              <SelectItem value="За реквізитами">За реквізитами</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-sm" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl border-blue-100 shadow-sm">
                    <h2 className="text-xl font-medium text-gray-900 mb-4 sm:mb-6 flex items-center">
                      <Tag className="w-5 h-5 mr-2 text-gray-900" />
                      Промокод
                    </h2>

                    {appliedPromo ? (
                      <div className="flex flex-col space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-yellow-50 p-4 rounded-2xl border border-blue-100 shadow-sm">
                          <div className="flex items-center mb-3 sm:mb-0">
                            <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-900">{appliedPromo.code}</p>
                              <p className="text-sm text-gray-500">Знижка {appliedPromo.discount}% застосована</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRemovePromocode}
                            className="text-gray-500 hover:text-gray-900 self-end sm:self-auto"
                          >
                            Видалити
                          </Button>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Знижка:</span>
                          <span className="font-medium text-blue-600">
                            -{discountAmount} {Store.currency_sign}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input
                            placeholder="Введіть промокод"
                            value={promocode}
                            onChange={(e) => setPromocode(e.target.value)}
                            className="rounded-2xl border-blue-100 shadow-sm h-12 transition-all focus:border-gray-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50 mb-2 sm:mb-0"
                            disabled={isApplyingPromo || isSubmitting || !isDeliveryMethodSelected}
                          />
                          <Button
                            type="button"
                            onClick={handleApplyPromocode}
                            disabled={!promocode || isApplyingPromo || isSubmitting || !isDeliveryMethodSelected}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-sm w-full sm:w-auto"
                          >
                            {isApplyingPromo ? (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                <span className="whitespace-nowrap">Перевірка...</span>
                              </>
                            ) : (
                              "Застосувати"
                            )}
                          </Button>
                        </div>

                        {promoError && (
                          <div className="flex items-center text-red-600 text-sm">
                            <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span>{promoError}</span>
                          </div>
                        )}

                        {!email && (
                          <div className="text-sm text-gray-500 mt-2 bg-yellow-50 p-3 rounded-xl border border-yellow-200">
                            <p className="flex items-center">
                              <Tag className="h-4 w-4 mr-2 text-gray-500" />
                              Зареєструйтеся, щоб отримати промокод на знижку 10% на перше замовлення.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl border-blue-100 shadow-sm">
                    <h2 className="text-lg sm:text-xl font-medium text-gray-900 mb-4 sm:mb-6 flex items-center">
                      <MessageSquare className="w-5 h-5 mr-2 text-gray-900" />
                      Коментар
                    </h2>
                    <FormField
                      control={form.control}
                      name="comment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">Коментар до замовлення</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={4}
                              className="rounded-2xl border-blue-100 shadow-sm transition-all focus:border-gray-400 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                              disabled={isSubmitting || !isDeliveryMethodSelected}
                              placeholder="Додаткова інформація щодо замовлення"
                            />
                          </FormControl>
                          <FormMessage className="text-sm" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || isOrderCreated || !isDeliveryMethodSelected}
                    className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 h-auto rounded-full text-base font-medium transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Обробка замовлення...
                      </>
                    ) : (
                      "Підтвердити замовлення"
                    )}
                  </Button>
                </form>
              </Form>
            </div>

            <div className="lg:sticky lg:top-6 self-start">
              <div className="bg-white rounded-3xl border border-blue-100 overflow-hidden shadow-sm">
                <div className="p-4 sm:p-6 bg-yellow-50">
                  <h2 className="text-lg sm:text-xl font-medium flex items-center text-gray-900">
                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-gray-900" />
                    Ваше замовлення
                  </h2>
                </div>
                <div className="max-h-[calc(100vh-300px)] overflow-y-auto p-4 sm:p-6">
                  {cartData.map((item: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center mb-4 pb-4 border-b border-yellow-100 last:border-b-0 last:pb-0 last:mb-0"
                    >
                      <div className="min-w-16 w-16 h-16 sm:min-w-24 sm:w-24 sm:h-24 bg-yellow-50 rounded-xl sm:rounded-2xl flex items-center justify-center mr-3 sm:mr-4">
                        <Image
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          width={60}
                          height={60}
                          className="object-contain"
                        />
                      </div>
                      <div className="flex-grow">
                        <h3 className="text-sm sm:text-base font-medium text-gray-900 line-clamp-2">{item.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-500">Кількість: {item.quantity}</p>
                        <p className="text-sm sm:text-base font-medium text-gray-900">
                          {item.price.toFixed(2)}
                          {Store.currency_sign}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                  {/* <FreeDeliveryProgress
                    currentAmount={Number.parseFloat(formattedPriceToPay)}
                    threshold={Store.freeDelivery}
                  /> */}
                </div>
                <div className="p-4 sm:p-6 bg-yellow-50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm sm:text-base text-gray-700">Підсумок:</span>
                    <span className="text-sm sm:text-base font-medium text-gray-900">
                      {originalPrice.toFixed(2)}
                      {Store.currency_sign}
                    </span>
                  </div>

                  {appliedPromo && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm sm:text-base text-gray-700">Знижка ({appliedPromo.discount}%):</span>
                      <span className="text-sm sm:text-base font-medium text-blue-600">
                        -{discountAmount}
                        {Store.currency_sign}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base text-gray-700">Доставка:</span>
                    <span className="text-sm sm:text-base font-medium text-gray-900">Безкоштовно</span>
                  </div>
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-base sm:text-lg font-medium text-gray-900">Загальна сума:</span>
                    <span className="text-lg sm:text-xl font-medium text-gray-900">
                      {formattedPriceToPay}
                      {Store.currency_sign}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 sm:mt-6 bg-white p-4 sm:p-6 rounded-3xl border border-blue-100 shadow-sm">
                <h3 className="text-base sm:text-lg font-medium mb-2 flex items-center text-gray-900">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-gray-900" />
                  Гарантія безпеки
                </h3>
                <p className="text-sm sm:text-base text-gray-700">
                  Ваші особисті дані в безпеці, ми використовуємо найновіші технології шифрування і не зберігаємо
                  інформації про рахунки клієнтів.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="sm:max-w-md p-4 sm:p-6 rounded-2xl max-w-[calc(100%-32px)]">
          {authView === "login" && renderLoginView()}
          {authView === "register" && renderRegisterView()}
          {authView === "success" && renderSuccessView()}
        </DialogContent>
      </Dialog>
    </div>
  )
}

const FreeDeliveryProgress = ({ currentAmount, threshold }: { currentAmount: number; threshold: number }) => {
  const progress = Math.min((currentAmount / threshold) * 100, 100)
  const remaining = threshold - currentAmount

  return (
    <div className="bg-[#f8f8fa] rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2">
        <span className="text-xs sm:text-sm font-medium text-gray-900 mb-1 sm:mb-0">Безкоштовна доставка</span>
        <span className="text-xs sm:text-sm text-gray-500">
          {currentAmount.toFixed(0)} / {threshold} {Store.currency_sign}
        </span>
      </div>
      <div className="h-1.5 sm:h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      {remaining > 0 ? (
        <p className="text-[10px] sm:text-xs text-gray-500 mt-1.5 sm:mt-2">
          Додайте ще {remaining.toFixed(0)} {Store.currency_sign} для безкоштовної доставки
        </p>
      ) : (
        <p className="text-[10px] sm:text-xs font-medium text-gray-900 mt-1.5 sm:mt-2">
          Ви отримали безкоштовну доставку!
        </p>
      )}
    </div>
  )
}

export default CreateOrder
