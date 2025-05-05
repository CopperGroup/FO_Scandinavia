"use client"

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
  Download,
  Send,
} from "lucide-react"
import type { ProductType } from "@/lib/types/types"
// import { generateInvoice, sendInvoiceEmail } from "@/lib/actions/invoice.actions"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

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
  paymentStatus: string
  deliveryStatus: string
  url: string
  promocode?: string
  discount?: number
  invoice?: {
    number: string
    date: string
    trackingNumber: string
  }
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
}: OrderCardProps) => {
  const { toast } = useToast()
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  const formatter = new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: "UAH",
  })

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "Оплачено":
        return "bg-green-100 text-green-800"
      case "Очікує оплати":
        return "bg-yellow-100 text-yellow-800"
      case "Скасовано":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case "Доставлено":
        return "bg-green-100 text-green-800"
      case "В дорозі":
        return "bg-blue-100 text-blue-800"
      case "Підготовка":
        return "bg-yellow-100 text-yellow-800"
      case "Скасовано":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleGenerateInvoice = async () => {
    setIsGeneratingInvoice(true)
    try {
      // const result = await generateInvoice(id)
      toast({
        title: "Накладну сформовано",
        // description: `Накладну №${result.number} успішно сформовано`,
      })
      // Refresh the page to show the updated invoice
      window.location.reload()
    } catch (error) {
      toast({
        title: "Помилка",
        description: "Не вдалося сформувати накладну. Спробуйте ще раз.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingInvoice(false)
    }
  }

  const handleSendInvoiceEmail = async () => {
    if (!invoice) return

    setIsSendingEmail(true)
    try {
      // await sendInvoiceEmail({
      //   orderId: id,
      //   email,
      //   name,
      //   trackingNumber: invoice.trackingNumber,
      //   invoiceNumber: invoice.number,
      // })
      toast({
        title: "Лист відправлено",
        description: `Інформацію про накладну відправлено на ${email}`,
      })
    } catch (error) {
      toast({
        title: "Помилка",
        description: "Не вдалося відправити лист. Спробуйте ще раз.",
        variant: "destructive",
      })
    } finally {
      setIsSendingEmail(false)
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
            <Badge className={`${getPaymentStatusColor(paymentStatus)} text-xs font-medium px-2.5 py-0.5`}>
              {paymentStatus}
            </Badge>
            <Badge className={`${getDeliveryStatusColor(deliveryStatus)} text-xs font-medium px-2.5 py-0.5`}>
              {deliveryStatus}
            </Badge>
            {invoice && (
              <Badge className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5">
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
        <div className="flex gap-2">
          {invoice ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="text-small-semibold text-slate-700">
                  <FileText className="mr-1 h-4 w-4" />
                  Накладна №{invoice.number}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={handleSendInvoiceEmail} disabled={isSendingEmail}>
                  <Send className="mr-2 h-4 w-4" />
                  {isSendingEmail ? "Відправка..." : "Відправити клієнту"}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="mr-2 h-4 w-4" />
                  Завантажити PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              className="text-small-semibold text-slate-700"
              onClick={handleGenerateInvoice}
              disabled={isGeneratingInvoice}
            >
              {isGeneratingInvoice ? (
                <>
                  <span className="mr-1">Формування...</span>
                </>
              ) : (
                <>
                  <FileText className="mr-1 h-4 w-4" />
                  Сформувати накладну
                </>
              )}
            </Button>
          )}
        </div>
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
