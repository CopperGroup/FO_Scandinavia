import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Search, Package, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip" // Import Tooltip components

// Interfaces (Ideally, these would be in a separate, shared types file, e.g., 'app/types/order.ts')
interface AvailableProduct {
  _id: string
  id: string
  vendor: string
  name: string
  isAvailable: boolean
  price: number
  priceToShow: number
  category: string
  articleNumber: string
}

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

interface AddProductsModalProps {
  isOpen: boolean
  onClose: () => void
  availableProducts: AvailableProduct[] // Not directly used for rendering here, but represents the full list fetched by parent
  isLoadingProducts: boolean
  searchQuery: string
  setSearchQuery: (query: string) => void
  filteredAvailableProducts: AvailableProduct[] // The list already filtered by search query in parent
  displayedProductsCount: number // How many products to show based on scroll
  hasMoreProducts: boolean // Whether there are more products to load
  productListRef: React.RefObject<HTMLDivElement> // Ref for the scrollable container to observe
  handleAddProduct: (product: AvailableProduct) => void // Function to add product to order
  editedProducts: Product[] // The current list of products in the order (to disable already added items)
  PRODUCTS_PER_PAGE: number // Constant for pagination chunk size
  setDisplayedProductsCount: (count: (prev: number) => number) => void // Setter for "Load More" button
  formatCurrency: (value: number) => string // Currency formatting utility
}

const AddProductsModal: React.FC<AddProductsModalProps> = ({
  isOpen,
  onClose,
  isLoadingProducts,
  searchQuery,
  setSearchQuery,
  filteredAvailableProducts,
  displayedProductsCount,
  hasMoreProducts,
  productListRef,
  handleAddProduct,
  editedProducts,
  PRODUCTS_PER_PAGE,
  setDisplayedProductsCount,
  formatCurrency,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Додати товари до замовлення</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Пошук товарів за назвою, артикулом або виробником..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Products List */}
          {/* Attach the ref here for the IntersectionObserver */}
          <div ref={productListRef} className="max-h-[400px] overflow-y-auto border rounded-lg">
            {/* Show initial loading spinner if no products are displayed yet */}
            {isLoadingProducts && displayedProductsCount === PRODUCTS_PER_PAGE && filteredAvailableProducts.length === 0 ? (
              <div className="p-6 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
                <p className="text-slate-600">Завантаження товарів...</p>
              </div>
            ) : filteredAvailableProducts.length === 0 && !isLoadingProducts ? ( // No products found after loading/filtering
              <div className="p-6 text-center">
                <Package className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                <p className="text-slate-600">{searchQuery ? "Товари не знайдено" : "Немає доступних товарів"}</p>
              </div>
            ) : ( // Render the list of products
              <div className="divide-y divide-slate-200">
                {/* Slice the filtered list to show only the currently displayed count */}
                {filteredAvailableProducts.slice(0, displayedProductsCount).map((product) => (
                  <div key={product._id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="bg-slate-100 h-12 w-12 rounded-md flex items-center justify-center">
                          <Package className="h-6 w-6 text-slate-600" />
                        </div>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-slate-800 truncate line-clamp-1">
                                        {product.name.slice(0, 50)}
                                    </h4>
                                    <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                                        <span>Артикул: {product.articleNumber}</span>
                                        <span>Виробник: {product.vendor}</span>
                                        <Badge
                                            variant={product.isAvailable ? "default" : "secondary"}
                                            className={`text-xs ${
                                                product.isAvailable
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-slate-100 text-slate-600"
                                            }`}
                                            >
                                            {product.isAvailable ? "В наявності" : "Немає в наявності"}
                                        </Badge>
                                    </div>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {/* Show full product name in the tooltip */}
                              <p>{product.name}</p>
                            </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold text-slate-800">{formatCurrency(product.priceToShow)}</p>
                        </div>
                        <Button
                          onClick={() => handleAddProduct(product)}
                          // Disable button if product is not available or already added to the order
                          disabled={!product.isAvailable || editedProducts.some(p => p.product._id === product._id)}
                          size="sm"
                          className="bg-blue-500 hover:bg-blue-600 text-white rounded-full"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {editedProducts.some(p => p.product._id === product._id) ? "Додано" : "Додати"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {/* "Load More" button or loading spinner for infinite scroll */}
                {hasMoreProducts && displayedProductsCount < filteredAvailableProducts.length && (
                  <div className="p-4 text-center">
                    {isLoadingProducts ? ( // Show loader while fetching next batch
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" />
                    ) : ( // Show "Load More" button
                      <Button
                        variant="ghost"
                        onClick={() => setDisplayedProductsCount((prevCount) => prevCount + PRODUCTS_PER_PAGE)}
                        className="text-blue-500 hover:text-blue-600"
                      >
                        Завантажити більше
                      </Button>
                    )}
                  </div>
                )}
                {/* Message when all products are loaded (and there were more than initially displayed) */}
                {!hasMoreProducts && filteredAvailableProducts.length > PRODUCTS_PER_PAGE && (
                  <div className="p-4 text-center text-slate-500 text-sm">
                    Усі товари завантажено
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AddProductsModal