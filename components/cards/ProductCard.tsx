import Image from "next/image"
import AddToCart from "../shared/AddToCart"
import Badge from "../badges/Badge"
import Link from "next/link"
import LikeButton from "../interface/LikeButton"
import { Store } from "@/constants/store"

interface Props {
  id: string
  productId: string
  email: string
  priceToShow: number
  price: number
  name: string
  imageUrl: string
  description: string
  url: string
  likedBy: {
    _id: string
    email: string
  }[]
}

const ProductCard = ({
  id,
  productId,
  email,
  priceToShow,
  price,
  name,
  imageUrl,
  description,
  url,
  likedBy,
}: Props) => {
  return (
    <article className="w-full h-[420px] bg-white rounded-xl overflow-hidden flex flex-col shadow-sm hover:shadow-lg transition-all duration-300 group relative z-0">
      {/* Image Container */}
      <Link href={`/catalog/${id}`} prefetch={false} className="block flex-grow flex flex-col h-full">
        <div className="relative w-full h-[220px] overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-[#f8f8f8] flex items-center justify-center">
            <Image
              src={imageUrl || "/placeholder.svg"}
              width={200}
              height={200}
              alt={name}
              className="max-w-[180px] max-h-[180px] object-contain transition-transform duration-500 group-hover:scale-110"
            />
          </div>

          {/* Badge and Like Button */}
          <div className="absolute top-0 left-0 w-full flex justify-between items-start p-3 z-10">
            <Badge price={price} priceToShow={priceToShow} />
            <LikeButton
              likedBy={JSON.stringify(likedBy)}
              productId={productId}
              productName={name}
              value={priceToShow}
              email={email}
            />
          </div>
        </div>

        {/* Product Info */}
        <div className="p-4 flex flex-col flex-grow">
          {/* Title and Description with fixed heights */}
          <div className="flex flex-col h-[120px]">
            <h3 className="text-body-bold text-[#006AA7] group-hover:text-[#005a8e] transition-colors duration-300 mb-2 line-clamp-2">
              {name}
            </h3>
            <p className="text-small-medium text-[#555555] line-clamp-3 mb-auto">{description}</p>
          </div>

          {/* Price and Add to Cart - Always at the bottom */}
          <div className="flex justify-between items-center mt-auto pt-3 border-t border-gray-100">
            <div>
              {price !== priceToShow && (
                <p className="text-small-medium text-gray-400 line-through">
                  {Store.currency_sign}
                  {price}
                </p>
              )}
              <p className="text-body-bold text-[#FECC02]">
                {Store.currency_sign}
                {priceToShow}
              </p>
            </div>
            <AddToCart id={id} image={imageUrl} name={name} price={priceToShow} priceWithoutDiscount={price} />
          </div>
        </div>
      </Link>

      {/* Hover Overlay Effect */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 pointer-events-none transition-all duration-300"></div>
    </article>
  )
}

export default ProductCard

