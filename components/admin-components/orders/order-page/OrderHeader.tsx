import React from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Loader2, Calendar } from "lucide-react"

interface OrderHeaderProps {
  orderId: string
  orderDate: string
  customerName: string
  customerSurname: string
  invoice?: string // Original invoice string
  parsedInvoice: { IntDocNumber: string } | null
  isGeneratingInvoice: boolean
  handleGenerateInvoice: () => Promise<void>
  setActiveTab: (tab: string) => void
}

const OrderHeader: React.FC<OrderHeaderProps> = ({
  orderId,
  orderDate,
  customerName,
  customerSurname,
  invoice,
  parsedInvoice,
  isGeneratingInvoice,
  handleGenerateInvoice,
  setActiveTab,
}) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return "—"
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

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 sm:mb-6 md:mb-8 gap-3 md:gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Замовлення</h1>
          <Badge
            variant="outline"
            className="bg-white text-slate-600 rounded-full px-2 sm:px-3 py-0.5 sm:py-1 border-slate-200 text-xs sm:text-sm"
          >
            <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
            {formatDate(orderDate)}
          </Badge>
        </div>
        <div className="flex items-center flex-wrap gap-1 sm:gap-2 text-slate-500 text-sm">
          <span className="font-medium">#{orderId.substring(0, 8)}</span>
          <span className="hidden xs:inline">•</span>
          <span className="line-clamp-1">
            {customerName} {customerSurname}
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
            onClick={() => setActiveTab("invoice")}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-full px-3 sm:px-6 text-xs sm:text-sm w-full md:w-auto"
          >
            <FileText className="mr-1.5 h-3 w-3 sm:h-4 sm:w-4" />
            Переглянути накладну
          </Button>
        )}
      </div>
    </div>
  )
}

export default OrderHeader