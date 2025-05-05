import { Store } from "@/constants/store"
import Image from "next/image"
import Link from "next/link"

interface Props {
  _id: string
  id: string
  name: string
  image: string
  priceToShow: number
  amount: number
  articleNumber: string
}

const OrderedProductCard = ({ _id, id, name, image, priceToShow, amount, articleNumber }: Props) => {
  return (
    <div className="flex flex-col sm:flex-row border border-slate-200 rounded-lg overflow-hidden bg-white">
      <div className="w-full sm:w-[180px] h-[180px] sm:h-[180px] flex-shrink-0 relative bg-slate-50 p-4">
        <Link href={`/catalog/${_id}`} className="block w-full h-full">
          <div className="relative w-full h-full">
            <Image
              src={image || "/placeholder.svg"}
              alt={name}
              layout="fill"
              objectFit="contain"
              className="transition-transform duration-300 hover:scale-105"
            />
          </div>
        </Link>
      </div>

      <div className="flex-1 p-4 flex flex-col justify-between">
        <div>
          <Link href={`/catalog/${_id}`} className="block hover:text-slate-700">
            <h3 className="text-base-semibold text-slate-800 mb-1 line-clamp-2">{name}</h3>
          </Link>
          <p className="text-small-regular text-slate-500 mb-3">
            {articleNumber ? "Артикуль" : "ID"}: {articleNumber || id}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mt-2">
          <div className="text-small-regular text-slate-600 mb-2 sm:mb-0">
            <p className="mb-1">
              Кількість: <span className="font-medium">{amount}</span>
            </p>
            <p>
              Ціна за одиницю:{" "}
              <span className="font-medium">
                {priceToShow.toFixed(2)}
                {Store.currency_sign}
              </span>
            </p>
          </div>

          <div className="text-right">
            <p className="text-base-semibold text-green-600">
              {(priceToShow * amount).toFixed(2)}
              {Store.currency_sign}
            </p>
            <p className="text-subtle-medium text-slate-500">Загальна сума</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderedProductCard
