"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { FlaskConical, Printer } from "lucide-react"
import toast from "react-hot-toast"
import { Field, adminButton, adminInput } from "@/components/admin/ui"
import { AdminDialog } from "@/components/admin-components/AdminDialog"
import { deleteOrder, setOrderTest } from "@/lib/actions/order.actions"

export function PrintOrderButton() {
  return (
    <button type="button" onClick={() => window.print()} className={adminButton.secondary}>
      <Printer className="h-4 w-4" aria-hidden="true" />
      Друкувати
    </button>
  )
}

/**
 * «Позначити як тестове» / «Це справжнє замовлення»: takes effect at once and can be undone,
 * so it asks nothing. A test order leaves every list and count but is kept.
 */
export function TestOrderButton({ orderId, isTest }: { orderId: string; isTest: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const toggle = () =>
    startTransition(async () => {
      const result = await setOrderTest(orderId, !isTest).catch(() => ({ ok: false as const, error: "Немає зв’язку із сервером. Спробуйте ще раз." }))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(isTest ? `Замовлення №${orderId} знову рахується` : `Замовлення №${orderId} позначено як тестове`)
      router.refresh()
    })

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={adminButton.secondary}
      data-tip={
        isTest
          ? "Замовлення знову з’явиться в списках, статистиці, у клієнта й у підрахунку продажів товарів."
          : "Для замовлень, які ви робили, щоб перевірити магазин. Воно зникне зі списків, статистики, акаунта клієнта й підрахунку продажів, але не видалиться: його можна знайти у вкладці «Тестові» й повернути."
      }
    >
      <FlaskConical className="h-4 w-4" aria-hidden="true" />
      {pending ? "Зберігаємо…" : isTest ? "Це справжнє замовлення" : "Позначити як тестове"}
    </button>
  )
}

/** Deleting asks for the order number, says what goes away and that stock is not returned. */
export function DeleteOrderButton({ orderId, summary }: { orderId: string; summary: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState("")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  const close = () => {
    setOpen(false)
    setTyped("")
    setError("")
  }

  const confirm = () => {
    if (typed.trim() !== orderId) {
      setError(`Введіть номер замовлення: ${orderId}.`)
      return
    }
    startTransition(async () => {
      try {
        await deleteOrder(orderId)
        toast.success(`Замовлення №${orderId} видалено`)
        router.replace("/admin/Orders")
        router.refresh()
      } catch {
        setError("Не вдалося видалити замовлення. Спробуйте ще раз.")
      }
    })
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={adminButton.danger}>
        Видалити замовлення
      </button>
      <AdminDialog
        open={open}
        onClose={close}
        title={`Видалити замовлення №${orderId}?`}
        description={`${summary}. Замовлення зникне зі списків, статистики та профілю клієнта. Відновити його не можна, товари на склад не повертаються.`}
        footer={
          <>
            <button type="button" onClick={close} className={adminButton.secondary}>
              Не видаляти
            </button>
            <button type="button" onClick={confirm} disabled={pending} className={adminButton.dangerSolid}>
              {pending ? "Видаляємо…" : "Видалити назавжди"}
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-neutral-600">Якщо клієнт відмовився, краще змінити стан на «Скасовано»: історія залишиться.</p>
        <Field label="Номер замовлення для підтвердження" htmlFor="delete-order-confirm" error={error || undefined}>
          <input id="delete-order-confirm" inputMode="numeric" value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" className={adminInput} />
        </Field>
      </AdminDialog>
    </>
  )
}
