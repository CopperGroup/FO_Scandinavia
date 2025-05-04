"use client"
import { Button } from "../ui/button"
import { useAppContext } from "@/app/(root)/context"
import { productAddedToCart } from "@/lib/actions/product.actions"
import { Plane, Ship } from "lucide-react"
import { trackFacebookEvent } from "@/helpers/pixel"
import type { ProductType } from "@/lib/types/types"
import { useRouter } from "next/navigation"

const BuyNow = ({
  id,
  name,
  image,
  price,
  priceWithoutDiscount,
  url
}: { id: string; name: string; image: string; price: number; priceWithoutDiscount: number, url: string }) => {
  //@ts-ignore
  const { cartData, setCartData } = useAppContext()

  const router = useRouter()

  async function AddDataToCart() {
    let exist = 0
    let del = 0

    cartData.map((data: any, index: number) => {
      if (data.id === id) {
        exist = 1
        del = index
      }
    })

    if (exist == 0) {
      setCartData((prev: any) => [
        ...prev,
        { id: id, name: name, image: image, price: price, priceWithoutDiscount: priceWithoutDiscount, quantity: 1, url },
      ])

      await productAddedToCart(id)

      trackFacebookEvent("AddToCart", {
        content_name: name,
        content_ids: id,
        content_type: "product",
        value: priceWithoutDiscount,
        currency: "UAH",
      })

      trackFacebookEvent("InitiateCheckout", {
        content_name: "Cart Checkout",
        content_ids: cartData.map((product: ProductType) => product.id),
        value: cartData.map((product: ProductType) => product.priceToShow),
        currency: "UAH",
        num_items: cartData.length,
      })

      router.push("/order")
    } else {
      router.push("/order")
    }
  }

  return (
    <Button
      className="max-[425px]:w-full bg-[#FECC02] hover:bg-[#e6b800] text-[#006AA7] font-semibold shadow-sm hover:shadow-md transition-all duration-300 rounded-lg border-none"
      onClick={AddDataToCart}
    >
      <Ship className="mr-2 transition-transform duration-300 group-hover:translate-x-1" />
      Придбати миттєво
    </Button>
  )
}

export default BuyNow

