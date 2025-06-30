import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, Info, User, Building, Box, Printer } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"


interface OrderInvoiceTabProps {
  parsedInvoice: { IntDocNumber: string } | null
  isLoadingInvoiceDetails: boolean
  invoiceError: string | null
  invoiceDetails: any // Use specific DetailedInvoiceInfo type
  getStatusColor: (statusCode: string) => string
  formatCurrency: (value: number) => string
  formatDateTime: (dateTime: string) => string
}

const OrderInvoiceTab: React.FC<OrderInvoiceTabProps> = ({
  parsedInvoice,
  isLoadingInvoiceDetails,
  invoiceError,
  invoiceDetails,
  getStatusColor,
  formatCurrency,
  formatDateTime,
}) => {
  if (!parsedInvoice) {
    return (
      <Card className="bg-white border-none shadow-sm overflow-hidden">
        <CardContent className="p-6 text-center text-slate-500">
          <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-amber-500 mx-auto mb-2 sm:mb-3" />
          <p>Накладна не знайдена або ще не сформована.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-none shadow-sm overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-1">
              Накладна №{parsedInvoice.IntDocNumber}
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm break-all">
              Трек-номер: {parsedInvoice.IntDocNumber}
            </p>
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
  )
}

export default OrderInvoiceTab