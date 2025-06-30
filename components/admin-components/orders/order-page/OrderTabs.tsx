import React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import OrderOverviewTab from "./OrderOverviewTab"
import OrderProductsTab from "./OrderProductsTab"
import OrderInvoiceTab from "./OrderInvoiceTab"


interface OrderTabsProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  parsedInvoice: { IntDocNumber: string } | null
  // Props for OrderOverviewTab
  order: any // Consider a more specific type if possible
  isEditMode: boolean
  editedUserData: any
  setEditedUserData: (data: any) => void
  editedProducts: any[]
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
  // Props for OrderProductsTab
  handleQuantityChange: (index: number, newQuantity: number) => void
  handleDeleteProduct: (index: number) => void
  setIsAddProductsModalOpen: (isOpen: boolean) => void
  // Props for OrderInvoiceTab
  isLoadingInvoiceDetails: boolean
  invoiceError: string | null
  invoiceDetails: any // Consider a more specific type if possible
  getStatusColor: (statusCode: string) => string
  formatDateTime: (dateTime: string) => string
}

const OrderTabs: React.FC<OrderTabsProps> = ({
  activeTab,
  setActiveTab,
  parsedInvoice,
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
  handleQuantityChange,
  handleDeleteProduct,
  setIsAddProductsModalOpen,
  isLoadingInvoiceDetails,
  invoiceError,
  invoiceDetails,
  getStatusColor,
  formatDateTime,
}) => {
  return (
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

      <TabsContent value="overview" className="mt-0">
        <OrderOverviewTab
          order={order}
          isEditMode={isEditMode}
          editedUserData={editedUserData}
          setEditedUserData={setEditedUserData}
          editedProducts={editedProducts}
          handleEditToggle={handleEditToggle}
          handleSaveChanges={handleSaveChanges}
          isSaving={isSaving}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
          hasDiscount={hasDiscount}
          discountPercentage={discountPercentage}
          originalPrice={originalPrice}
          discountAmount={discountAmount}
          handleInvoiceStringSubmit={handleInvoiceStringSubmit}
          invoiceStringInput={invoiceStringInput}
          setInvoiceStringInput={setInvoiceStringInput}
          isSubmittingInvoiceString={isSubmittingInvoiceString}
          setActiveTab={setActiveTab} // Pass setActiveTab down
          parsedInvoice={parsedInvoice} // Pass parsedInvoice down for the invoice input form
        />
      </TabsContent>

      <TabsContent value="products" className="mt-0">
        <OrderProductsTab
          orderProducts={order.products}
          isEditMode={isEditMode}
          editedProducts={editedProducts}
          handleQuantityChange={handleQuantityChange}
          handleDeleteProduct={handleDeleteProduct}
          handleEditToggle={handleEditToggle}
          handleSaveChanges={handleSaveChanges}
          isSaving={isSaving}
          setIsAddProductsModalOpen={setIsAddProductsModalOpen}
          formatCurrency={formatCurrency}
          hasDiscount={hasDiscount}
          originalPrice={originalPrice}
          discountAmount={discountAmount}
        />
      </TabsContent>

      {parsedInvoice && (
        <TabsContent value="invoice" className="mt-0">
          <OrderInvoiceTab
            parsedInvoice={parsedInvoice}
            isLoadingInvoiceDetails={isLoadingInvoiceDetails}
            invoiceError={invoiceError}
            invoiceDetails={invoiceDetails}
            getStatusColor={getStatusColor}
            formatCurrency={formatCurrency}
            formatDateTime={formatDateTime}
          />
        </TabsContent>
      )}
    </Tabs>
  )
}

export default OrderTabs