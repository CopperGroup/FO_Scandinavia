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
    <article className="w-full h-[420px] bg-white rounded-2xl overflow-hidden flex flex-col shadow-md hover:shadow-2xl transition-all duration-500 group relative z-0 border border-slate-100/50 hover:border-[#006AA7]/20 hover:-translate-y-1">
      {/* Shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-white/0 group-hover:from-white/20 group-hover:via-transparent group-hover:to-transparent pointer-events-none transition-all duration-700 rounded-2xl z-20"></div>
      
      {/* Image Container */}
      <Link href={`/catalog/${id}`} prefetch={false} className="flex-grow flex flex-col h-full relative">
        <div className="relative w-full h-[220px] overflow-hidden flex-shrink-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,106,167,0.05),transparent_50%)]"></div>
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/40 flex items-center justify-center">
            <Image
              src={imageUrl || "/placeholder.svg"}
              width={200}
              height={200}
              alt={name}
              className="max-w-[180px] max-h-[180px] object-contain transition-all duration-700 group-hover:scale-110 group-hover:rotate-1 drop-shadow-lg"
            />
          </div>

          {/* Badge and Like Button */}
          <div className="absolute top-0 left-0 w-full flex justify-between items-start p-3 z-10">
            <div className="transform transition-transform duration-300 group-hover:scale-105">
              <Badge price={price} priceToShow={priceToShow} />
            </div>
            <div className="transform transition-transform duration-300 group-hover:scale-110">
              <LikeButton
                likedBy={JSON.stringify(likedBy)}
                productId={productId}
                productName={name}
                value={priceToShow}
                email={email}
              />
            </div>
          </div>
        </div>

        {/* Product Info */}
        <div className="p-5 flex flex-col flex-grow bg-gradient-to-b from-white to-slate-50/50">
          {/* Title and Description with fixed heights */}
          <div className="flex flex-col h-[120px]">
            <h3 className="text-body-bold text-[#006AA7] group-hover:text-[#005a8e] transition-all duration-300 mb-2 line-clamp-2 leading-snug font-semibold">
              {name}
            </h3>
            <p className="text-small-medium text-slate-600 line-clamp-3 mb-auto leading-relaxed group-hover:text-slate-700 transition-colors duration-300">{description}</p>
          </div>

          {/* Price and Add to Cart - Always at the bottom */}
          <div className="flex justify-between items-center mt-auto pt-4 border-t border-gradient-to-r from-transparent via-slate-200 to-transparent group-hover:via-[#006AA7]/20 transition-all duration-300">
            <div className="flex flex-col">
              {price !== priceToShow && (
                <p className="text-small-medium text-slate-400 line-through mb-1 transition-opacity duration-300 group-hover:opacity-60">
                  {Store.currency_sign}
                  {price}
                </p>
              )}
              <p className="text-body-bold text-[#FECC02] drop-shadow-sm group-hover:scale-105 transition-transform duration-300 inline-block">
                {Store.currency_sign}
                {priceToShow}
              </p>
            </div>
            <div className="transform transition-transform duration-300 group-hover:scale-105">
              <AddToCart id={id} image={imageUrl} name={name} price={priceToShow} priceWithoutDiscount={price} url={url}/>
            </div>
          </div>
        </div>
      </Link>

      {/* Hover Overlay Effect with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#006AA7]/0 via-transparent to-[#FECC02]/0 group-hover:from-[#006AA7]/5 group-hover:via-transparent group-hover:to-[#FECC02]/5 pointer-events-none transition-all duration-500 rounded-2xl"></div>
      
      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[#006AA7]/0 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
    </article>
  )
}

export default ProductCard

