"use client"
import { Button } from "../ui/button"
import { useAppContext } from "@/app/(root)/context"
import { productAddedToCart } from "@/lib/actions/product.actions"
import { ShoppingCart } from "lucide-react"
import { trackFacebookEvent } from "@/helpers/pixel"

const AddToCart = ({
  id,
  name,
  image,
  price,
  priceWithoutDiscount,
  variant,
  url
}: { id: string; name: string; image: string; price: number; priceWithoutDiscount: number; variant?: "full", url: string }) => {
  //@ts-ignore
  const { cartData, setCartData } = useAppContext()

  async function AddDataToCart(e: any) {
    e.preventDefault()
    let exist = 0
    let del = 0

    cartData.map((data: any, index: number) => {
      if (data.name == name) {
        exist = 1
        del = index
      }
    })

    if (exist == 0) {
      setCartData((prev: any) => [
        ...prev,
        { id: id, name: name, image: image, price: price, priceWithoutDiscount: priceWithoutDiscount, quantity: 1, url: url },
      ])

      await productAddedToCart(id)

      trackFacebookEvent("AddToCart", {
        content_name: name,
        content_ids: id,
        content_type: "product",
        value: priceWithoutDiscount,
        currency: "UAH",
      })
    } else {
      cartData.splice(del, 1)
      setCartData((prev: any) => [...prev], cartData)
    }
  }

  if (variant === "full") {
    return (
      <Button
        variant="outline"
        className="w-full max-[425px]:w-full bg-white text-[#006AA7] border-[#006AA7] border hover:bg-[#006AA7] hover:text-white transition-all duration-300 rounded-lg shadow-sm"
        onClick={(e) => AddDataToCart(e)}
      >
        <ShoppingCart className="mr-2" size={20} />
        Додати в кошик
      </Button>
    )
  } else {
    return (
      <Button
        className="bg-[#006AA7] text-white hover:bg-[#005a8e] mr-1 px-9 z-20 transition-all duration-300 rounded-lg shadow-sm"
        onClick={(e) => AddDataToCart(e)}
      >
        У кошик
      </Button>
    )
  }
}

export default AddToCart

