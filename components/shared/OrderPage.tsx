"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MapPin, Phone, Mail, MessageSquare, CreditCard, Truck, Building } from "lucide-react"
import OrderedProductCard from "@/components/cards/OrderedProductCard"
import { Store } from "@/constants/store"

interface Product {
  product: {
    _id: string
    id: string
    name: string
    images: string[]
    priceToShow: number
    params: {
      name: string
      value: string
    }[]
    articleNumber: string
  }
  amount: number
}

interface OrderProps {
  order: {
    id: string
    name: string
    surname: string
    adress: string
    city: string
    postalCode: string
    deliveryMethod: string
    paymentType: string
    phoneNumber: string
    email: string
    comment: string
    products: Product[]
    value: number
    paymentStatus: "Pending" | "Declined" | "Success"
    deliveryStatus: "Proceeding" | "Canceled" | "Fulfilled"
    warehouse: string
  }
}

export default function OrderPage({ orderJson }: { orderJson: string }) {
  const order = JSON.parse(orderJson)
  const router = useRouter()

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
      case "Proceeding":
        return "bg-amber-400"
      case "Declined":
      case "Canceled":
        return "bg-red-500"
      case "Success":
      case "Fulfilled":
        return "bg-green-500"
      default:
        return "bg-amber-400"
    }
  }

  return (
    <div className="max-w-full justify-center overflow-x-hidden p-4">
      <div className="mb-4">
        <Button
          className="inline-flex items-center font-normal text-blue-600 hover:text-amber-500 max-lg:-ml-3 text-sm"
          variant="ghost"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-1" size={16} />
          Назад до замовлень
        </Button>
      </div>

      <div className="border border-gray-200 rounded-md p-4 mb-6 bg-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-800">Замовлення №{order.id}</h1>
          <div className="flex gap-3 mt-2 sm:mt-0">
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
              <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(order.paymentStatus)}`}></div>
              <span className="text-xs font-medium text-gray-700">{order.paymentStatus}</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
              <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(order.deliveryStatus)}`}></div>
              <span className="text-xs font-medium text-gray-700">{order.deliveryStatus}</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-md">
            <h2 className="text-base font-medium text-gray-800 mb-3">Інформація про клієнта</h2>
            <div className="space-y-2.5">
              <p className="flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-700">Ім&apos;я:</span>
                <span className="text-gray-600">
                  {order.name} {order.surname}
                </span>
              </p>
              <Link
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.adress}, ${order.city}, ${order.postalCode}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-500 hover:text-amber-500 text-sm"
              >
                <MapPin size={14} />
                <span>
                  {order.city}, {order.adress}, {order.postalCode}
                </span>
              </Link>
              <Link
                href={`tel:${order.phoneNumber}`}
                className="flex items-center gap-2 text-blue-500 hover:text-amber-500 text-sm"
              >
                <Phone size={14} />
                <span>{order.phoneNumber}</span>
              </Link>
              <Link
                href={`mailto:${order.email}`}
                className="flex items-center gap-2 text-blue-500 hover:text-amber-500 text-sm"
              >
                <Mail size={14} />
                <span>{order.email}</span>
              </Link>
              {order.comment && (
                <div className="flex items-start gap-2 bg-white p-2 rounded border border-gray-200 text-sm">
                  <MessageSquare size={14} className="mt-0.5 flex-shrink-0 text-amber-500" />
                  <p className="text-gray-600">{order.comment}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <h2 className="text-base font-medium text-gray-800 mb-3">Деталі замовлення</h2>
            <div className="space-y-2.5">
              <p className="flex items-center gap-2 text-sm">
                <Truck size={14} className="text-amber-500" />
                <span className="text-gray-600">
                  Метод доставки: <span className="font-medium">{order.deliveryMethod}</span>
                </span>
              </p>
              <p className="flex items-center gap-2 text-sm">
                <CreditCard size={14} className="text-amber-500" />
                <span className="text-gray-600">
                  Метод оплати: <span className="font-medium">{order.paymentType}</span>
                </span>
              </p>
              <p className="flex items-center gap-2 text-sm">
                <Building size={14} className="text-amber-500" />
                <span className="text-gray-600">
                  Відділення: <span className="font-medium">{order.warehouse}</span>
                </span>
              </p>
              <div className="bg-white p-3 rounded-md border border-gray-200 mt-3">
                <p className="text-sm font-medium text-gray-800">
                  Загальна вартість:{" "}
                  <span className="text-amber-500 font-semibold">
                    {order.value}
                    {Store.currency_sign}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-md p-4 bg-white shadow-sm">
        <h2 className="text-base font-medium text-gray-800 mb-4">Замовлена продукція</h2>
        <div className="w-full space-y-3 max-h-[700px] overflow-y-auto pr-2">
          {order.products.map((product: Product) => (
            <OrderedProductCard
              key={product.product.id}
              _id={product.product._id}
              id={product.product.id}
              name={product.product.name}
              image={product.product.images[0]}
              priceToShow={product.product.priceToShow}
              articleNumber={product.product.articleNumber}
              amount={product.amount}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
