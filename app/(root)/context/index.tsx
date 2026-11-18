"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

const AppContext = createContext<any>(undefined)

/**
 * Storefront state shared across pages: the cart (persisted in localStorage)
 * and which overlay (cart drawer, category menu) is open.
 */
export function AppWrapper({ children }: { children: ReactNode }) {
  const [catalogData, setCatalogData] = useState({
    pNumber: 1,
    sort: "default",
    search: "",
  })

  const [cartData, setCartData] = useState<any[]>([])
  const [isClient, setIsClient] = useState(false)
  const [priceToPay, setPriceToPay] = useState<any[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cartData")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) setCartData(parsed)
      }
    } catch {
      // A corrupted or unavailable store just means an empty cart.
    }
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return
    try {
      localStorage.setItem("cartData", JSON.stringify(cartData))
    } catch {
      // Private mode or a full quota: the cart still works for this visit.
    }
  }, [cartData, isClient])

  const value = useMemo(
    () => ({
      catalogData,
      setCatalogData,
      cartData,
      setCartData,
      cartReady: isClient,
      priceToPay,
      setPriceToPay,
      cartOpen,
      setCartOpen,
      menuOpen,
      setMenuOpen,
    }),
    [catalogData, cartData, isClient, priceToPay, cartOpen, menuOpen],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext() {
  return useContext(AppContext)
}
