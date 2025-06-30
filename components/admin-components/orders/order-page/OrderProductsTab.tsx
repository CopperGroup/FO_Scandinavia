import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Edit, Save, X, Plus, Trash2, Package, ArrowUp, ArrowDown } from "lucide-react"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface OrderProductsTabProps {
  orderProducts: any[] // Use specific Product type
  isEditMode: boolean
  editedProducts: any[] // Use specific Product type
  handleQuantityChange: (index: number, newQuantity: number) => void
  handleDeleteProduct: (index: number) => void
  handleEditToggle: () => void
  handleSaveChanges: () => Promise<void>
  isSaving: boolean
  setIsAddProductsModalOpen: (isOpen: boolean) => void
  formatCurrency: (value: number) => string
  hasDiscount: boolean
  originalPrice: number
  discountAmount: number
  discountPercentage: number; // <--- ADD THIS LINE
}

const OrderProductsTab: React.FC<OrderProductsTabProps> = ({
  orderProducts,
  isEditMode,
  editedProducts,
  handleQuantityChange,
  handleDeleteProduct,
  handleEditToggle,
  handleSaveChanges,
  isSaving,
  setIsAddProductsModalOpen,
  formatCurrency,
  hasDiscount,
  originalPrice,
  discountAmount,
  discountPercentage, // <--- ADD THIS LINE to destructuring
}) => {
  const productsToDisplay = isEditMode ? editedProducts : orderProducts

  return (
    <Card className="bg-white border-none shadow-sm overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
          <h3 className="text-base sm:text-lg font-semibold text-slate-800">
            Замовлені товари ({productsToDisplay.length})
          </h3>

          <div className="flex items-center gap-2">
            {isEditMode && (
              <>
                <Button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-xs"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 animate-spin" />
                      Збереження...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                      Зберегти
                    </>
                  )}
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="bg-blue-500 hover:bg-blue-600 text-white rounded-full text-xs"
                      onClick={() => setIsAddProductsModalOpen(true)}
                    >
                      <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                      Додати товари
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </>
            )}

            <Button
              onClick={handleEditToggle}
              variant="outline"
              size="sm"
              className={`text-xs rounded-full ${
                isEditMode
                  ? "text-slate-600 border-slate-200 hover:bg-slate-50"
                  : "text-blue-500 border-blue-200 hover:bg-blue-50"
              }`}
            >
              {isEditMode ? (
                <>
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  Скасувати
                </>
              ) : (
                <>
                  <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  Редагувати
                </>
              )}
            </Button>

            {!isEditMode && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-slate-600 border-slate-200 hover:bg-slate-50 rounded-full text-xs bg-transparent"
                >
                  <ArrowUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  Ціна
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-slate-600 border-slate-200 hover:bg-slate-50 rounded-full text-xs bg-transparent"
                >
                  <ArrowDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  Дата
                </Button>
              </>
            )}
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
                    {isEditMode && <th className="pb-3 font-medium text-right">Дії</th>}
                  </tr>
                </thead>
                <tbody>
                  {productsToDisplay.map((product: any, index: number) => (
                    <tr
                      key={index}
                      className="border-b border-slate-100 last:border-0 sm:table-row flex flex-col py-3 sm:py-0"
                    >
                      <td className="py-1 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="bg-slate-100 h-10 w-10 sm:h-12 sm:w-12 rounded-md flex items-center justify-center">
                            <Package className="h-5 w-5 sm:h-6 sm:w-6 text-slate-600" />
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="font-medium text-slate-800 line-clamp-1 text-xs sm:text-sm">
                                {product.product.name}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{product.product.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                      <td className="py-1 sm:py-4 text-slate-600 text-xs sm:text-sm">
                        <span className="sm:hidden font-medium text-slate-500 mr-2">Артикул:</span>
                        {product.product.articleNumber}
                      </td>
                      <td className="py-1 sm:py-4 text-left sm:text-center">
                        <span className="sm:hidden font-medium text-slate-500 mr-2">Кількість:</span>
                        {isEditMode ? (
                          <Input
                            type="number"
                            min="1"
                            value={product.amount}
                            onChange={(e) => handleQuantityChange(index, Number.parseInt(e.target.value) || 1)}
                            className="w-20 text-center text-xs"
                          />
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-slate-50 text-slate-600 border-slate-200 rounded-full text-xs"
                          >
                            x{product.amount}
                          </Badge>
                        )}
                      </td>
                      <td className="py-1 sm:py-4 text-left sm:text-right font-medium text-slate-800 text-xs sm:text-sm">
                        <span className="sm:hidden font-medium text-slate-500 mr-2">Ціна:</span>
                        {formatCurrency(product.product.priceToShow * product.amount)}
                      </td>
                      {isEditMode && (
                        <td className="py-1 sm:py-4 text-left sm:text-right">
                          <Button
                            onClick={() => handleDeleteProduct(index)}
                            variant="outline"
                            size="sm"
                            className="text-rose-500 border-rose-200 hover:bg-rose-50 rounded-full"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      )}
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
              {productsToDisplay.reduce((total: number, item: any) => total + item.amount, 0)}{" "}
              шт.
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
                  Знижка ({discountPercentage}%): {/* Accessing discountPercentage here */}
                </span>
                <span className="text-emerald-600 text-xs sm:text-sm">-{formatCurrency(discountAmount)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-center mt-2">
            <span className="text-slate-800 font-semibold text-sm sm:text-base">Загальна вартість:</span>
            <span className="text-emerald-600 font-bold text-base sm:text-lg">
              {formatCurrency(
                productsToDisplay.reduce((total: number, item: any) => total + item.product.priceToShow * item.amount, 0)
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default OrderProductsTab