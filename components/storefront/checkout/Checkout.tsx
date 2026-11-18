"use client"

import { useEffect, useId, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { signIn } from "next-auth/react"
import { useForm } from "react-hook-form"
import type * as z from "zod"
import { AlertCircle, Check, Loader2, Lock, PackageCheck, ShoppingBag } from "lucide-react"
import { CityPicker, WarehousePicker } from "./DeliveryPickers"
import Logo from "@/components/storefront/Logo"
import { useShopSettings } from "@/components/storefront/ShopSettings"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Store } from "@/constants/store"
import { trackFacebookEvent } from "@/helpers/pixel"
import { createOrder } from "@/lib/actions/order.actions"
import { validatePromoCode } from "@/lib/actions/promocode.actions"
import { formatPrice, money } from "@/lib/storefront/format"
import { useCart } from "@/lib/storefront/use-cart"
import { cn } from "@/lib/utils"
import { OrderValidation } from "@/lib/validations/order"

type FormValues = z.infer<typeof OrderValidation>

const DELIVERY_METHODS = [
  { value: "Нова пошта (У відділення)", title: "У відділення Нової пошти", note: "Заберете у зручному відділенні" },
  { value: "Нова пошта (Поштомат)", title: "У поштомат Нової пошти", note: "Цілодобово, без черги" },
]

const PAYMENT_TYPES = [
  { value: "Накладний платіж", title: "При отриманні", note: "Накладений платіж: оплата у відділенні, комісію перевізника сплачує покупець" },
  { value: "За реквізитами", title: "За реквізитами", note: "Надішлемо реквізити після підтвердження замовлення" },
]

const inputClass = "field aria-[invalid=true]:border-brand-sale aria-[invalid=true]:focus:ring-brand-sale/20"

function Field({
  label,
  error,
  hint,
  optional,
  children,
}: {
  label: string
  error?: string
  hint?: string
  optional?: boolean
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby": string | undefined }) => React.ReactNode
}) {
  const id = useId()
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-brand-ink">
        {label}
        {optional && <span className="ml-2 font-normal text-brand-muted">необов’язково</span>}
      </label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-2 text-sm text-brand-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 flex items-start gap-2 text-sm text-brand-sale">
          <AlertCircle className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-brand-line py-7 first:border-t-0 first:pt-0">
      <h2 className="flex items-center gap-3 font-display text-lg font-semibold tracking-[-0.02em] text-brand-ink">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm text-white" aria-hidden="true">
          {number}
        </span>
        {title}
      </h2>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  )
}

function ChoiceCards({
  legend,
  options,
  value,
  onChange,
  error,
  disabled,
}: {
  legend: string
  options: { value: string; title: string; note: string }[]
  value: string | undefined
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
}) {
  const name = useId()
  return (
    <fieldset disabled={disabled}>
      <legend className="sr-only">{legend}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const checked = value === option.value
          return (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer gap-3 rounded-md border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand has-[:focus-visible]:ring-offset-2",
                checked ? "border-brand bg-brand-tint" : "border-brand-line hover:border-brand-ink/50",
              )}
            >
              <input type="radio" name={name} value={option.value} checked={checked} onChange={() => onChange(option.value)} className="radio check-brand mt-1" />
              <span>
                <span className="block text-base font-semibold text-brand-ink">{option.title}</span>
                <span className="mt-1 block text-sm text-brand-muted">{option.note}</span>
              </span>
            </label>
          )
        })}
      </div>
      {error && (
        <p role="alert" className="mt-2 flex items-start gap-2 text-sm text-brand-sale">
          <AlertCircle className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </fieldset>
  )
}

/** Extracts the percentage from a validated promo code ("DV-10…"). */
function promoDiscount(code: string): number | null {
  const body = code.split("-")[1]
  if (!body) return null
  const value = Number.parseInt(body.slice(0, body.length - (4 + 3 + 8 + 1)))
  return Number.isNaN(value) ? null : value
}

export type CheckoutProfile = { id: string; name: string; surname: string; phoneNumber: string }

/** A code of the signed-in customer that still works: offered under the promo field, one tap to apply. */
export type CheckoutPromo = { code: string; percent: number | null }

export default function Checkout({ profile, email, promoCodes = [] }: { profile: CheckoutProfile | null; email: string; promoCodes?: CheckoutPromo[] }) {
  const router = useRouter()
  const cart = useCart()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)
  const pickerId = useId()

  const [promocode, setPromocode] = useState("")
  const [isApplyingPromo, setIsApplyingPromo] = useState(false)
  const [promoError, setPromoError] = useState("")
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null)
  const [promoResult, setPromoResult] = useState<string | null>(null)

  const [authOpen, setAuthOpen] = useState(false)
  const [authView, setAuthView] = useState<"login" | "register" | "success" | "confirm">("register")
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState("")
  const [loginForm, setLoginForm] = useState({ email: "", password: "" })
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", phone: "", password: "" })

  const form = useForm<FormValues>({
    resolver: zodResolver(OrderValidation),
    defaultValues: {
      email: email ?? "",
      name: profile?.name || "",
      surname: profile?.surname || "",
      phoneNumber: profile?.phoneNumber || "",
      paymentType: "",
      deliveryMethod: "",
      city: "",
      cityRef: "",
      warehouse: "",
      warehouseRef: "",
      warehouseIndex: "",
      comment: "",
      termsAgreed: false,
    },
  })
  const { errors } = form.formState
  const deliveryMethod = form.watch("deliveryMethod")
  const paymentType = form.watch("paymentType")
  const cityRef = form.watch("cityRef")

  // Signing in from the promo dialog refreshes the page data; carry the account e-mail into the form.
  useEffect(() => {
    if (email && !form.getValues("email")) form.setValue("email", email)
  }, [email, form])

  const subtotal = cart.total
  const promoAmount = appliedPromo ? Math.round(subtotal * (appliedPromo.discount / 100)) : 0
  const toPay = subtotal - promoAmount
  const { freeDelivery: freeFrom } = useShopSettings()
  const freeDelivery = freeFrom > 0 && toPay >= freeFrom

  async function applyPromocode(typed: string = promocode) {
    if (!email) {
      setAuthOpen(true)
      return
    }
    const code = typed.trim()
    setIsApplyingPromo(true)
    setPromoError("")
    try {
      const result = await validatePromoCode({ promoCode: code, email })
      setPromoResult(result)
      const discount = result === "UNVALID" ? null : promoDiscount(result)
      if (discount === null) {
        setPromoError("Цей промокод не діє. Перевірте написання та термін дії.")
      } else {
        setAppliedPromo({ code: code.toUpperCase(), discount })
      }
    } catch {
      setPromoError("Не вдалося перевірити промокод. Спробуйте ще раз за хвилину.")
    } finally {
      setIsApplyingPromo(false)
    }
  }

  function removePromocode() {
    setAppliedPromo(null)
    setPromoResult(null)
    setPromocode("")
    setPromoError("")
  }

  async function onSubmit(values: FormValues) {
    setSubmitError("")
    setIsSubmitting(true)
    try {
      const result = await createOrder(
        {
          products: cart.lines.map((line) => ({ product: line.id, amount: line.quantity })),
          userId: profile?.id,
          value: toPay,
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
        } as any,
        "json",
      )

      const created = JSON.parse(result)
      if (created?.error) {
        // Something the shopper can fix: a sold-out item, an expired promo code.
        setSubmitError(String(created.error))
        return
      }
      trackFacebookEvent("Purchase", { value: created.value ?? toPay, currency: "UAH", content_ids: cart.lines.map((line) => line.id) })

      cart.clear()
      setCreatedOrderId(String(created.id))
      window.scrollTo({ top: 0 })
    } catch (error) {
      console.error("Order was not created:", error)
      setSubmitError("Не вдалося оформити замовлення. Перевірте з’єднання і спробуйте ще раз, або напишіть нам.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function onInvalid() {
    // Take the shopper to the first field that needs attention.
    requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>("[aria-invalid='true'], [role='alert']")
      target?.scrollIntoView({ behavior: "smooth", block: "center" })
      if (target?.matches("input, textarea")) target.focus({ preventScroll: true })
    })
  }

  async function onLogin(event: React.FormEvent) {
    event.preventDefault()
    setAuthLoading(true)
    setAuthError("")
    try {
      const response = await signIn("credentials", { email: loginForm.email, password: loginForm.password, redirect: false })
      if (response?.error) setAuthError("Неправильний e-mail або пароль")
      else {
        setAuthOpen(false)
        router.refresh()
      }
    } catch {
      setAuthError("Не вдалося увійти. Спробуйте ще раз.")
    } finally {
      setAuthLoading(false)
    }
  }

  async function onRegister(event: React.FormEvent) {
    event.preventDefault()
    setAuthLoading(true)
    setAuthError("")
    try {
      const { data } = await axios.post("/api/users/signup", {
        username: registerForm.name,
        email: registerForm.email.trim(),
        password: registerForm.password,
        phoneNumber: registerForm.phone,
      })
      // The address already has orders: the account opens from the link sent to it, not here.
      if (data?.confirmEmail) {
        setAuthView("confirm")
        return
      }
      setAuthView("success")
      try {
        await signIn("credentials", { email: registerForm.email, password: registerForm.password, redirect: false })
        router.refresh()
      } catch {
        // The account exists; signing in can be done later.
      }
    } catch (error: any) {
      setAuthError(
        error?.response?.data?.code === "EMAIL_FAILED"
          ? "Не вдалося надіслати лист для підтвердження адреси. Спробуйте ще раз за хвилину."
          : "Не вдалося зареєструватися. Можливо, цей e-mail уже використовується.",
      )
    } finally {
      setAuthLoading(false)
    }
  }

  /* ------------------------------ confirmation ------------------------------ */

  if (createdOrderId) {
    return (
      <div className="shell flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-sun">
          <Check className="h-8 w-8 text-brand-ink" aria-hidden="true" />
        </span>
        <h1 className="heading-display mt-6 text-2xl sm:text-3xl">Замовлення №{createdOrderId} прийнято</h1>
        <p className="mt-4 max-w-md text-base leading-6 text-brand-muted">
          Ми зв’яжемося з вами, щоб підтвердити замовлення, і надішлемо номер накладної, щойно посилка вирушить.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href={`/myOrders/${createdOrderId}`} className="btn-blue">
            Переглянути замовлення
          </Link>
          <Link href="/catalog" className="btn-secondary">
            Повернутися до каталогу
          </Link>
        </div>
      </div>
    )
  }

  if (cart.ready && cart.lines.length === 0) {
    return (
      <div className="shell flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <ShoppingBag className="h-10 w-10 text-brand-muted/50" aria-hidden="true" />
        <h1 className="heading-display mt-4 text-2xl">Кошик порожній</h1>
        <p className="mt-2 max-w-sm text-base text-brand-muted">Щоб оформити замовлення, додайте товари з каталогу.</p>
        <Link href="/catalog" className="btn-blue mt-6">
          Перейти до каталогу
        </Link>
      </div>
    )
  }

  const warehouseLabel = deliveryMethod?.includes("Поштомат") ? "Поштомат" : "Відділення"

  return (
    <div className="shell pt-5 lg:pt-8">
      <div className="flex flex-col-reverse items-start gap-x-4 gap-y-1 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="heading-display text-2xl sm:text-3xl">Оформлення замовлення</h1>
        <Link href="/cart" className="-my-3 inline-flex min-h-11 items-center shrink-0 text-sm font-semibold text-brand hover:text-brand-deep focus-visible:outline-none focus-visible:underline">
          Назад до кошика
        </Link>
      </div>
      <p className="mt-2 text-sm text-brand-muted">Реєстрація не потрібна. Усі поля обов’язкові, крім позначених.</p>

      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} noValidate className="mt-7 grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14">
        <div className="min-w-0">
          <Step number={1} title="Контактні дані">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Ім’я" error={errors.name?.message}>
                {(props) => <input {...props} {...form.register("name")} autoComplete="given-name" disabled={isSubmitting} className={inputClass} />}
              </Field>
              <Field label="Прізвище" error={errors.surname?.message}>
                {(props) => <input {...props} {...form.register("surname")} autoComplete="family-name" disabled={isSubmitting} className={inputClass} />}
              </Field>
              <Field label="Телефон" error={errors.phoneNumber?.message} hint="Щоб підтвердити замовлення і для SMS від Нової пошти">
                {(props) => (
                  <input {...props} {...form.register("phoneNumber")} type="tel" inputMode="tel" autoComplete="tel" placeholder="+380" disabled={isSubmitting} className={inputClass} />
                )}
              </Field>
              <Field label="E-mail" error={errors.email?.message} hint="Надішлемо підтвердження замовлення">
                {(props) => (
                  <input {...props} {...form.register("email")} type="email" inputMode="email" autoComplete="email" disabled={isSubmitting} className={inputClass} />
                )}
              </Field>
            </div>
          </Step>

          <Step number={2} title="Доставка">
            <ChoiceCards
              legend="Спосіб доставки"
              options={DELIVERY_METHODS}
              value={deliveryMethod}
              disabled={isSubmitting}
              error={errors.deliveryMethod?.message}
              onChange={(value) => {
                form.setValue("deliveryMethod", value, { shouldValidate: form.formState.isSubmitted })
                // A branch is not a parcel locker: the choice below starts over.
                form.setValue("warehouse", "")
                form.setValue("warehouseRef", "")
                form.setValue("warehouseIndex", "")
              }}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p id={`${pickerId}-city`} className="mb-2 text-sm font-medium text-brand-ink">
                  Місто
                </p>
                <CityPicker
                  labelledBy={`${pickerId}-city`}
                  value={form.watch("city") ?? ""}
                  disabled={isSubmitting}
                  invalid={Boolean(errors.city?.message)}
                  onChange={(value, ref) => {
                    form.setValue("city", value, { shouldValidate: form.formState.isSubmitted })
                    form.setValue("cityRef", ref)
                    form.setValue("warehouse", "")
                    form.setValue("warehouseRef", "")
                    form.setValue("warehouseIndex", "")
                  }}
                />
                {errors.city?.message && (
                  <p role="alert" className="mt-2 flex items-start gap-2 text-sm text-brand-sale">
                    <AlertCircle className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
                    {errors.city.message}
                  </p>
                )}
              </div>

              <div>
                <p id={`${pickerId}-warehouse`} className="mb-2 text-sm font-medium text-brand-ink">
                  {warehouseLabel}
                </p>
                <WarehousePicker
                  labelledBy={`${pickerId}-warehouse`}
                  cityRef={cityRef ?? ""}
                  value={form.watch("warehouseRef") ?? ""}
                  kind={deliveryMethod?.includes("Поштомат") ? "Postomat" : "Branch"}
                  disabled={isSubmitting || !cityRef || !deliveryMethod}
                  invalid={Boolean(cityRef && deliveryMethod && errors.warehouse?.message)}
                  onChange={(value, ref, index) => {
                    form.setValue("warehouseRef", ref)
                    if (index) form.setValue("warehouseIndex", index)
                    form.setValue("warehouse", value ?? "", { shouldValidate: form.formState.isSubmitted })
                  }}
                />
                {!cityRef || !deliveryMethod ? (
                  <p className="mt-2 text-sm text-brand-muted">Спершу оберіть спосіб доставки та місто</p>
                ) : (
                  errors.warehouse?.message && (
                    <p role="alert" className="mt-2 flex items-start gap-2 text-sm text-brand-sale">
                      <AlertCircle className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
                      {deliveryMethod.includes("Поштомат") ? "Виберіть поштомат" : errors.warehouse.message}
                    </p>
                  )
                )}
              </div>
            </div>
          </Step>

          <Step number={3} title="Оплата">
            <ChoiceCards
              legend="Спосіб оплати"
              options={PAYMENT_TYPES}
              value={paymentType}
              disabled={isSubmitting}
              error={errors.paymentType?.message}
              onChange={(value) => form.setValue("paymentType", value, { shouldValidate: form.formState.isSubmitted })}
            />

            <Field label="Коментар до замовлення" optional>
              {(props) => (
                <textarea
                  {...props}
                  {...form.register("comment")}
                  rows={3}
                  disabled={isSubmitting}
                  placeholder="Побажання щодо доставки чи замовлення"
                  className={cn(inputClass, "h-auto min-h-[96px] py-3 leading-6")}
                />
              )}
            </Field>
          </Step>
        </div>

        <aside aria-label="Ваше замовлення" className="lg:sticky lg:top-[calc(var(--sticky-top)+24px)] lg:self-start lg:transition-[top] lg:duration-200">
          <div className="rounded-md bg-brand-mist p-5 sm:p-6">
            <h2 className="heading-display text-lg">Ваше замовлення</h2>

            <ul className="mt-4 max-h-[320px] divide-y divide-brand-line overflow-y-auto pr-1">
              {cart.lines.map((line) => (
                <li key={line.id} className="flex gap-3 py-3">
                  <span className="relative h-16 w-12 shrink-0 overflow-hidden rounded-sm border border-brand-line bg-white">
                    <Image src={line.image || "/placeholder.svg"} alt="" fill sizes="54px" className="object-contain" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="line-clamp-2 font-medium text-brand-ink">{line.name}</span>
                    {line.variant && <span className="block text-brand-muted">{line.variant}</span>}
                    <span className="block text-brand-muted">{line.quantity} шт.</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{money(line.price * line.quantity)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 border-t border-brand-line pt-4">
              {appliedPromo ? (
                <div className="flex items-center justify-between gap-3 rounded-md bg-white px-4 py-3 text-sm">
                  <span>
                    <span className="font-semibold">{appliedPromo.code}</span>
                    <span className="block text-brand-muted">Знижка {appliedPromo.discount}%</span>
                  </span>
                  <button type="button" onClick={removePromocode} className="font-semibold text-brand hover:text-brand-deep focus-visible:outline-none focus-visible:underline">
                    Прибрати
                  </button>
                </div>
              ) : (
                <div>
                  <label htmlFor="promocode" className="mb-2 block text-sm font-medium text-brand-ink">
                    Промокод <span className="font-normal text-brand-muted">необов’язково</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="promocode"
                      value={promocode}
                      onChange={(event) => setPromocode(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          if (promocode.trim()) applyPromocode()
                        }
                      }}
                      disabled={isApplyingPromo || isSubmitting}
                      autoComplete="off"
                      className={cn(inputClass, "h-11")}
                    />
                    <button
                      type="button"
                      onClick={() => applyPromocode()}
                      disabled={!promocode.trim() || isApplyingPromo || isSubmitting}
                      className="btn-secondary h-11 shrink-0 px-4 text-sm"
                    >
                      {isApplyingPromo ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Застосувати"}
                    </button>
                  </div>
                  {promoError && (
                    <p role="alert" className="mt-2 text-sm text-brand-sale">
                      {promoError}
                    </p>
                  )}
                  {email && promoCodes.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-brand-muted">{promoCodes.length === 1 ? "Ваш промокод:" : "Ваші промокоди:"}</p>
                      <ul className="mt-2 flex flex-col gap-2">
                        {promoCodes.map((own) => (
                          <li key={own.code}>
                            <button
                              type="button"
                              onClick={() => {
                                setPromocode(own.code)
                                applyPromocode(own.code)
                              }}
                              disabled={isApplyingPromo || isSubmitting}
                              className="flex min-h-11 w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border border-brand-line bg-white px-4 py-2 text-left text-sm transition-colors hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {/* The code stays on one line; on a narrow screen the action drops under it. */}
                              <span className="max-w-full break-all font-mono font-semibold text-brand-ink">{own.code}</span>
                              <span className="shrink-0 font-semibold text-brand">{own.percent !== null ? `Застосувати −${own.percent}%` : "Застосувати"}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!email && (
                    <p className="mt-2 text-sm text-brand-muted">
                      Промокоди діють після входу.{" "}
                      <button type="button" onClick={() => setAuthOpen(true)} className="font-semibold text-brand hover:text-brand-deep focus-visible:outline-none focus-visible:underline">
                        Зареєструйтеся та отримайте −10% на перше замовлення
                      </button>
                    </p>
                  )}
                </div>
              )}
            </div>

            <dl className="mt-4 space-y-3 border-t border-brand-line pt-4 text-base">
              <div className="flex justify-between">
                <dt className="text-brand-muted">Товари</dt>
                <dd className="tabular-nums">{money(subtotal)}</dd>
              </div>
              {promoAmount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-brand-muted">Промокод</dt>
                  <dd className="tabular-nums text-brand-sale">−{money(promoAmount)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-brand-muted">Доставка</dt>
                <dd className="text-right">{freeDelivery ? "безкоштовно" : "за тарифами Нової пошти"}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-brand-line pt-3">
                <dt className="font-semibold">До сплати</dt>
                <dd className="text-2xl font-semibold tabular-nums">{money(toPay)}</dd>
              </div>
            </dl>
            {!freeDelivery && freeFrom > 0 && (
              <p className="mt-2 text-sm text-brand-muted">
                Ще {formatPrice(freeFrom - toPay)} {Store.currency_sign} до безкоштовної доставки
              </p>
            )}

            <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-brand-ink">
              <input
                type="checkbox"
                {...form.register("termsAgreed")}
                aria-invalid={Boolean(errors.termsAgreed)}
                disabled={isSubmitting}
                className="check check-brand mt-1"
              />
              <span>
                Погоджуюся з{" "}
                <Link href="/info/public-offer" target="_blank" className="link-quiet">
                  публічною офертою
                </Link>{" "}
                та{" "}
                <Link href="/info/conf-policy" target="_blank" className="link-quiet">
                  політикою конфіденційності
                </Link>
              </span>
            </label>
            {errors.termsAgreed?.message && (
              <p role="alert" className="mt-2 text-sm text-brand-sale">
                Позначте згоду з умовами, щоб оформити замовлення
              </p>
            )}

            {submitError && (
              <p role="alert" className="mt-4 flex items-start gap-2 rounded-md border border-brand-sale/30 bg-brand-sale-tint px-4 py-3 text-sm text-brand-sale">
                <AlertCircle className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
                {submitError}
              </p>
            )}

            <button type="submit" disabled={isSubmitting || !cart.ready} className="btn-primary mt-5 h-12 w-full px-4 text-base">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  Оформлюємо…
                </>
              ) : (
                <>
                  <PackageCheck className="h-5 w-5 shrink-0 max-[359px]:hidden" aria-hidden="true" />
                  Підтвердити замовлення
                </>
              )}
            </button>
            <p className="mt-3 flex items-center justify-center gap-2 text-xs text-brand-muted">
              <Lock className="h-4 w-4" aria-hidden="true" />
              Платити зараз не потрібно
            </p>
          </div>
        </aside>
      </form>

      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="max-w-[420px] rounded-md bg-white p-6 text-brand-ink">
          <DialogHeader className="text-left">
            <Logo tone="dark" className="mb-2" />
            <DialogTitle className="font-display text-xl font-semibold tracking-[-0.02em]">
              {authView === "login" ? "Вхід" : authView === "register" ? "Реєстрація" : authView === "confirm" ? "Підтвердьте e-mail" : "Обліковий запис створено"}
            </DialogTitle>
            <DialogDescription className="text-sm text-brand-muted">
              {authView === "confirm"
                ? `Ми надіслали лист на ${registerForm.email.trim()}. З цієї адреси вже робили замовлення, тому обліковий запис відкриється після переходу за посиланням із листа. Замовлення можна оформити й зараз, без входу.`
                : authView === "success"
                ? "Промокод на знижку 10% надіслано на вашу електронну пошту. Введіть його в полі «Промокод»."
                : "Зареєстрованим покупцям надсилаємо промокод на −10% для першого замовлення."}
            </DialogDescription>
          </DialogHeader>

          {authError && (
            <p role="alert" className="rounded-md border border-brand-sale/30 bg-brand-sale-tint px-4 py-3 text-sm text-brand-sale">
              {authError}
            </p>
          )}

          {authView === "login" && (
            <form onSubmit={onLogin} className="space-y-4">
              <label className="block text-sm font-medium">
                E-mail
                <input type="email" required autoComplete="email" value={loginForm.email} onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })} disabled={authLoading} className="field mt-2" />
              </label>
              <label className="block text-sm font-medium">
                Пароль
                <input type="password" required autoComplete="current-password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} disabled={authLoading} className="field mt-2" />
              </label>
              <button type="submit" disabled={authLoading} className="btn-blue w-full">
                {authLoading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : "Увійти"}
              </button>
              <button type="button" onClick={() => { setAuthView("register"); setAuthError("") }} className="w-full text-sm font-semibold text-brand hover:text-brand-deep focus-visible:outline-none focus-visible:underline">
                Ще немає облікового запису? Зареєструватися
              </button>
            </form>
          )}

          {authView === "register" && (
            <form onSubmit={onRegister} className="space-y-4">
              <label className="block text-sm font-medium">
                Ім’я
                <input required autoComplete="given-name" value={registerForm.name} onChange={(event) => setRegisterForm({ ...registerForm, name: event.target.value })} disabled={authLoading} className="field mt-2" />
              </label>
              <label className="block text-sm font-medium">
                E-mail
                <input type="email" required autoComplete="email" value={registerForm.email} onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })} disabled={authLoading} className="field mt-2" />
              </label>
              <label className="block text-sm font-medium">
                Телефон
                <input type="tel" required autoComplete="tel" placeholder="+380" value={registerForm.phone} onChange={(event) => setRegisterForm({ ...registerForm, phone: event.target.value })} disabled={authLoading} className="field mt-2" />
              </label>
              <label className="block text-sm font-medium">
                Пароль
                <input type="password" required minLength={8} autoComplete="new-password" value={registerForm.password} onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })} disabled={authLoading} className="field mt-2" />
              </label>
              <button type="submit" disabled={authLoading} className="btn-blue w-full">
                {authLoading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : "Зареєструватися"}
              </button>
              <button type="button" onClick={() => { setAuthView("login"); setAuthError("") }} className="w-full text-sm font-semibold text-brand hover:text-brand-deep focus-visible:outline-none focus-visible:underline">
                Уже маєте обліковий запис? Увійти
              </button>
            </form>
          )}

          {(authView === "success" || authView === "confirm") && (
            <button type="button" onClick={() => setAuthOpen(false)} className="btn-blue w-full">
              Продовжити оформлення
            </button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
