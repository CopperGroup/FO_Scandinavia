"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Tag,
  Package,
  ShoppingCart,
  Layers,
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import DeleteProductsButton from "../interface/DeleteProductsButton"

interface Product {
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

const ITEMS_PER_PAGE = 10

const ProductsTable = ({ stringifiedProducts }: { stringifiedProducts: string }) => {
  const products: Product[] = useMemo(() => JSON.parse(stringifiedProducts), [stringifiedProducts])
  const [pageNumber, setPageNumber] = useState(1)
  const [inputValue, setInputValue] = useState("")
  const [searchField, setSearchField] = useState("name")
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [isMobileView, setIsMobileView] = useState(false)

  const router = useRouter()

  // Перевірка розміру екрану
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileView(window.innerWidth < 640)
    }

    // Початкова перевірка
    checkScreenSize()

    // Слухач зміни розміру вікна
    window.addEventListener("resize", checkScreenSize)

    // Очищення слухача
    return () => window.removeEventListener("resize", checkScreenSize)
  }, [])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const searchValue = product[searchField as keyof Product]
      if (typeof searchValue === "boolean") {
        return inputValue.toLowerCase() === searchValue.toString()
      }
      return searchValue.toString().toLowerCase().includes(inputValue.toLowerCase())
    })
  }, [products, searchField, inputValue])

  const paginatedProducts = useMemo(() => {
    const start = (pageNumber - 1) * ITEMS_PER_PAGE
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredProducts, pageNumber])

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)

  useEffect(() => {
    setPageNumber(1)
  }, [searchField, inputValue])

  const formatter = new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: "UAH",
  })

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(productId)) {
        newSet.delete(productId)
      } else {
        newSet.add(productId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(products.map((product) => product._id)))
    }
  }

  // Переклад для полів пошуку
  const searchFields = [
    { value: "name", label: "Назва" },
    { value: "id", label: "ID" },
    { value: "vendor", label: "Постачальник" },
    { value: "category", label: "Категорія" },
    { value: "isAvailable", label: "Доступність" },
    { value: "articleNumber", label: "Артикул" },
  ]

  // Статистика продуктів
  const availableProducts = useMemo(() => products.filter((p) => p.isAvailable).length, [products])
  const discountedProducts = useMemo(() => products.filter((p) => p.priceToShow < p.price).length, [products])

  // Функція для відображення мобільної картки продукту
  const renderMobileProductCard = (product: Product) => (
    <Card key={product._id} className="mb-3 border-slate-200 overflow-hidden">
      <CardContent className="p-3">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base-semibold text-slate-800 truncate">{product.name}</h3>
            <p className="text-subtle-medium text-slate-500 truncate">ID: {product.id}</p>
          </div>
          <div className="flex items-center ml-2">
            <Checkbox
              checked={selectedProducts.has(product._id)}
              onCheckedChange={() => toggleProductSelection(product._id)}
              className="border-slate-300 mr-2"
              onClick={(e) => e.stopPropagation()}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/admin/createProduct/list/${product._id}`)}>
                  <Eye className="mr-2 h-4 w-4" />
                  <span>Переглянути</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/admin/createProduct/list/${product._id}`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Редагувати</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleProductSelection(product._id)
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Видалити</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <p className="text-tiny-medium text-slate-500">Постачальник</p>
            <p className="text-small-medium text-slate-700 truncate">{product.vendor}</p>
          </div>
          <div>
            <p className="text-tiny-medium text-slate-500">Артикул</p>
            <p className="text-small-medium text-slate-700 truncate">{product.articleNumber}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <p className="text-tiny-medium text-slate-500">Ціна без знижки</p>
            <p className="text-small-medium text-slate-700">{formatter.format(product.price)}</p>
          </div>
          <div>
            <p className="text-tiny-medium text-slate-500">Ціна зі знижкою</p>
            <p
              className={`text-small-medium ${product.priceToShow < product.price ? "text-red-600 font-medium" : "text-slate-700"}`}
            >
              {formatter.format(product.priceToShow)}
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              product.isAvailable ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {product.isAvailable ? "Доступний" : "Недоступний"}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => router.push(`/admin/createProduct/list/${product._id}`)}
          >
            Деталі
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-6 max-w-full">
      <div className="border-b border-slate-200 pb-4 sm:pb-8 pt-4 sm:pt-6 -mx-2 sm:-mx-0 px-2 sm:px-0">
        <div className="max-w-full mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 sm:gap-4">
            <div>
              <h1 className="text-heading3-bold sm:text-heading2-bold">Ваш склад</h1>
              <p className="text-small-regular sm:text-base-regular text-slate-600 mt-1">
                Керуйте каталогом товарів, цінами та наявністю
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Статистика - адаптивна сітка */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-3 sm:p-6 flex items-center justify-between">
            <div>
              <p className="text-small-medium text-slate-500">Всього товарів</p>
              <h3 className="text-heading4-medium sm:text-heading3-bold text-slate-900 mt-1">{products.length}</h3>
            </div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-blue-50 rounded-full flex items-center justify-center">
              <Layers className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-3 sm:p-6 flex items-center justify-between">
            <div>
              <p className="text-small-medium text-slate-500">Доступно</p>
              <h3 className="text-heading4-medium sm:text-heading3-bold text-slate-900 mt-1">{availableProducts}</h3>
              <p className="text-tiny-medium sm:text-subtle-medium text-slate-500">
                {Math.round((availableProducts / products.length) * 100)}% від загальної кількості
              </p>
            </div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-green-50 rounded-full flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm sm:col-span-2 lg:col-span-1">
          <CardContent className="p-3 sm:p-6 flex items-center justify-between">
            <div>
              <p className="text-small-medium text-slate-500">Зі знижкою</p>
              <h3 className="text-heading4-medium sm:text-heading3-bold text-slate-900 mt-1">{discountedProducts}</h3>
              <p className="text-tiny-medium sm:text-subtle-medium text-slate-500">
                {Math.round((discountedProducts / products.length) * 100)}% від загальної кількості
              </p>
            </div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-red-50 rounded-full flex items-center justify-center">
              <Tag className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-heading4-medium sm:text-heading3-bold text-slate-800">
                Каталог товарів
              </CardTitle>
              <CardDescription className="text-tiny-medium sm:text-small-regular text-slate-500">
                Управляйте товарами, редагуйте інформацію та ціни
              </CardDescription>
            </div>
            <Button
              variant="outline"
              className="border-slate-200 text-slate-700 hover:bg-slate-50 text-small-medium self-start sm:self-center"
            >
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Сортувати
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center">
              <div className="flex-1 w-full sm:w-auto relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  className="w-full pl-10 text-small-regular sm:text-base-regular border-slate-200 focus:border-slate-300 focus:ring-slate-200"
                  placeholder={`Пошук за ${searchFields.find((f) => f.value === searchField)?.label.toLowerCase() || "назвою"}...`}
                  onChange={(e) => setInputValue(e.target.value)}
                  value={inputValue}
                />
              </div>
              <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 sm:gap-4">
                <Select onValueChange={(value) => setSearchField(value)}>
                  <SelectTrigger className="w-full sm:w-[180px] text-small-regular sm:text-base-regular border-slate-200">
                    <Filter className="mr-2 h-4 w-4 text-slate-500" />
                    <SelectValue placeholder="Шукати за..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {searchFields.map((field) => (
                        <SelectItem
                          key={field.value}
                          value={field.value}
                          className="text-small-regular sm:text-base-regular"
                        >
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <DeleteProductsButton
                  selectedIds={Array.from(selectedProducts)}
                  onDeleteComplete={() => setSelectedProducts(new Set())}
                />
              </div>
            </div>

            {/* Мобільний вигляд для маленьких екранів */}
            {isMobileView ? (
              <div className="space-y-2">
                {paginatedProducts.length > 0 ? (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-small-medium text-slate-500">{filteredProducts.length} товарів знайдено</p>
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => toggleSelectAll()}>
                        {selectedProducts.size === products.length ? "Зняти все" : "Вибрати все"}
                      </Button>
                    </div>
                    {paginatedProducts.map(renderMobileProductCard)}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-base-medium text-slate-500">Товари не знайдено</p>
                  </div>
                )}
              </div>
            ) : (
              // Десктопний вигляд таблиці
              <div className="w-full overflow-auto rounded-md border border-slate-200">
                <Table className="min-w-full">
                  <TableHeader className="bg-slate-50">
                    <TableRow className="text-small-semibold text-slate-700 hover:bg-slate-50">
                      <TableHead className="w-[50px] text-center">
                        <Checkbox
                          checked={selectedProducts.size === products.length && products.length > 0}
                          onCheckedChange={toggleSelectAll}
                          className="border-slate-300"
                        />
                      </TableHead>
                      <TableHead className="text-small-semibold w-[80px]">ID</TableHead>
                      <TableHead className="text-small-semibold w-[120px]">Постачальник</TableHead>
                      <TableHead className="text-small-semibold">Назва</TableHead>
                      <TableHead className="text-small-semibold w-[100px]">Доступність</TableHead>
                      <TableHead className="text-small-semibold text-right w-[120px]">Ціна без знижки</TableHead>
                      <TableHead className="text-small-semibold text-right w-[120px]">Ціна зі знижкою</TableHead>
                      <TableHead className="text-small-semibold w-[100px]">Артикул</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProducts.length > 0 ? (
                      paginatedProducts.map((product) => (
                        <TableRow
                          key={product._id}
                          className="cursor-pointer hover:bg-slate-50 transition-all text-base-regular"
                          onClick={() => router.push(`/admin/createProduct/list/${product._id}`)}
                        >
                          <TableCell className="font-medium" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedProducts.has(product._id)}
                              onCheckedChange={() => toggleProductSelection(product._id)}
                              className="border-slate-300"
                            />
                          </TableCell>
                          <TableCell className="text-small-medium text-slate-600 truncate max-w-[80px]">
                            {product.id}
                          </TableCell>
                          <TableCell className="text-small-medium text-slate-600 truncate max-w-[120px]">
                            {product.vendor}
                          </TableCell>
                          <TableCell className="text-small-medium font-medium text-slate-800 truncate max-w-[200px]">
                            {product.name}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                product.isAvailable ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              }`}
                            >
                              {product.isAvailable ? "Так" : "Ні"}
                            </span>
                          </TableCell>
                          <TableCell className="text-small-medium text-right text-slate-600 whitespace-nowrap">
                            {formatter.format(product.price)}
                          </TableCell>
                          <TableCell
                            className={`text-small-medium text-right whitespace-nowrap ${
                              product.priceToShow < product.price ? "text-red-600 font-medium" : "text-slate-600"
                            }`}
                          >
                            {formatter.format(product.priceToShow)}
                          </TableCell>
                          <TableCell className="text-small-medium text-slate-600 truncate max-w-[100px]">
                            {product.articleNumber}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-base-medium text-slate-500">
                          Товари не знайдено
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Пагінація - адаптивна для малих екранів */}
      <div className="flex justify-between items-center mt-4">
        <Button
          onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
          disabled={pageNumber === 1}
          variant="outline"
          size={isMobileView ? "sm" : "default"}
          className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-800"
        >
          <ChevronLeft className="mr-1 sm:mr-2 h-4 w-4" />
          <span className="text-xs sm:text-small-medium">{isMobileView ? "Назад" : "Попередня"}</span>
        </Button>
        <p className="text-xs sm:text-small-medium text-slate-600">
          {pageNumber} / {totalPages || 1}
        </p>
        <Button
          onClick={() => setPageNumber((prev) => Math.min(prev + 1, totalPages))}
          disabled={pageNumber === totalPages || totalPages === 0}
          variant="outline"
          size={isMobileView ? "sm" : "default"}
          className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-800"
        >
          <span className="text-xs sm:text-small-medium">{isMobileView ? "Далі" : "Наступна"}</span>
          <ChevronRight className="ml-1 sm:ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Підсумковий блок - адаптивний для малих екранів */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 bg-slate-50 p-3 sm:p-4 rounded-lg border border-slate-200 text-xs sm:text-small-medium">
        <p className="text-slate-500">
          Показано {filteredProducts.length > 0 ? (pageNumber - 1) * ITEMS_PER_PAGE + 1 : 0}-
          {Math.min(pageNumber * ITEMS_PER_PAGE, filteredProducts.length)} з {filteredProducts.length} товарів
        </p>
        <div className="flex items-center gap-2 text-slate-500">
          <Package className="h-3 w-3 sm:h-4 sm:w-4" />
          <span>Всього товарів: {products.length}</span>
        </div>
      </div>
    </div>
  )
}

export default ProductsTable

