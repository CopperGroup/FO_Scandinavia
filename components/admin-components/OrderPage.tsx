"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  MapPin,
  Phone,
  Mail,
  MessageSquare,
  CreditCard,
  Truck,
  Tag,
  Percent,
  FileText,
  Loader2,
  Package,
  User,
  Info,
  AlertCircle,
  Building,
  Box,
  DollarSign,
  Printer,
  Download,
  Calendar,
  Send,
  Copy,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import ChangeOrdersStatuses from "../interface/ChangeOrdersStatuses"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { useSearchParams } from "next/navigation"
import { calculateDeliveryCost, createCounterParty, createCounterPartyContact, generateInvoice, getInvoiceDetails } from "@/lib/actions/order.actions"

interface Product {
  product: {
    _id: string
    id: string
    name: string
    images: string[]
    priceToShow: number
    articleNumber: string
    params: {
      name: string
      value: string
    }[]
  }
  amount: number
}

// Basic invoice info from order
interface BasicInvoiceInfo {
  Ref: string
  CostOnSite: number | string
  EstimatedDeliveryDate: string
  IntDocNumber: string
  TypeDocument: string
}

// Detailed invoice info from API
interface DetailedInvoiceInfo {
  Number: string
  StatusCode: string
  DateCreated: string
  Status: string
  RefEW: string
  RecipientDateTime: string
  CargoType: string
  CargoDescriptionString: string
  DocumentCost: string
  AnnouncedPrice: number
  DocumentWeight: number
  CheckWeight: number
  CalculatedWeight: string
  CheckWeightMethod: string
  FactualWeight: string
  VolumeWeight: string
  SeatsAmount: string
  ServiceType: string
  CitySender: string
  CounterpartySenderDescription: string
  PhoneSender: string
  SenderAddress: string
  WarehouseSender: string
  CityRecipient: string
  CounterpartyRecipientDescription: string
  PhoneRecipient: string
  RecipientAddress: string
  RecipientFullName: string
  WarehouseRecipient: string
  WarehouseRecipientAddress: string
  PayerType: string
  PaymentMethod: string
  ScheduledDeliveryDate: string
  ActualDeliveryDate: string
  DateScan: string
  TrackingUpdateDate: string
  Redelivery: number
  RedeliverySum: string
  [key: string]: any // For other fields we might not use directly
}

interface OrderProps {
  order: {
    _id: string
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
    deliveryStatus: "Proceeding" | "Indelivery" | "Canceled" | "Fulfilled"
    promocode?: string
    discount?: string
    invoice?: string // JSON string
    data: string
  }
}

export default function OrderPage({ orderJson }: { orderJson: string }) {
  const order = JSON.parse(orderJson)
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false)
  const [isLoadingInvoiceDetails, setIsLoadingInvoiceDetails] = useState(false)
  const [invoiceDetails, setInvoiceDetails] = useState<DetailedInvoiceInfo | null>(null)
  const [invoiceError, setInvoiceError] = useState<string | null>(null)
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [parsedInvoice, setParsedInvoice] = useState<BasicInvoiceInfo | null>(null)

  // Parse invoice if it exists
  useEffect(() => {
    if (order.invoice) {
      try {
        setParsedInvoice(JSON.parse(order.invoice))
      } catch (e) {
        console.error("Failed to parse invoice:", e)
      }
    }
  }, [order.invoice])

  // Check if we should open the invoice accordion based on URL params
  useEffect(() => {
    const openInvoice = searchParams.get("openInvoice")
    if (openInvoice === "true" && order.invoice) {
      setExpandedAccordion("invoice")
      setActiveTab("invoice")
    }
  }, [searchParams, order.invoice])

  // Add this useEffect to load invoice details when the invoice tab is selected
  useEffect(() => {
    if (activeTab === "invoice" && parsedInvoice && !invoiceDetails && !isLoadingInvoiceDetails) {
      setIsLoadingInvoiceDetails(true)
      setInvoiceError(null)

      getInvoiceDetails(parsedInvoice.IntDocNumber)
        .then((details) => {
          setInvoiceDetails(details)
        })
        .catch((error) => {
          console.error("Failed to fetch invoice details:", error)
          setInvoiceError("Не вдалося завантажити деталі накладної. Спробуйте пізніше.")
          toast({
            title: "Помилка",
            description: "Не вдалося завантажити деталі накладної",
            variant: "destructive",
          })
        })
        .finally(() => {
          setIsLoadingInvoiceDetails(false)
        })
    }
  }, [activeTab, parsedInvoice, invoiceDetails, isLoadingInvoiceDetails, toast])

  // Use a consistent formatter that will work the same on server and client
  const formatCurrency = (value: number) => {
    return (
      new Intl.NumberFormat("uk-UA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value) + " грн"
    )
  }

  // Calculate original price if discount is applied
  const hasDiscount = order.discount && Number.parseFloat(order.discount) > 0
  const discountPercentage = hasDiscount ? Number.parseFloat(order.discount) : 0
  const originalPrice = hasDiscount ? order.value / (1 - discountPercentage / 100) : order.value
  const discountAmount = hasDiscount ? originalPrice - order.value : 0

  // Format date (DD-MM-YYYY or DD-MM-YYYY HH:MM:SS)
  const formatDate = (dateString: string) => {
    if (!dateString) return "—"

    // Handle different date formats
    if (dateString.includes("-")) {
      // Format: DD-MM-YYYY or DD-MM-YYYY HH:MM:SS
      const parts = dateString.split(" ")
      const datePart = parts[0]
      const [day, month, year] = datePart.split("-")
      return `${day}.${month}.${year}`
    } else if (dateString.includes(".")) {
      // Format: DD.MM.YYYY or HH:MM DD.MM.YYYY
      const parts = dateString.split(" ")
      if (parts.length > 1) {
        // Format: HH:MM DD.MM.YYYY
        return `${parts[1]} ${parts[0]}`
      }
      return dateString
    }

    // Default case - try to parse as ISO date
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date)
    } catch (e) {
      return dateString
    }
  }

  // Format datetime
  const formatDateTime = (dateTimeString: string) => {
    if (!dateTimeString) return "—"

    // Handle different datetime formats
    if (dateTimeString.includes("-") && dateTimeString.includes(":")) {
      // Format: DD-MM-YYYY HH:MM:SS
      const [datePart, timePart] = dateTimeString.split(" ")
      const [day, month, year] = datePart.split("-")
      return `${day}.${month}.${year} ${timePart}`
    } else if (dateTimeString.includes(".") && dateTimeString.includes(":")) {
      // Format: HH:MM DD.MM.YYYY
      return dateTimeString
    }

    // Default case - try to parse as ISO date
    try {
      const date = new Date(dateTimeString)
      return new Intl.DateTimeFormat("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    } catch (e) {
      return dateTimeString
    }
  }

  const getStatusColor = (statusCode: string) => {
    const code = Number.parseInt(statusCode, 10)

    if (code >= 9) {
      return "text-emerald-600 font-medium" // Delivered
    } else if (code >= 5 && code <= 8) {
      return "text-blue-600 font-medium" // In transit
    } else if (code >= 2 && code <= 4) {
      return "text-amber-600 font-medium" // Processing
    } else if (code === 10 || code < 0) {
      return "text-rose-600 font-medium" // Cancelled or error
    } else {
      return "text-gray-600" // Default
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "Success":
        return "bg-emerald-500"
      case "Pending":
        return "bg-amber-500"
      case "Declined":
        return "bg-rose-500"
      default:
        return "bg-gray-400"
    }
  }

  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case "Fulfilled":
        return "bg-emerald-500"
      case "Indelivery":
        return "bg-blue-500"
      case "Proceeding":
        return "bg-amber-500"
      case "Canceled":
        return "bg-rose-500"
      default:
        return "bg-gray-400"
    }
  }

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case "Success":
        return "Оплачено"
      case "Pending":
        return "Очікує оплати"
      case "Declined":
        return "Відхилено"
      default:
        return status
    }
  }

  // Get delivery status text
  const getDeliveryStatusText = (status: string) => {
    switch (status) {
      case "Fulfilled":
        return "Доставлено"
      case "Indelivery":
        return "В дорозі"
      case "Proceeding":
        return "Підготовка"
      case "Canceled":
        return "Скасовано"
      default:
        return status
    }
  }

  // Update the handleGenerateInvoice function to handle the Nova Poshta API response
  const handleGenerateInvoice = async () => {
    setIsGeneratingInvoice(true)
    try {
      const counterPartyRef = await createCounterParty({ stringifiedOrder: orderJson })
      const counterPartyContact = await createCounterPartyContact({ stringifiedOrder: orderJson, ref: counterPartyRef });
      const deliveryCost = await calculateDeliveryCost({ stringifiedOrder: orderJson })

      const result = await generateInvoice({ stringifiedOrder: orderJson, counterPartyRef, contactRef: counterPartyContact, deliveryCost })
      toast({
        title: "Накладну сформовано",
        description: `Накладну №${result.IntDocNumber} успішно сформовано`,
      })
      // Refresh the page to show the updated invoice
      window.location.reload()
    } catch (error) {
      console.error("Error generating invoice:", error)
      toast({
        title: "Помилка",
        description: "Не вдалося сформувати накладну. Спробуйте ще раз.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingInvoice(false)
    }
  }

  // Remove this function
  // Load invoice details when accordion is expanded
  // const handleAccordionChange = async (value: string) => {
  //   if (value === "invoice" && parsedInvoice && !invoiceDetails && !isLoadingInvoiceDetails) {
  //     setIsLoadingInvoiceDetails(true)
  //     setInvoiceError(null)

  //     try {
  //       const details = await getInvoiceDetails(parsedInvoice.IntDocNumber)
  //       setInvoiceDetails(details)
  //     } catch (error) {
  //       console.error("Failed to fetch invoice details:", error)
  //       setInvoiceError("Не вдалося завантажити деталі накладної. Спробуйте пізніше.")
  //       toast({
  //         title: "Помилка",
  //         description: "Не вдалося завантажити деталі накладної",
  //         variant: "destructive",
  //       })
  //     } finally {
  //       setIsLoadingInvoiceDetails(false)
  //     }
  //   }

  //   setExpandedAccordion(value === expandedAccordion ? null : value)
  // }

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 sm:mb-6 md:mb-8 gap-3 md:gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Замовлення</h1>
              <Badge
                variant="outline"
                className="bg-white text-slate-600 rounded-full px-2 sm:px-3 py-0.5 sm:py-1 border-slate-200 text-xs sm:text-sm"
              >
                <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
                {formatDate(order.data || new Date().toISOString())}
              </Badge>
            </div>
            <div className="flex items-center flex-wrap gap-1 sm:gap-2 text-slate-500 text-sm">
              <span className="font-medium">#{order.id.substring(0, 8)}</span>
              <span className="hidden xs:inline">•</span>
              <span className="line-clamp-1">
                {order.name} {order.surname}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto mt-3 md:mt-0">
            {!parsedInvoice ? (
              <Button
                onClick={handleGenerateInvoice}
                disabled={isGeneratingInvoice}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-full px-3 sm:px-6 text-xs sm:text-sm w-full md:w-auto"
              >
                {isGeneratingInvoice ? (
                  <>
                    <Loader2 className="mr-1.5 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    Формування...
                  </>
                ) : (
                  <>
                    <FileText className="mr-1.5 h-3 w-3 sm:h-4 sm:w-4" />
                    Сформувати накладну
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setActiveTab("invoice")
                  // No need for expandedAccordion since we're using tabs
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-full px-3 sm:px-6 text-xs sm:text-sm w-full md:w-auto"
              >
                <FileText className="mr-1.5 h-3 w-3 sm:h-4 sm:w-4" />
                Переглянути накладну
              </Button>
            )}
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="bg-white border-none shadow-sm overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 mb-1 text-sm">Нові замовлення</p>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-800">{order.products.length}</h3>
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
                      className={`h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full ${getPaymentStatusColor(order.paymentStatus)}`}
                    ></div>
                    <h3 className="text-base sm:text-lg font-medium text-slate-800">
                      {getPaymentStatusText(order.paymentStatus)}
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
                      className={`h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full ${getDeliveryStatusColor(order.deliveryStatus)}`}
                    ></div>
                    <h3 className="text-base sm:text-lg font-medium text-slate-800">
                      {getDeliveryStatusText(order.deliveryStatus)}
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

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4 sm:mb-6">
          <TabsList className="bg-white border-none shadow-sm w-full justify-start h-auto p-0 rounded-lg mb-4 sm:mb-6 overflow-x-auto no-scrollbar">
            <div className="flex min-w-full">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-transparent data-[state=active]:text-blue-500 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:shadow-none rounded-none py-2 sm:py-3 px-3 sm:px-6 font-medium text-slate-600 text-xs sm:text-sm whitespace-nowrap"
              >
                Огляд
              </TabsTrigger>
              <TabsTrigger
                value="products"
                className="data-[state=active]:bg-transparent data-[state=active]:text-blue-500 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:shadow-none rounded-none py-2 sm:py-3 px-3 sm:px-6 font-medium text-slate-600 text-xs sm:text-sm whitespace-nowrap"
              >
                Товари
              </TabsTrigger>
              {parsedInvoice && (
                <TabsTrigger
                  value="invoice"
                  className="data-[state=active]:bg-transparent data-[state=active]:text-blue-500 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:shadow-none rounded-none py-2 sm:py-3 px-3 sm:px-6 font-medium text-slate-600 text-xs sm:text-sm whitespace-nowrap relative"
                >
                  Накладна
                  <span className="absolute top-1 right-1 h-2 w-2 bg-blue-500 rounded-full"></span>
                </TabsTrigger>
              )}
            </div>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Left column - Customer & Order Info */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Customer Information */}
                  <Card className="bg-white border-none shadow-sm overflow-hidden">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <h3 className="text-base sm:text-lg font-semibold text-slate-800">Інформація про клієнта</h3>
                        <div className="bg-blue-50 p-1.5 sm:p-2 rounded-full">
                          <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                        </div>
                      </div>
                      <div className="space-y-3 sm:space-y-4">
                        <div>
                          <p className="text-xs sm:text-sm text-slate-500 mb-0.5 sm:mb-1">Ім&apos;я</p>
                          <p className="font-medium text-slate-800 text-sm sm:text-base">
                            {order.name} {order.surname}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                          <Link
                            href={`tel:${order.phoneNumber}`}
                            className="text-blue-500 hover:underline text-sm sm:text-base"
                          >
                            {order.phoneNumber}
                          </Link>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                          <Link
                            href={`mailto:${order.email}`}
                            className="text-blue-500 hover:underline text-sm sm:text-base break-all"
                          >
                            {order.email}
                          </Link>
                        </div>
                        <div className="flex items-start gap-1.5 sm:gap-2">
                          <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500 mt-0.5" />
                          <Link
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.adress}, ${order.city}, ${order.postalCode}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline text-sm sm:text-base break-words"
                          >
                            {order.city}, {order.adress}, {order.postalCode}
                          </Link>
                        </div>
                        {order.comment && (
                          <div className="flex items-start gap-1.5 sm:gap-2">
                            <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500 mt-0.5" />
                            <p className="text-xs sm:text-sm text-slate-600 break-words">{order.comment}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Order Details */}
                  <Card className="bg-white border-none shadow-sm overflow-hidden">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <h3 className="text-base sm:text-lg font-semibold text-slate-800">Деталі замовлення</h3>
                        <div className="bg-amber-50 p-1.5 sm:p-2 rounded-full">
                          <Info className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                        </div>
                      </div>
                      <div className="space-y-3 sm:space-y-4">
                        <div>
                          <p className="text-xs sm:text-sm text-slate-500 mb-0.5 sm:mb-1">Метод доставки</p>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                            <p className="font-medium text-slate-800 text-sm sm:text-base">{order.deliveryMethod}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm text-slate-500 mb-0.5 sm:mb-1">Метод оплати</p>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                            <p className="font-medium text-slate-800 text-sm sm:text-base">{order.paymentType}</p>
                          </div>
                        </div>
                        {order.promocode && (
                          <div>
                            <p className="text-xs sm:text-sm text-slate-500 mb-0.5 sm:mb-1">Промокод</p>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                              <p className="font-medium text-slate-800 text-sm sm:text-base">{order.promocode}</p>
                            </div>
                          </div>
                        )}
                        {order.discount && Number.parseFloat(order.discount) > 0 && (
                          <div>
                            <p className="text-xs sm:text-sm text-slate-500 mb-0.5 sm:mb-1">Знижка</p>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <Percent className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
                              <p className="font-medium text-emerald-600 text-sm sm:text-base">{order.discount}%</p>
                            </div>
                          </div>
                        )}
                        {parsedInvoice && (
                          <div>
                            <p className="text-xs sm:text-sm text-slate-500 mb-0.5 sm:mb-1">Трек-номер</p>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                              <p className="font-medium text-slate-800 text-sm sm:text-base break-all">
                                {parsedInvoice.IntDocNumber}
                              </p>
                            </div>
                          </div>
                        )}
                        <Separator className="my-2" />
                        <ChangeOrdersStatuses
                          _id={order._id}
                          id={order.id}
                          paymentStatus={order.paymentStatus}
                          deliveryStatus={order.deliveryStatus}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Products Summary */}
                <Card className="bg-white border-none shadow-sm overflow-hidden">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <h3 className="text-base sm:text-lg font-semibold text-slate-800">
                        Товари в замовленні ({order.products.length})
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-500 border-blue-200 hover:bg-blue-50 rounded-full text-xs sm:text-sm"
                        onClick={() => setActiveTab("products")}
                      >
                        Переглянути всі
                      </Button>
                    </div>
                    <div className="space-y-0 max-h-[300px] overflow-y-auto pr-1">
                      <div className="overflow-x-auto -mx-4 sm:-mx-6">
                        <div className="inline-block min-w-full align-middle px-4 sm:px-6">
                          <table className="min-w-full">
                            <thead>
                              <tr className="text-left text-xs sm:text-sm text-slate-500 border-b border-slate-200">
                                <th className="pb-2 font-medium">Товар</th>
                                <th className="pb-2 font-medium text-right">Кількість</th>
                                <th className="pb-2 font-medium text-right">Ціна</th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.products.slice(0, 5).map((product: Product, index: number) => (
                                <tr key={index} className="border-b border-slate-100 last:border-0">
                                  <td className="py-2 sm:py-3">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                      <div className="bg-slate-100 p-1.5 sm:p-2 rounded-md">
                                        <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600" />
                                      </div>
                                      <span className="font-medium text-slate-800 line-clamp-1 text-xs sm:text-sm">
                                        {product.product.name}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2 sm:py-3 text-right">
                                    <Badge
                                      variant="outline"
                                      className="bg-slate-50 text-slate-600 border-slate-200 rounded-full text-xs"
                                    >
                                      x{product.amount}
                                    </Badge>
                                  </td>
                                  <td className="py-2 sm:py-3 text-right font-medium text-slate-800 text-xs sm:text-sm">
                                    {formatCurrency(product.product.priceToShow * product.amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      {order.products.length > 5 && (
                        <div className="text-center pt-3">
                          <Button
                            variant="ghost"
                            className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-full text-xs sm:text-sm"
                            onClick={() => setActiveTab("products")}
                          >
                            Переглянути всі товари ({order.products.length})
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right column - Order Summary */}
              <div className="lg:col-span-1 space-y-4 sm:space-y-6">
                {/* Order Summary */}
                <Card className="bg-white border-none shadow-sm overflow-hidden sticky top-6">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <h3 className="text-base sm:text-lg font-semibold text-slate-800">Сума замовлення</h3>
                      <div className="bg-emerald-50 p-1.5 sm:p-2 rounded-full">
                        <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
                      </div>
                    </div>
                    <div className="space-y-3 sm:space-y-4">
                      <div className="bg-slate-50 p-3 sm:p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-slate-600 text-xs sm:text-sm">Кількість товарів:</span>
                          <span className="font-medium text-slate-800 text-xs sm:text-sm">{order.products.length}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-slate-600 text-xs sm:text-sm">Загальна кількість:</span>
                          <span className="font-medium text-slate-800 text-xs sm:text-sm">
                            {order.products.reduce((total, item) => total + item.amount, 0)} шт.
                          </span>
                        </div>
                        {hasDiscount && (
                          <>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-slate-600 text-xs sm:text-sm">Початкова вартість:</span>
                              <span className="line-through text-slate-500 text-xs sm:text-sm">
                                {formatCurrency(originalPrice)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-slate-600 text-xs sm:text-sm">Знижка ({order.discount}%):</span>
                              <span className="text-emerald-600 text-xs sm:text-sm">
                                -{formatCurrency(discountAmount)}
                              </span>
                            </div>
                          </>
                        )}
                        <Separator className="my-2 sm:my-3" />
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-slate-800 text-sm sm:text-base">Загальна вартість:</span>
                          <span className="font-bold text-base sm:text-lg text-emerald-600">
                            {formatCurrency(order.value)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          className="w-full justify-start hover:bg-slate-50 border-slate-200 text-slate-700 rounded-full text-xs sm:text-sm"
                          onClick={() => {
                            navigator.clipboard.writeText(order.id)
                            toast({
                              title: "Скопійовано",
                              description: "ID замовлення скопійовано в буфер обміну",
                            })
                          }}
                        >
                          <Copy className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          Копіювати ID замовлення
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start hover:bg-slate-50 border-slate-200 text-slate-700 rounded-full text-xs sm:text-sm"
                          onClick={() => {
                            window.print()
                          }}
                        >
                          <Printer className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          Друкувати замовлення
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start hover:bg-slate-50 border-slate-200 text-slate-700 rounded-full text-xs sm:text-sm"
                          onClick={() => {
                            window.location.href = `mailto:${order.email}?subject=Замовлення №${order.id.substring(0, 8)}&body=Шановний(а) ${order.name} ${order.surname},%0D%0A%0D%0AДякуємо за ваше замовлення №${order.id.substring(0, 8)}.%0D%0A%0D%0AЗ повагою,%0D%0AКоманда підтримки`
                          }}
                        >
                          <Send className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          Написати клієнту
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="mt-0">
            <Card className="bg-white border-none shadow-sm overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-800">
                    Замовлені товари ({order.products.length})
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-slate-600 border-slate-200 hover:bg-slate-50 rounded-full text-xs"
                    >
                      <ArrowUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                      Ціна
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-slate-600 border-slate-200 hover:bg-slate-50 rounded-full text-xs"
                    >
                      <ArrowDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                      Дата
                    </Button>
                  </div>
                </div>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                  <div className="overflow-x-auto -mx-4 sm:-mx-6">
                    <div className="inline-block min-w-full align-middle px-4 sm:px-6">
                      <table className="min-w-full">
                        <thead className="hidden sm:table-header-group">
                          <tr className="text-left text-xs sm:text-sm text-slate-500 border-b border-slate-200">
                            <th className="pb-3 font-medium">Товар</th>
                            <th className="pb-3 font-medium">Артикул</th>
                            <th className="pb-3 font-medium text-center">Кількість</th>
                            <th className="pb-3 font-medium text-right">Ціна</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.products.map((product: Product, index: number) => (
                            <tr
                              key={index}
                              className="border-b border-slate-100 last:border-0 sm:table-row flex flex-col py-3 sm:py-0"
                            >
                              <td className="py-1 sm:py-4">
                                <div className="flex items-center gap-2 sm:gap-3">
                                  <div className="bg-slate-100 h-10 w-10 sm:h-12 sm:w-12 rounded-md flex items-center justify-center">
                                    <Package className="h-5 w-5 sm:h-6 sm:w-6 text-slate-600" />
                                  </div>
                                  <span className="font-medium text-slate-800 text-xs sm:text-sm">
                                    {product.product.name}
                                  </span>
                                </div>
                              </td>
                              <td className="py-1 sm:py-4 text-slate-600 text-xs sm:text-sm">
                                <span className="sm:hidden font-medium text-slate-500 mr-2">Артикул:</span>
                                {product.product.articleNumber}
                              </td>
                              <td className="py-1 sm:py-4 text-left sm:text-center">
                                <span className="sm:hidden font-medium text-slate-500 mr-2">Кількість:</span>
                                <Badge
                                  variant="outline"
                                  className="bg-slate-50 text-slate-600 border-slate-200 rounded-full text-xs"
                                >
                                  x{product.amount}
                                </Badge>
                              </td>
                              <td className="py-1 sm:py-4 text-left sm:text-right font-medium text-slate-800 text-xs sm:text-sm">
                                <span className="sm:hidden font-medium text-slate-500 mr-2">Ціна:</span>
                                {formatCurrency(product.product.priceToShow * product.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="mt-4 sm:mt-6 border-t border-slate-200 pt-3 sm:pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700 font-medium text-xs sm:text-sm">Загальна кількість:</span>
                    <span className="text-slate-800 text-xs sm:text-sm">
                      {order.products.reduce((total, item) => total + item.amount, 0)} шт.
                    </span>
                  </div>
                  {hasDiscount && (
                    <>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-slate-700 font-medium text-xs sm:text-sm">Початкова вартість:</span>
                        <span className="line-through text-slate-500 text-xs sm:text-sm">
                          {formatCurrency(originalPrice)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-slate-700 font-medium text-xs sm:text-sm">
                          Знижка ({order.discount}%):
                        </span>
                        <span className="text-emerald-600 text-xs sm:text-sm">-{formatCurrency(discountAmount)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-slate-800 font-semibold text-sm sm:text-base">Загальна вартість:</span>
                    <span className="text-emerald-600 font-bold text-base sm:text-lg">
                      {formatCurrency(order.value)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoice Tab */}
          {parsedInvoice && (
            <TabsContent value="invoice" className="mt-0">
              <Card className="bg-white border-none shadow-sm overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-1">
                        Накладна №{parsedInvoice.IntDocNumber}
                      </h3>
                      <p className="text-slate-500 text-xs sm:text-sm break-all">Трек-номер: {parsedInvoice.IntDocNumber}</p>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.print()}
                        className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-full text-xs"
                      >
                        <Printer className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                        Друк
                      </Button>
                    </div>
                  </div>

                  {isLoadingInvoiceDetails ? (
                    <div className="space-y-4 sm:space-y-6">
                      <div>
                        <h3 className="text-xs sm:text-sm font-medium mb-2 sm:mb-3 text-slate-700">
                          Інформація про відправлення
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 sm:gap-y-3">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Трек-номер</p>
                            <Skeleton className="h-4 sm:h-5 w-24 sm:w-32" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Дата створення</p>
                            <Skeleton className="h-4 sm:h-5 w-20 sm:w-24" />
                          </div>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <h3 className="text-xs sm:text-sm font-medium mb-2 sm:mb-3 text-slate-700">
                          Інформація про одержувача
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 sm:gap-y-3">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Одержувач</p>
                            <Skeleton className="h-4 sm:h-5 w-32 sm:w-40" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Телефон</p>
                            <Skeleton className="h-4 sm:h-5 w-24 sm:w-32" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : invoiceError ? (
                    <div className="py-6 sm:py-8 text-center">
                      <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-rose-500 mx-auto mb-2 sm:mb-3" />
                      <p className="text-rose-500 font-medium text-sm sm:text-base">{invoiceError}</p>
                    </div>
                  ) : invoiceDetails ? (
                    <div className="space-y-4 sm:space-y-6">
                      {/* Tracking information */}
                      <div>
                        <h3 className="text-xs sm:text-sm font-medium mb-2 sm:mb-3 flex items-center text-slate-700">
                          <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 text-blue-500" />
                          Інформація про відправлення
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-2 sm:gap-y-3 text-xs sm:text-sm bg-slate-50 p-3 sm:p-4 rounded-lg">
                          <div>
                            <p className="text-xs text-slate-500 mb-0.5 sm:mb-1">Трек-номер</p>
                            <p className="font-medium text-slate-800 break-all">{parsedInvoice.IntDocNumber}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-0.5 sm:mb-1">Номер накладної</p>
                            <p className="font-medium text-slate-800">{invoiceDetails.Number}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-0.5 sm:mb-1">Дата створення</p>
                            <p className="text-slate-800">{formatDateTime(invoiceDetails.DateCreated)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-0.5 sm:mb-1">Очікувана дата доставки</p>
                            <p className="text-slate-800">{formatDateTime(invoiceDetails.ScheduledDeliveryDate)}</p>
                          </div>
                          <div className="col-span-1 sm:col-span-2">
                            <p className="text-xs text-slate-500 mb-0.5 sm:mb-1">Статус</p>
                            <p className={`font-medium ${getStatusColor(invoiceDetails.StatusCode)}`}>
                              {invoiceDetails.Status}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-0.5 sm:mb-1">Останнє оновлення</p>
                            <p className="text-slate-800">{formatDateTime(invoiceDetails.TrackingUpdateDate)}</p>
                          </div>
                          {invoiceDetails.ActualDeliveryDate && (
                            <div>
                              <p className="text-xs text-slate-500 mb-0.5 sm:mb-1">Фактична дата доставки</p>
                              <p className="text-slate-800">{formatDateTime(invoiceDetails.ActualDeliveryDate)}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Recipient information */}
                      <div>
                        <h3 className="text-xs sm:text-sm font-medium mb-2 sm:mb-3 flex items-center text-slate-700">
                          <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 text-blue-500" />
                          Інформація про одержувача
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-2 sm:gap-y-3 text-xs sm:text-sm bg-slate-50 p-3 sm:p-4 rounded-lg">
                          <div>
                            <p className="text-xs text-slate-500 mb-0.5 sm:mb-1">Одержувач</p>
                            <p className="font-medium text-slate-800">{invoiceDetails.RecipientFullName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-0.5 sm:mb-1">Телефон</p>
                            <p className="text-slate-800">{invoiceDetails.PhoneRecipient}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-0.5 sm:mb-1">Місто</p>
                            <p className="text-slate-800">{invoiceDetails.CityRecipient}</p>
                          </div>
                          <div className="col-span-1 sm:col-span-2">
                            <p className="text-xs text-slate-500 mb-0.5 sm:mb-1">Відділення</p>
                            <p className="text-slate-800">{invoiceDetails.WarehouseRecipient}</p>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Sender information */}
                      <div>
                        <h3 className="text-xs sm:text-sm font-medium mb-2 sm:mb-3 flex items-center text-slate-700">
                          <Building className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 text-blue-500" />
                          Інформація про відправника
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-2 sm:gap-y-3 text-xs sm:text-sm bg-slate-50 p-3 sm:p-4 rounded-lg">
                          <div>
                            <p className="text-xs text-slate-500 mb-0.5 sm:mb-1">Відправник</p>
                            <p className="font-medium text-slate-800">{invoiceDetails.CounterpartySenderDescription}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-0.5 sm:mb-1">Телефон</p>
                            <p className="text-slate-800">{invoiceDetails.PhoneSender}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-0.5 sm:mb-1">Місто</p>
                            <p className="text-slate-800">{invoiceDetails.CitySender}</p>
                          </div>
                          <div className="col-span-1 sm:col-span-2">
                            <p className="text-xs text-slate-500 mb-0.5 sm:mb-1">Відділення</p>
                            <p className="text-slate-800">{invoiceDetails.WarehouseSender}</p>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Package information */}
                      <div>
                        <h3 className="text-xs sm:text-sm font-medium mb-2 sm:mb-3 flex items-center text-slate-700">
                          <Box className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 text-blue-500" />
                          Інформація про посилку
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-2 sm:gap-y-3 text-xs sm:text-sm bg-slate-50 p-3 sm:p-4 rounded-lg">
                          <div>
                            <p className="text-xs text-slate-500 mb-0.5 sm:mb-1">Опис</p>
                            <p className="text-slate-800">{invoiceDetails.CargoDescriptionString}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-0.5 sm:mb-1">Тип вантажу</p>
                            <p className="text-slate-800">{invoiceDetails.CargoType}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-0.5 sm:mb-1">Вага</p>
                            <p className="text-slate-800">{invoiceDetails.DocumentWeight} кг</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-0.5 sm:mb-1">Кількість місць</p>
                            <p className="text-slate-800">{invoiceDetails.SeatsAmount}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-0.5 sm:mb-1">Оголошена вартість</p>
                            <p className="text-slate-800">{formatCurrency(invoiceDetails.AnnouncedPrice)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-0.5 sm:mb-1">Вартість доставки</p>
                            <p className="text-slate-800">{formatCurrency(invoiceDetails.DocumentCost)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-0.5 sm:mb-1">Тип доставки</p>
                            <p className="text-slate-800">
                              {invoiceDetails.ServiceType === "WarehouseWarehouse"
                                ? "Відділення-Відділення"
                                : invoiceDetails.ServiceType === "WarehousePostomat"
                                  ? "Відділення-Поштомат"
                                  : invoiceDetails.ServiceType === "DoorsWarehouse"
                                    ? "Двері-Відділення"
                                    : invoiceDetails.ServiceType}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-0.5 sm:mb-1">Спосіб оплати</p>
                            <p className="text-slate-800">{invoiceDetails.PaymentMethod}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-0.5 sm:mb-1">Платник</p>
                            <p className="text-slate-800">
                              {invoiceDetails.PayerType === "Sender" ? "Відправник" : "Одержувач"}
                            </p>
                          </div>
                          {invoiceDetails.Redelivery > 0 && invoiceDetails.RedeliverySum && (
                            <div className="col-span-1 sm:col-span-2">
                              <p className="text-xs text-slate-500 mb-0.5 sm:mb-1">Післяплата</p>
                              <p className="text-slate-800">{formatCurrency(invoiceDetails.RedeliverySum)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
