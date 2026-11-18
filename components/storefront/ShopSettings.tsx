"use client"

import { createContext, useContext } from "react"
import { Store } from "@/constants/store"

type Settings = {
  /** The order sum from which delivery is free; 0 when free delivery is switched off. */
  freeDelivery: number
  /** The discount of the promo code a new customer gets for registering, in percent; 0 when the shop gives none. */
  welcomePercent: number
}

const ShopSettingsContext = createContext<Settings>({ freeDelivery: Number(Store.freeDelivery) || 0, welcomePercent: 0 })

/**
 * Settings of the shop that client components need (the cart, the checkout,
 * the registration form). The layout reads them on the server and hands them
 * down here, so a change in the admin reaches the browser with the next page.
 */
export function ShopSettingsProvider({ freeDelivery, welcomePercent, children }: Settings & { children: React.ReactNode }) {
  return <ShopSettingsContext.Provider value={{ freeDelivery, welcomePercent }}>{children}</ShopSettingsContext.Provider>
}

export function useShopSettings(): Settings {
  return useContext(ShopSettingsContext)
}
