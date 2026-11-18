"use client"

import { useCallback, useMemo } from "react"
import { useAppContext } from "@/app/(root)/context"

export type CartLine = {
  id: string
  name: string
  image: string
  price: number
  priceWithoutDiscount: number
  quantity: number
  url?: string
  /** Size or other option the shopper chose, shown under the name. */
  variant?: string | null
}

const MAX_QUANTITY = 99

/** Cart operations. Every update is immutable, so React always re-renders. */
export function useCart() {
  const { cartData, setCartData, cartReady, cartOpen, setCartOpen } = useAppContext()
  const lines = cartData as CartLine[]

  const add = useCallback(
    (line: Omit<CartLine, "quantity">, quantity = 1) => {
      setCartData((previous: CartLine[]) => {
        const existing = previous.find((item) => item.id === line.id)
        if (!existing) return [...previous, { ...line, quantity }]
        return previous.map((item) =>
          item.id === line.id ? { ...item, quantity: Math.min(MAX_QUANTITY, item.quantity + quantity) } : item,
        )
      })
    },
    [setCartData],
  )

  const remove = useCallback(
    (id: string) => setCartData((previous: CartLine[]) => previous.filter((item) => item.id !== id)),
    [setCartData],
  )

  const setQuantity = useCallback(
    (id: string, quantity: number) => {
      const next = Math.max(1, Math.min(MAX_QUANTITY, Math.floor(Number.isFinite(quantity) ? quantity : 1)))
      setCartData((previous: CartLine[]) => previous.map((item) => (item.id === id ? { ...item, quantity: next } : item)))
    },
    [setCartData],
  )

  const totals = useMemo(() => {
    let total = 0
    let regular = 0
    let units = 0
    for (const line of lines) {
      const quantity = Number(line.quantity) || 0
      total += (Number(line.price) || 0) * quantity
      regular += (Number(line.priceWithoutDiscount) || Number(line.price) || 0) * quantity
      units += quantity
    }
    return { total, regular, saved: Math.max(0, regular - total), units }
  }, [lines])

  const clear = useCallback(() => setCartData([]), [setCartData])

  const has = useCallback((id: string) => lines.some((item) => item.id === id), [lines])

  return {
    lines,
    ready: Boolean(cartReady),
    ...totals,
    has,
    add,
    remove,
    setQuantity,
    clear,
    isOpen: Boolean(cartOpen),
    open: () => setCartOpen(true),
    close: () => setCartOpen(false),
    setOpen: setCartOpen as (open: boolean) => void,
  }
}
