"use client"
import { useAppContext } from "@/app/(root)/context"
import Image from "next/image"
import { Button } from "../ui/button"
import Link from "next/link"
import type { ProductType } from "@/lib/types/types"
import { trackFacebookEvent } from "@/helpers/pixel"
import { Store } from "@/constants/store"
import { Minus, Plus, X } from "lucide-react"

const CartPage = ({ setIsOpened }: { setIsOpened: (value: boolean) => void }) => {
  //@ts-ignore
  const { cartData, setCartData, priceToPay, setPriceToPay } = useAppContext()

  function hideCart() {
    setIsOpened(false)
  }

  function removeProduct(index: number) {
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

  function plus(index: number) {
    if (cartData[index].quantity < 999) {
      cartData[index].quantity++
      setCartData((prev: any) => [...prev], cartData)
    }
  }

  function minus(index: number) {
    if (cartData[index].quantity > 1) {
      cartData[index].quantity--
      setCartData((prev: any) => [...prev], cartData)
    }
  }

  function delProduct(index: number, value: any) {
    value = Number(value)
    if (value < 1) {
      removeProduct(index)
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
      <h2 className="text-heading2-bold p-6 border-b">Кошик</h2>
      <div className="flex-grow overflow-auto p-6">
        {cartData.length === 0 ? (
          <p className="text-body-medium text-center text-gray-500">Ваш кошик порожній</p>
        ) : (
          cartData.map((data: any, index: number) => (
            <Link href={`/catalog/${data.id}`} key={index}>
              <article className="flex items-center py-4 border-b last:border-b-0">
                <div className="flex-shrink-0 w-24 h-24 mr-4">
                  <div className="w-full h-full overflow-hidden rounded-md aspect-square">
                    <Image
                      width={96}
                      height={96}
                      alt={data.name}
                      className="object-cover w-full h-full"
                      src={data.image || "/placeholder.svg"}
                    />
                  </div>
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-base-semibold">{data.name}</h3>
                    <button onClick={() => removeProduct(index)} className="text-gray-400 hover:text-gray-600">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center border rounded-md">
                      <Button onClick={() => minus(index)} variant="ghost" className="p-1 h-8 w-8">
                        <Minus size={16} />
                      </Button>
                      <input
                        className="w-12 h-8 text-center focus:outline-none"
                        value={data.quantity}
                        onChange={(e) => setCount(index, e.target.value)}
                        onBlur={(e) => delProduct(index, e.target.value)}
                        maxLength={3}
                      />
                      <Button onClick={() => plus(index)} variant="ghost" className="p-1 h-8 w-8">
                        <Plus size={16} />
                      </Button>
                    </div>
                    <div className="text-right">
                      {data.priceWithoutDiscount !== data.price && (
                        <p className="text-small-medium text-gray-500 line-through">
                          {Store.currency_sign}
                          {data.priceWithoutDiscount}
                        </p>
                      )}
                      <p className="text-base-semibold">
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
      <div className="border-t p-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-body-semibold">Разом:</span>
          <span className="text-heading3-bold">
            {Store.currency_sign}
            {totalPrice}
          </span>
        </div>
        <div className="space-y-2">
          <Button onClick={hideCart} variant="outline" className="w-full">
            Повернутись до покупок
          </Button>
          <Link href="/order" className="block w-full">
            <Button onClick={handleCheckout} disabled={cartData.length === 0} className="w-full">
              Замовити
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default CartPage

