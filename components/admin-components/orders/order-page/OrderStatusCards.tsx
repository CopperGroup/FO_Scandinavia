import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Package, CreditCard, Truck } from "lucide-react"

interface OrderStatusCardsProps {
  productCount: number
  paymentStatus: "Pending" | "Declined" | "Success"
  deliveryStatus: "Proceeding" | "Indelivery" | "Canceled" | "Fulfilled"
  getPaymentStatusColor: (status: string) => string
  getPaymentStatusText: (status: string) => string
  getDeliveryStatusColor: (status: string) => string
  getDeliveryStatusText: (status: string) => string
}

const OrderStatusCards: React.FC<OrderStatusCardsProps> = ({
  productCount,
  paymentStatus,
  deliveryStatus,
  getPaymentStatusColor,
  getPaymentStatusText,
  getDeliveryStatusColor,
  getDeliveryStatusText,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
      <Card className="bg-white border-none shadow-sm overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 mb-1 text-sm">Кількість товарів</p>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-800">
                {productCount}
              </h3>
            </div>
            <div className="bg-blue-50 p-2 sm:p-3 rounded-full">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-none shadow-sm overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 mb-1 text-sm">Статус оплати</p>
              <div className="flex items-center gap-2">
                <div
                  className={`h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full ${getPaymentStatusColor(paymentStatus)}`}
                ></div>
                <h3 className="text-base sm:text-lg font-medium text-slate-800">
                  {getPaymentStatusText(paymentStatus)}
                </h3>
              </div>
            </div>
            <div className="bg-amber-50 p-2 sm:p-3 rounded-full">
              <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-none shadow-sm overflow-hidden sm:col-span-2 lg:col-span-1">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 mb-1 text-sm">Статус доставки</p>
              <div className="flex items-center gap-2">
                <div
                  className={`h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full ${getDeliveryStatusColor(deliveryStatus)}`}
                ></div>
                <h3 className="text-base sm:text-lg font-medium text-slate-800">
                  {getDeliveryStatusText(deliveryStatus)}
                </h3>
              </div>
            </div>
            <div className="bg-emerald-50 p-2 sm:p-3 rounded-full">
              <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default OrderStatusCards