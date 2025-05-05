import type React from "react"
import Link from "next/link"
import { Truck, Package, Calendar, Phone, CreditCard, ArrowRight, Tag, Percent } from "lucide-react"
import { Store } from "@/constants/store"

interface Props {
  id: string
  products: {
    product: {
      id: string
      images: string[]
      name: string
      priceToShow: number
      price: number
    }
    amount: number
  }[]
  user: {
    _id: string
    email: string
  }
  value: number
  name: string
  surname: string
  phoneNumber: string
  email: string
  paymentType: string
  deliveryMethod: string
  city: string
  adress: string
  postalCode: string
  data: string
  paymentStatus: "Pending" | "Success" | "Declined"
  deliveryStatus: "Proceeding" | "Indelivery" | "Fulfilled" | "Canceled"
  url: string
  promocode?: string
  discount?: number
}

export default function OrderCard({
  id,
  products,
  value,
  name,
  surname,
  phoneNumber,
  email,
  data,
  paymentStatus,
  deliveryStatus,
  url,
  promocode,
  discount,
}: Props) {
  const totalProducts = products.reduce((sum, item) => sum + item.amount, 0)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
      case "Proceeding":
        return "text-gray-500"
      case "Indelivery":
        return "text-blue-600"
      case "Success":
      case "Fulfilled":
        return "text-green-600"
      case "Declined":
      case "Canceled":
        return "text-red-600"
      default:
        return "text-gray-500"
    }
  }

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "Pending":
      case "Proceeding":
        return "bg-gray-500"
      case "Indelivery":
        return "bg-blue-600"
      case "Success":
      case "Fulfilled":
        return "bg-green-600"
      case "Declined":
      case "Canceled":
        return "bg-red-600"
      default:
        return "bg-gray-500"
    }
  }

  const getDeliveryBarStyle = () => {
    switch (deliveryStatus) {
      case "Proceeding":
        return "w-1/4 bg-gray-500"
      case "Indelivery":
        return "w-2/3 bg-blue-600"
      case "Fulfilled":
        return "w-full bg-green-600"
      case "Canceled":
        return "w-1/2 bg-red-600"
      default:
        return "w-0 bg-gray-200"
    }
  }

  const getTruckStyle = () => {
    switch (deliveryStatus) {
      case "Proceeding":
        return "left-[calc(25%-12px)] text-gray-500"
      case "Indelivery":
        return "left-[calc(66%-12px)] text-blue-600"
      case "Fulfilled":
        return "right-0 text-green-600"
      case "Canceled":
        return "left-1/2 -translate-x-1/2 text-red-600"
      default:
        return "left-0 text-gray-400"
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md border border-gray-200 group">
      <div className="bg-gray-900 p-5">
        <div className="flex justify-between items-center">
          <h4 className="text-lg font-medium text-white">
            {name} {surname}
          </h4>
          <span className="text-xs text-gray-300 font-medium">#{id.slice(0, 8)}</span>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <InfoItem icon={<Calendar className="w-4 h-4 text-gray-500" />} text={data} />
          <InfoItem icon={<Package className="w-4 h-4 text-gray-500" />} text={`${totalProducts} товарів`} />
          <InfoItem icon={<CreditCard className="w-4 h-4 text-gray-500" />} text={`${value} ${Store.currency_sign}`} />
          <InfoItem icon={<Phone className="w-4 h-4 text-gray-500" />} text={phoneNumber} link={`tel:${phoneNumber}`} />
          {promocode && <InfoItem icon={<Tag className="w-4 h-4 text-gray-500" />} text={promocode} />}
          {discount && discount > 0 && (
            <InfoItem icon={<Percent className="w-4 h-4 text-gray-500" />} text={`${discount}%`} />
          )}
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-700">Статус доставки</span>
            <span className={`text-sm font-medium ${getStatusColor(deliveryStatus)}`}>
              {deliveryStatus === "Proceeding" && "В обробці"}
              {deliveryStatus === "Indelivery" && "В дорозі"}
              {deliveryStatus === "Fulfilled" && "Доставлено"}
              {deliveryStatus === "Canceled" && "Скасовано"}
            </span>
          </div>
          <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 transition-all duration-500 ease-out ${getDeliveryBarStyle()}`}
            ></div>
          </div>
          <div className="relative h-8 mt-1">
            <Truck
              className={`absolute top-1/2 -mt-3 w-6 h-6 transition-all duration-500 ease-out ${getTruckStyle()}`}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-5">
          <span className={`w-2.5 h-2.5 rounded-full ${getStatusBgColor(paymentStatus)}`}></span>
          <span className={`text-sm ${getStatusColor(paymentStatus)}`}>
            Оплата: {paymentStatus === "Pending" && "Очікується"}
            {paymentStatus === "Success" && "Успішно"}
            {paymentStatus === "Declined" && "Відхилено"}
          </span>
        </div>

        <div className="flex justify-end items-center">
          <Link
            href={`${url}${id}`}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-900 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors duration-300 group-hover:border-gray-900"
          >
            Деталі
            <ArrowRight className="w-4 h-4 ml-1.5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function InfoItem({ icon, text, link }: { icon: React.ReactNode; text: string; link?: string }) {
  const content = (
    <div className="flex items-center space-x-2">
      {icon}
      <span className="text-sm text-gray-700 truncate">{text}</span>
    </div>
  )

  return link ? (
    <Link href={link} className="text-gray-700 hover:text-gray-900 transition-colors duration-300">
      {content}
    </Link>
  ) : (
    content
  )
}
