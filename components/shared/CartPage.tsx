"use client"
import { useAppContext } from "@/app/(root)/context"
import type React from "react"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { ProductType } from "@/lib/types/types"
import { trackFacebookEvent } from "@/helpers/pixel"
import { Store } from "@/constants/store"
import { Minus, Plus, ShoppingCart, X } from "lucide-react"

const CartPage = ({ setIsOpened }: { setIsOpened: (value: boolean) => void }) => {
  //@ts-ignore
  const { cartData, setCartData, priceToPay, setPriceToPay } = useAppContext()

  function hideCart() {
    setIsOpened(false)
  }

  function removeProduct(index: number, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    cartData.splice(index, 1)
    setCartData((prev: any) => [...prev], cartData)
  }

  function setCount(index: number, value: any) {
    value = Number(value)
    if (Number.isInteger(value)) {
      cartData[index].quantity = value
      setCartData((prev: any) => [...prev], cartData)
    } else {
      cartData[index].quantity = 1
      setCartData((prev: any) => [...prev], cartData)
    }
  }

  function plus(index: number, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (cartData[index].quantity < 999) {
      cartData[index].quantity++
      setCartData((prev: any) => [...prev], cartData)
    }
  }

  function minus(index: number, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (cartData[index].quantity > 1) {
      cartData[index].quantity--
      setCartData((prev: any) => [...prev], cartData)
    }
  }

  function delProduct(index: number, value: any) {
    value = Number(value)
    if (value < 1) {
      removeProduct(index, new MouseEvent("click") as any)
    }
  }

  const handleCheckout = () => {
    hideCart()

    trackFacebookEvent("InitiateCheckout", {
      content_name: "Cart Checkout",
      content_ids: cartData.map((product: ProductType) => product.id),
      value: priceToPay,
      currency: "UAH",
      num_items: cartData.length,
    })
  }

  const totalPrice = cartData
    .reduce((acc: number, data: { price: number; quantity: number }) => acc + data.price * data.quantity, 0)
    .toFixed(2)

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-heading3-bold">Кошик</h2>
        <Link href="/cart" onClick={hideCart} className="text-sky-500 hover:underline text-small-regular flex items-center">
          <ShoppingCart size={16} className="mr-1" />
          Перейти до кошика
        </Link>
      </div>

      <div className="flex-grow overflow-auto p-4">
        {cartData.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingCart className="mx-auto h-10 w-10 text-gray-400 mb-2" />
            <p className="text-body-medium text-gray-500">Ваш кошик порожній</p>
          </div>
        ) : (
          cartData.map((data: any, index: number) => (
            <Link href={`/catalog/${data.id}`} key={index}>
              <article className="flex items-center py-3 border-b last:border-b-0">
                <div className="flex-shrink-0 w-20 h-20 mr-3">
                  <div className="w-full h-full overflow-hidden rounded-md aspect-square border">
                    <Image
                      width={80}
                      height={80}
                      alt={data.name}
                      className="object-cover w-full h-full"
                      src={data.image || "/placeholder.svg"}
                    />
                  </div>
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-small-medium line-clamp-2">{data.name}</h3>
                    <button
                      onClick={(e) => removeProduct(index, e)}
                      className="text-gray-400 hover:text-red-500 ml-1 flex-shrink-0"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center border rounded-md">
                      <Button onClick={(e) => minus(index, e)} variant="ghost" className="p-0 h-7 w-7">
                        <Minus size={14} />
                      </Button>
                      <input
                        className="w-8 h-7 text-center focus:outline-none text-small-regular"
                        value={data.quantity}
                        onChange={(e) => setCount(index, e.target.value)}
                        onBlur={(e) => delProduct(index, e.target.value)}
                        maxLength={3}
                      />
                      <Button onClick={(e) => plus(index, e)} variant="ghost" className="p-0 h-7 w-7">
                        <Plus size={14} />
                      </Button>
                    </div>
                    <div className="text-right">
                      {data.priceWithoutDiscount !== data.price && (
                        <p className="text-subtle-medium font-normal text-gray-500 line-through">
                          {Store.currency_sign}
                          {data.priceWithoutDiscount}
                        </p>
                      )}
                      <p className="text-small-semibold">
                        {Store.currency_sign}
                        {data.price}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          ))
        )}
      </div>

      <div className="border-t p-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-body-medium">Разом:</span>
          <span className="text-heading4-medium font-bold">
            {Store.currency_sign}
            {totalPrice}
          </span>
        </div>
        <div className="space-y-2">
          <Link href="/order" className="block w-full">
            <Button onClick={handleCheckout} disabled={cartData.length === 0} className="w-full">
              Замовити
            </Button>
          </Link>
          <Button onClick={hideCart} variant="outline" className="w-full">
            Продовжити покупки
          </Button>
        </div>
      </div>
    </div>
  )
}

export default CartPage

