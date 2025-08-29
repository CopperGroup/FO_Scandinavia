// app/admin/orders/[id]/_components/OrderOverviewTab.tsx

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Loader2, Edit, Save, X, Copy, Printer, Send, MapPin, Phone, Mail, MessageSquare, Tag, Percent, FileText, User, Info, DollarSign, Package, CreditCard, Truck } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import ChangeOrdersStatuses from "@/components/interface/ChangeOrdersStatuses"
import Image from "next/image"

interface OrderOverviewTabProps {
  order: any // Use specific type if defined elsewhere
  isEditMode: boolean
  editedUserData: {
    name: string;
    surname: string;
    phoneNumber: string;
    email: string;
    city: string;
    adress: string;
    comment: string;
    warehouse: string; // Add warehouse to editedUserData prop type
  }
  setEditedUserData: (data: {
    name: string;
    surname: string;
    phoneNumber: string;
    email: string;
    city: string;
    adress: string;
    comment: string;
    warehouse: string; // Add warehouse to setEditedUserData prop type
  }) => void
  editedProducts: any[] // Use specific Product type
  handleEditToggle: () => void
  handleSaveChanges: () => Promise<void>
  isSaving: boolean
  formatDate: (date: string) => string
  formatCurrency: (value: number) => string
  hasDiscount: boolean
  discountPercentage: number
  originalPrice: number
  discountAmount: number
  handleInvoiceStringSubmit: (e: React.FormEvent) => Promise<void>
  invoiceStringInput: string
  setInvoiceStringInput: (value: string) => void
  isSubmittingInvoiceString: boolean
  setActiveTab: (tab: string) => void
  parsedInvoice: any // Use specific type if defined elsewhere
}

const OrderOverviewTab: React.FC<OrderOverviewTabProps> = ({
  order,
  isEditMode,
  editedUserData,
  setEditedUserData,
  editedProducts,
  handleEditToggle,
  handleSaveChanges,
  isSaving,
  formatDate,
  formatCurrency,
  hasDiscount,
  discountPercentage,
  originalPrice,
  discountAmount,
  handleInvoiceStringSubmit,
  invoiceStringInput,
  setInvoiceStringInput,
  isSubmittingInvoiceString,
  setActiveTab,
  parsedInvoice,
}) => {
  const { toast } = useToast();

  return (
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
                  {isEditMode ? (
                    <div className="flex gap-2">
                      <Input
                        value={editedUserData.name}
                        onChange={(e) => setEditedUserData({ ...editedUserData, name: e.target.value })}
                        className="text-sm"
                        placeholder="Ім'я"
                      />
                      <Input
                        value={editedUserData.surname}
                        onChange={(e) => setEditedUserData({ ...editedUserData, surname: e.target.value })}
                        className="text-sm"
                        placeholder="Прізвище"
                      />
                    </div>
                  ) : (
                    <p className="font-medium text-slate-800 text-sm sm:text-base">
                      {order.name} {order.surname}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                  {isEditMode ? (
                    <Input
                      value={editedUserData.phoneNumber}
                      onChange={(e) => setEditedUserData({ ...editedUserData, phoneNumber: e.target.value })}
                      className="text-sm"
                      placeholder="Номер телефону"
                    />
                  ) : (
                    <Link
                      href={`tel:${order.phoneNumber}`}
                      className="text-blue-500 hover:underline text-sm sm:text-base"
                    >
                      {order.phoneNumber}
                    </Link>
                  )}
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                  {isEditMode ? (
                    <Input
                      value={editedUserData.email}
                      onChange={(e) => setEditedUserData({ ...editedUserData, email: e.target.value })}
                      className="text-sm"
                      placeholder="Email"
                      type="email"
                    />
                  ) : (
                    <Link
                      href={`mailto:${order.email}`}
                      className="text-blue-500 hover:underline text-sm sm:text-base break-all"
                    >
                      {order.email}
                    </Link>
                  )}
                </div>

                <div className="flex items-start gap-1.5 sm:gap-2">
                  <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500 mt-0.5" />
                  {isEditMode ? (
                    <div className="flex-1 space-y-2">
                      <Input
                        value={editedUserData.city}
                        onChange={(e) => setEditedUserData({ ...editedUserData, city: e.target.value })}
                        className="text-sm"
                        placeholder="Місто"
                      />
                      <Input
                        value={editedUserData.adress}
                        onChange={(e) => setEditedUserData({ ...editedUserData, adress: e.target.value })}
                        className="text-sm"
                        placeholder="Адреса"
                      />
                      {/* Add input for warehouse */}
                      <Input
                        value={editedUserData.warehouse}
                        onChange={(e) => setEditedUserData({ ...editedUserData, warehouse: e.target.value })}
                        className="text-sm"
                        placeholder="Відділення / Поштомат"
                      />
                    </div>
                  ) : (
                    <Link
                      href={`http://maps.google.com/?q=${encodeURIComponent(`${order.adress}, ${order.city}, ${order.postalCode}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline text-sm sm:text-base break-words"
                    >
                      {order.city}, {order.adress} {order.warehouse && `(${order.warehouse})`}
                    </Link>
                  )}
                </div>

                {(order.comment || isEditMode) && (
                  <div className="flex items-start gap-1.5 sm:gap-2">
                    <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500 mt-0.5" />
                    {isEditMode ? (
                      <Textarea
                        value={editedUserData.comment}
                        onChange={(e) => setEditedUserData({ ...editedUserData, comment: e.target.value })}
                        className="text-sm"
                        placeholder="Коментар"
                        rows={2}
                      />
                    ) : (
                      <p className="text-xs sm:text-sm text-slate-600 break-words">{order.comment}</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Order Details */}
          {/* ... (rest of Order Details Card remains the same) */}
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

                {hasDiscount && (
                  <div>
                    <p className="text-xs sm:text-sm text-slate-500 mb-0.5 sm:mb-1">Знижка</p>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Percent className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
                      <p className="font-medium text-emerald-600 text-sm sm:text-base">{order.discount}%</p>
                    </div>
                  </div>
                )}

                {parsedInvoice ? (
                  <div>
                    <p className="text-xs sm:text-sm text-slate-500 mb-0.5 sm:mb-1">Номер накладної</p>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                      <p className="font-medium text-slate-800 text-sm sm:text-base break-all">
                        {parsedInvoice.IntDocNumber}
                      </p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleInvoiceStringSubmit} className="space-y-2">
                    <p className="text-xs sm:text-sm text-slate-500 mb-0.5">Ввести номер накладної вручну</p>
                    <div className="flex gap-2">
                      <Input
                        value={invoiceStringInput}
                        onChange={(e) => setInvoiceStringInput(e.target.value)}
                        placeholder="00 0000 0000 0000"
                        className="text-sm rounded-full"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={isSubmittingInvoiceString}
                        className="whitespace-nowrap rounded-full"
                      >
                        {isSubmittingInvoiceString ? (
                          <>
                            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                            Збереження...
                          </>
                        ) : (
                          "Зберегти"
                        )}
                      </Button>
                    </div>
                  </form>
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
                Товари в замовленні ({isEditMode ? editedProducts.length : order.products.length})
              </h3>
              <Button
                variant="outline"
                size="sm"
                className="text-blue-500 border-blue-200 hover:bg-blue-50 rounded-full text-xs sm:text-sm bg-transparent"
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
                      {(isEditMode ? editedProducts : order.products)
                        .slice(0, 5)
                        .map((product: any, index: number) => ( // Use 'any' for now, ideally specific Product type
                          <tr key={index} className="border-b border-slate-100 last:border-0">
                            <td className="py-2 sm:py-3">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="relative bg-slate-100 p-1.5 sm:p-2 rounded-md">
                                  <Image src={product.product?.images[0]} fill alt="Product image" className="object-contain"/>
                                </div>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="font-medium text-slate-800 line-clamp-1 text-xs sm:text-sm">
                                      {product.product?.name}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{product.product?.name}</p>
                                  </TooltipContent>
                                </Tooltip>
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
                              {formatCurrency(product.product?.priceToShow * product.amount)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {(isEditMode ? editedProducts : order.products).length > 5 && (
                <div className="text-center pt-3">
                  <Button
                    variant="ghost"
                    className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-full text-xs sm:text-sm"
                    onClick={() => setActiveTab("products")}
                  >
                    Переглянути всі товари ({(isEditMode ? editedProducts.length : order.products.length)})
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right column - Order Summary */}
      <div className="lg:col-span-1 space-y-4 sm:space-y-6">
        {/* Edit Controls */}
        {isEditMode && (
          <Card className="bg-white border-none shadow-sm overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-full"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Збереження...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Зберегти зміни
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleEditToggle}
                  variant="outline"
                  className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 rounded-full bg-transparent"
                >
                  <X className="mr-2 h-4 w-4" />
                  Скасувати
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
                  <span className="font-medium text-slate-800 text-xs sm:text-sm">
                    {(isEditMode ? editedProducts.length : order.products.length)}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-600 text-xs sm:text-sm">Загальна кількість:</span>
                  <span className="font-medium text-slate-800 text-xs sm:text-sm">
                    {(isEditMode ? editedProducts : order.products).reduce(
                      (total: number, item: any) => total + item.amount,
                      0,
                    )}{" "}
                    шт.
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
                    <div className="flex justify-between items-center mt-2">
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
                    {formatCurrency(
                      isEditMode
                        ? editedProducts.reduce(
                          (total: number, item: any) => total + item.product.priceToShow * item.amount,
                          0,
                        )
                        : order.value,
                    )}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {!isEditMode && (
                  <Button
                    onClick={handleEditToggle}
                    variant="outline"
                    className="w-full justify-start hover:bg-slate-50 border-slate-200 text-slate-700 rounded-full text-xs sm:text-sm bg-transparent"
                  >
                    <Edit className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Редагувати замовлення
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full justify-start hover:bg-slate-50 border-slate-200 text-slate-700 rounded-full text-xs sm:text-sm bg-transparent"
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
                  className="w-full justify-start hover:bg-slate-50 border-slate-200 text-slate-700 rounded-full text-xs sm:text-sm bg-transparent"
                  onClick={() => {
                    window.print()
                  }}
                >
                  <Printer className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Друкувати замовлення
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start hover:bg-slate-50 border-slate-200 text-slate-700 rounded-full text-xs sm:text-sm bg-transparent"
                  onClick={() => {
                    window.location.href = `mailto:${isEditMode ? editedUserData.email : order.email}?subject=Замовлення №${order.id.substring(0, 8)}&body=Шановний(а) ${isEditMode ? editedUserData.name : order.name} ${isEditMode ? editedUserData.surname : order.surname},%0D%0A%0D%0AДякуємо за ваше замовлення №${order.id.substring(0, 8)}.%0D%0A%0D%0AЗ повагою,%0D%0AКоманда підтримки`
                  }}
                >
                  <Send className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Написати клієнту
                </Button>

                <Button
                  className="w-full justify-start bg-[#7360F2] hover:bg-[#5e4bd3] text-white border-none rounded-full text-xs sm:text-sm"
                  onClick={() => {
                    const phoneNumber = isEditMode ? editedUserData.phoneNumber : order.phoneNumber
                    const formatted = phoneNumber.replace(/\D/g, "")
                    const number = formatted.startsWith("38") ? `${formatted}` : `38${formatted}`
                    window.open(`viber://chat?number=${number}`, "_blank");
                  }}
                >
                  <Send className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Написати в Viber
                </Button>

                <Button
                  className="w-full justify-start bg-[#229ED9] hover:bg-[#1c8cbf] text-white border-none rounded-full text-xs sm:text-sm"
                  onClick={() => {
                    const phoneNumber = isEditMode ? editedUserData.phoneNumber : order.phoneNumber
                    const digits = phoneNumber.replace(/\D/g, "")
                    const usernameOrNumber = digits.startsWith("38") ? `+${digits}` : `+38${digits}`
                    window.location.href = `https://t.me/${usernameOrNumber}`
                  }}
                >
                  <Send className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Написати в Telegram
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default OrderOverviewTab