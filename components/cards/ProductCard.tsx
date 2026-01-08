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
    <article className="w-full bg-white rounded-3xl overflow-hidden flex flex-col shadow-sm border border-blue-100 hover:border-blue-200 transition-all duration-200 group">
      {/* Image Container */}
      <Link href={`/catalog/${id}`} prefetch={false} className="flex-grow flex flex-col h-full">
        <div className="relative w-full h-[240px] overflow-hidden flex-shrink-0 bg-gradient-to-br from-yellow-50 to-blue-50">
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <Image
              src={imageUrl || "/placeholder.svg"}
              width={200}
              height={200}
              alt={name}
              className="max-w-[180px] max-h-[180px] object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </div>

          {/* Badge and Like Button */}
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
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
        <div className="p-5 sm:p-6 flex flex-col flex-grow">
          {/* Title and Description */}
          <div className="flex flex-col mb-4 min-h-[100px]">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
              {name}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{description}</p>
          </div>

          {/* Price and Add to Cart */}
          <div className="flex justify-between items-end mt-auto pt-4 border-t border-yellow-100">
            <div className="flex flex-col">
              {price !== priceToShow && (
                <p className="text-xs sm:text-sm text-gray-400 line-through mb-1">
                  {Store.currency_sign}
                  {price}
                </p>
              )}
              <p className="text-lg sm:text-xl font-bold text-gray-900">
                {Store.currency_sign}
                {priceToShow}
              </p>
            </div>
            <AddToCart id={id} image={imageUrl} name={name} price={priceToShow} priceWithoutDiscount={price} url={url}/>
          </div>
        </div>
      </Link>
    </article>
  )
}

export default ProductCard

