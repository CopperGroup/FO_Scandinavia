import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  Package,
  Truck,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  User,
  Calendar,
  ChevronRight,
  Tag,
  Percent,
  FileText,
} from "lucide-react"
import type { ProductType } from "@/lib/types/types"

interface Product {
  product: ProductType
  amount: number
}

interface OrderCardProps {
  id: string
  products: Product[]
  user: string
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
  invoice?: {
    number: string
    date: string
    trackingNumber: string
  }
  invoiceString?: string
}

const AdminOrderCard = ({
  id,
  products,
  value,
  name,
  surname,
  phoneNumber,
  email,
  paymentType,
  deliveryMethod,
  city,
  adress,
  postalCode,
  data,
  paymentStatus,
  deliveryStatus,
  url,
  promocode,
  discount,
  invoice,
  invoiceString,
}: OrderCardProps) => {
  const formatter = new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: "UAH",
  })

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
    <Card className="w-full shadow-md border-slate-200 overflow-hidden">
      <CardHeader className="bg-slate-50 border-b border-slate-200 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-heading4-medium text-slate-800">Замовлення #{id.substring(0, 8)}</CardTitle>
            <CardDescription className="text-small-regular text-slate-500 flex items-center mt-1">
              <Calendar className="h-3.5 w-3.5 mr-1" />
              {data}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-1">
            <Badge className={`${getStatusBgColor(paymentStatus)} text-white text-xs font-medium px-2.5 py-0.5`}>
              {paymentStatus === "Pending" && "Очікується"}
              {paymentStatus === "Success" && "Оплачено"}
              {paymentStatus === "Declined" && "Відхилено"}
            </Badge>
            <Badge className={`${getStatusBgColor(deliveryStatus)} text-white text-xs font-medium px-2.5 py-0.5`}>
              {deliveryStatus === "Proceeding" && "Підготовка"}
              {deliveryStatus === "Indelivery" && "В дорозі"}
              {deliveryStatus === "Fulfilled" && "Доставлено"}
              {deliveryStatus === "Canceled" && "Скасовано"}
            </Badge>
            {invoice && (
              <Badge className="bg-blue-600 text-white text-xs font-medium px-2.5 py-0.5">
                Накладна №{invoice.number}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 px-4 pb-0">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center text-slate-700">
              <User className="h-4 w-4 mr-2" />
              <span className="text-base-medium">
                {name} {surname}
              </span>
            </div>
            <div className="text-base-semibold text-slate-900">{formatter.format(value)}</div>
          </div>

          <div className="mb-4 mt-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-700">Статус доставки</span>
              <span className={`text-sm font-medium ${getStatusColor(deliveryStatus)}`}>
                {deliveryStatus === "Proceeding" && "Підготовка"}
                {deliveryStatus === "Indelivery" && "В дорозі"}
                {deliveryStatus === "Fulfilled" && "Доставлено"}
                {deliveryStatus === "Canceled" && "Скасовано"}
              </span>
            </div>
            <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
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

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start">
              <Phone className="h-4 w-4 mr-2 text-slate-500 mt-0.5" />
              <div>
                <p className="text-small-regular text-slate-500">Телефон</p>
                <Link href={`tel:${phoneNumber}`} className="text-small-semibold text-slate-700 hover:underline">
                  {phoneNumber}
                </Link>
              </div>
            </div>

            <div className="flex items-start">
              <Mail className="h-4 w-4 mr-2 text-slate-500 mt-0.5" />
              <div>
                <p className="text-small-regular text-slate-500">Email</p>
                <Link href={`mailto:${email}`} className="text-small-semibold text-slate-700 hover:underline">
                  {email}
                </Link>
              </div>
            </div>

            <div className="flex items-start">
              <CreditCard className="h-4 w-4 mr-2 text-slate-500 mt-0.5" />
              <div>
                <p className="text-small-regular text-slate-500">Оплата</p>
                <p className="text-small-semibold text-slate-700">{paymentType}</p>
              </div>
            </div>

            <div className="flex items-start">
              <Truck className="h-4 w-4 mr-2 text-slate-500 mt-0.5" />
              <div>
                <p className="text-small-regular text-slate-500">Доставка</p>
                <p className="text-small-semibold text-slate-700">{deliveryMethod}</p>
              </div>
            </div>

            {promocode && (
              <div className="flex items-start">
                <Tag className="h-4 w-4 mr-2 text-slate-500 mt-0.5" />
                <div>
                  <p className="text-small-regular text-slate-500">Промокод</p>
                  <p className="text-small-semibold text-slate-700">{promocode}</p>
                </div>
              </div>
            )}

            {discount && discount > 0 && (
              <div className="flex items-start">
                <Percent className="h-4 w-4 mr-2 text-slate-500 mt-0.5" />
                <div>
                  <p className="text-small-regular text-slate-500">Знижка</p>
                  <p className="text-small-semibold text-slate-700">{discount}%</p>
                </div>
              </div>
            )}

            {invoice && (
              <div className="flex items-start">
                <FileText className="h-4 w-4 mr-2 text-slate-500 mt-0.5" />
                <div>
                  <p className="text-small-regular text-slate-500">Трек-номер</p>
                  <p className="text-small-semibold text-slate-700">{invoice.trackingNumber}</p>
                </div>
              </div>
            )}

            {invoiceString && (
              <div className="flex items-start col-span-2">
                <FileText className="h-4 w-4 mr-2 text-slate-500 mt-0.5" />
                <div>
                  <p className="text-small-regular text-slate-500">Номер рахунку</p>
                  <p className="text-small-semibold text-slate-700 font-mono">
                    {invoiceString.substring(0, 2)} {invoiceString.substring(2, 6)} {invoiceString.substring(6, 10)}{" "}
                    {invoiceString.substring(10, 14)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-start">
            <MapPin className="h-4 w-4 mr-2 text-slate-500 mt-0.5" />
            <div>
              <p className="text-small-regular text-slate-500">Адреса</p>
              <p className="text-small-semibold text-slate-700">
                {city}, {adress}, {postalCode}
              </p>
            </div>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="products" className="border-slate-200">
              <AccordionTrigger className="text-base-medium text-slate-700 py-2">
                Товари ({products.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {products.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0"
                    >
                      <div className="flex items-center">
                        <Package className="h-4 w-4 mr-2 text-slate-500" />
                        <span className="text-small-medium text-slate-700">{item.product.name}</span>
                      </div>
                      <span className="text-small-medium text-slate-600">x{item.amount}</span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {promocode && discount && discount > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center text-small-medium">
                <span className="text-slate-600">Сума без знижки:</span>
                <span className="text-slate-700">{formatter.format(value / (1 - discount / 100))}</span>
              </div>
              <div className="flex justify-between items-center text-small-medium mt-1">
                <span className="text-slate-600">Знижка ({discount}%):</span>
                <span className="text-green-600">-{formatter.format(value / (1 - discount / 100) - value)}</span>
              </div>
              <div className="flex justify-between items-center text-base-semibold mt-1">
                <span className="text-slate-700">Фінальна сума:</span>
                <span className="text-slate-900">{formatter.format(value)}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between pt-2 pb-4 px-4 border-t border-slate-100 mt-4">
        <Link href={`${url}${id}`}>
          <Button variant="outline" className="text-small-semibold text-slate-700">
            Деталі замовлення
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}

export default AdminOrderCard
