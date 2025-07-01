"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  Loader2,
  Download,
  ChevronDown,
  X,
  Calendar,
  DollarSign,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import DeleteProductsButton from "../interface/DeleteProductsButton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { fetchAllCategories } from "@/lib/actions/categories.actions";
import type { CategoryType } from "@/lib/types/types";
import { generateFullCatalogXmlOnClient } from "@/lib/xml-parser/export";
import { fetchProductsByBatches } from "@/lib/actions/product.actions";
import BulkEditProductsModal from "./modals/BulkEditProductsModal/BulkEditProductsModal";
import { Store } from "@/constants/store";

interface Product {
  _id: string;
  id: string;
  vendor: string;
  name: string;
  isAvailable: boolean;
  price: number;
  priceToShow: number;
  category: string;
  articleNumber: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PriceFilter {
  min: string;
  max: string;
}

interface DateFilter {
  from: string;
  to: string;
}

interface FilterState {
  price: PriceFilter;
  createdAt: DateFilter;
  updatedAt: DateFilter;
}

interface InitialFilters {
  search: string;
  searchField: string;
  priceMin: string;
  priceMax: string;
  createdFrom: string;
  createdTo: string;
  updatedFrom: string;
  updatedTo: string;
  sortField: string;
  sortDirection: "asc" | "desc";
  page: number;
}

// Add these functions before the ProductsTable component
const convertToUTC = (localDateTimeString: string): Date => {
  if (!localDateTimeString) return new Date(0);
  const localDate = new Date(localDateTimeString);
  // Convert local date to UTC representation without changing the time itself
  return new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000);
};

const convertToLocalDateTime = (utcDateString: string): string => {
  if (!utcDateString) return "";
  const utcDate = new Date(utcDateString);
  // Convert UTC date to local date string for display in datetime-local input
  const localDate = new Date(utcDate.getTime() + utcDate.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const ITEMS_PER_PAGE = 10;

const ProductsTable = ({
  stringifiedProducts,
  initialFilters,
}: {
  stringifiedProducts: string;
  initialFilters: InitialFilters;
}) => {
  console.log("ProductsTable: Rendered");
  const products: Product[] = useMemo(() => JSON.parse(stringifiedProducts), [stringifiedProducts]);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize pageNumber from initialFilters, it will be updated by handlePageChange
  const [pageNumber, setPageNumber] = useState(initialFilters.page);
  const [inputValue, setInputValue] = useState(initialFilters.search);
  const [searchField, setSearchField] = useState(initialFilters.searchField);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isMobileView, setIsMobileView] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState("");
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);

  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    field: string;
    direction: "asc" | "desc";
  } | null>(initialFilters.sortField ? { field: initialFilters.sortField, direction: initialFilters.sortDirection } : null);

  // Advanced filter states - Ensuring full structure from initialFilters
  const [filters, setFilters] = useState<FilterState>({
    price: { min: initialFilters.priceMin || "", max: initialFilters.priceMax || "" },
    createdAt: { from: initialFilters.createdFrom || "", to: initialFilters.createdTo || "" },
    updatedAt: { from: initialFilters.updatedFrom || "", to: initialFilters.updatedTo || "" },
  });

  const [isDateFilterModalOpen, setIsDateFilterModalOpen] = useState(false);
  // tempDateFilters is used for the modal's internal state, allowing changes without immediate application to main filters
  // Initialize tempDateFilters with a safe, complete structure from the start
  const [tempDateFilters, setTempDateFilters] = useState<FilterState>({
    price: { min: initialFilters.priceMin || "", max: initialFilters.priceMax || "" },
    createdAt: { from: initialFilters.createdFrom || "", to: initialFilters.createdTo || "" },
    updatedAt: { from: initialFilters.updatedFrom || "", to: initialFilters.updatedTo || "" },
  });

  // Function to update URL search params - wrapped in useCallback for stability
  const updateSearchParams = useCallback(
    (updates: Partial<InitialFilters>) => {
      console.log("updateSearchParams: Called with updates", updates);
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== "" && value !== 0) {
          params.set(key, value.toString());
        } else {
          params.delete(key);
        }
      });
      const newUrl = `?${params.toString()}`;
      console.log("updateSearchParams: Pushing to URL", newUrl);
      router.push(newUrl, { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    console.log("ProductsTable: Checking screen size");
    const checkScreenSize = () => {
      setIsMobileView(window.innerWidth < 640);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Sync tempDateFilters with actual filters when modal opens
  // This ensures modal inputs start with current applied filter values
  // This useEffect ensures `tempDateFilters` always reflects the `filters` state when the modal opens.
  useEffect(() => {
    if (isDateFilterModalOpen) {
      console.log("ProductsTable: Date filter modal opened, syncing tempDateFilters");
      setTempDateFilters(filters);
    }
  }, [isDateFilterModalOpen, filters]); // Depend on `filters` to get the latest applied values


  const searchFields = [
    { value: "name", label: "Назва" },
    { value: "id", label: "ID" },
    { value: "vendor", label: "Постачальник" },
    { value: "category", label: "Категорія" },
    { value: "isAvailable", label: "Доступність" },
    { value: "articleNumber", label: "Артикул" },
  ];

  const sortFields = [
    { value: "name", label: "Назва" },
    { value: "price", label: "Ціна без знижки" },
    { value: "priceToShow", label: "Ціна зі знижкою" },
    { value: "createdAt", label: "Дата створення" },
    { value: "updatedAt", label: "Дата оновлення" },
    { value: "isAvailable", label: "Доступність" },
  ];

  const availableProducts = useMemo(() => products.filter((p) => p.isAvailable).length, [products]);
  const discountedProducts = useMemo(() => products.filter((p) => p.priceToShow < p.price).length, [products]);

  const sortedAndFilteredProducts = useMemo(() => {
    console.log("ProductsTable: Recalculating sorted and filtered products");
    const filtered = products.filter((product) => {
      // Basic search filter
      const searchValue = product[searchField as keyof Product];
      let matchesSearch = true;

      if (inputValue) {
        if (typeof searchValue === "boolean") {
          matchesSearch = inputValue.toLowerCase() === searchValue.toString();
        } else {
          matchesSearch = searchValue?.toString().toLowerCase().includes(inputValue.toLowerCase()) || false;
        }
      }

      // Price range filter
      let matchesPriceRange = true;
      if (filters.price.min || filters.price.max) {
        const minPrice = filters.price.min ? Number.parseFloat(filters.price.min) : 0;
        const maxPrice = filters.price.max ? Number.parseFloat(filters.price.max) : Number.POSITIVE_INFINITY;
        matchesPriceRange = product.price >= minPrice && product.price <= maxPrice;
      }

      // CreatedAt date range filter
      let matchesCreatedAtRange = true;
      if (product.createdAt && (filters.createdAt.from || filters.createdAt.to)) {
        const productDate = new Date(product.createdAt); // This is already in UTC from MongoDB
        const fromDate = filters.createdAt.from ? convertToUTC(filters.createdAt.from) : new Date(0);
        const toDate = filters.createdAt.to ? convertToUTC(filters.createdAt.to) : new Date();
        matchesCreatedAtRange = productDate >= fromDate && productDate <= toDate;
      }

      // UpdatedAt date range filter
      let matchesUpdatedAtRange = true;
      if (product.updatedAt && (filters.updatedAt.from || filters.updatedAt.to)) {
        const productDate = new Date(product.updatedAt); // This is already in UTC from MongoDB
        const fromDate = filters.updatedAt.from ? convertToUTC(filters.updatedAt.from) : new Date(0);
        const toDate = filters.updatedAt.to ? convertToUTC(filters.updatedAt.to) : new Date();
        matchesUpdatedAtRange = productDate >= fromDate && productDate <= toDate;
      }

      return matchesSearch && matchesPriceRange && matchesCreatedAtRange && matchesUpdatedAtRange;
    });

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.field as keyof Product];
        const bValue = b[sortConfig.field as keyof Product];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        let comparison = 0;

        if (typeof aValue === "string" && typeof bValue === "string") {
          comparison = aValue.localeCompare(bValue, "uk-UA");
        } else if (typeof aValue === "number" && typeof bValue === "number") {
          comparison = aValue - bValue;
        } else if (typeof aValue === "boolean" && typeof bValue === "boolean") {
          comparison = aValue === bValue ? 0 : aValue ? -1 : 1;
        } else if (sortConfig.field === "createdAt" || sortConfig.field === "updatedAt") {
          const dateA = new Date(aValue as string);
          const dateB = new Date(bValue as string);
          comparison = dateA.getTime() - dateB.getTime();
        } else {
          comparison = String(aValue).localeCompare(String(bValue), "uk-UA");
        }

        return sortConfig.direction === "desc" ? -comparison : comparison;
      });
    }

    return filtered;
  }, [products, searchField, inputValue, filters, sortConfig]);

  const paginatedProducts = useMemo(() => {
    console.log("ProductsTable: Recalculating paginated products");
    const start = (pageNumber - 1) * ITEMS_PER_PAGE;
    return sortedAndFilteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedAndFilteredProducts, pageNumber]);

  const totalPages = Math.ceil(sortedAndFilteredProducts.length / ITEMS_PER_PAGE);

  // This useEffect will reset the page number to 1 and update the URL
  // ONLY when search, searchField, or any of the filters change.
  // It specifically excludes `pageNumber` from its dependencies to avoid infinite loops
  // or interfering with pagination clicks.
  useEffect(() => {
    console.log("ProductsTable: Filter/Search changed, resetting page to 1 and updating URL parameters (excluding page)");
    setPageNumber(1); // Reset local page state to 1
    updateSearchParams({
      search: inputValue,
      searchField: searchField,
      priceMin: filters.price.min,
      priceMax: filters.price.max,
      createdFrom: filters.createdAt.from,
      createdTo: filters.createdAt.to,
      updatedFrom: filters.updatedAt.from,
      updatedTo: filters.updatedAt.to,
      // DO NOT include 'page: 1' here, as it conflicts with pagination.
      // The `page` parameter will be updated separately by handlePageChange.
    });
  }, [inputValue, searchField, filters, updateSearchParams]);

  // Use another useEffect to synchronize pageNumber from URL when component mounts or searchParams change
  // This handles cases where the user directly changes the 'page' parameter in the URL
  useEffect(() => {
    const urlPage = Number.parseInt(searchParams.get("page") || "1");
    if (urlPage !== pageNumber) {
      console.log(`ProductsTable: Syncing pageNumber from URL. URL: ${urlPage}, Current State: ${pageNumber}`);
      setPageNumber(urlPage);
    }
  }, [searchParams, pageNumber]); // Add pageNumber to dependencies to react to internal changes too

  const formatter = new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: "UAH",
    currencyDisplay: "code",
  });

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      console.log("toggleProductSelection: Selected products", newSet);
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
      console.log("toggleSelectAll: Deselected all");
    } else {
      setSelectedProducts(new Set(products.map((product) => product._id)));
      console.log("toggleSelectAll: Selected all");
    }
  };

  // This function now ONLY updates the local `filters` state.
  // The URL update happens in the `useEffect` above.
  const updateFilter = (filterType: keyof FilterState, field: string, value: string) => {
    console.log(`updateFilter: Updating ${filterType}.${field} to ${value}`);
    setFilters((prev) => {
      const newFilters = {
        ...prev,
        [filterType]: {
          ...prev[filterType],
          [field]: value,
        },
      };
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    console.log("clearAllFilters: Clearing all filters");
    setFilters({
      price: { min: "", max: "" },
      createdAt: { from: "", to: "" },
      updatedAt: { from: "", to: "" },
    });
    setInputValue("");
    // URL will be updated by the useEffect due to filters and inputValue change
  };

  const hasActiveFilters = useMemo(() => {
    return (
      inputValue ||
      filters.price.min ||
      filters.price.max ||
      filters.createdAt.from ||
      filters.createdAt.to ||
      filters.updatedAt.from ||
      filters.updatedAt.to
    );
  }, [inputValue, filters]);

  const handleSort = (field: string, direction: "asc" | "desc") => {
    console.log(`handleSort: Sorting by ${field} ${direction}`);
    setSortConfig({ field, direction });
    setIsSortModalOpen(false);
    // Sort changes should reset page to 1, so we include it here.
    updateSearchParams({ sortField: field, sortDirection: direction, page: 1 });
  };

  const clearSort = () => {
    console.log("clearSort: Clearing sort");
    setSortConfig(null);
    setIsSortModalOpen(false);
    // Clearing sort should reset page to 1.
    updateSearchParams({ sortField: "", sortDirection: "asc", page: 1 });
  };

  // Keep these immediate as they are primary search controls
  const handleSearchChange = (value: string) => {
    console.log("handleSearchChange: Input value changed to", value);
    setInputValue(value);
    // URL update for search input is handled by the main filter useEffect
  };

  const handleSearchFieldChange = (value: string) => {
    console.log("handleSearchFieldChange: Search field changed to", value);
    setSearchField(value);
    // URL update for search field is handled by the main filter useEffect
  };

  // This function is solely responsible for updating the page number and its URL param.
  const handlePageChange = (newPage: number) => {
    console.log("handlePageChange: Changing page to", newPage);
    setPageNumber(newPage); // Update local state
    updateSearchParams({ page: newPage }); // Update URL
  };

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
                    e.stopPropagation();
                    toggleProductSelection(product._id);
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
        {(product.createdAt || product.updatedAt) && (
          <div className="grid grid-cols-2 gap-2 mb-2">
            {product.createdAt && (
              <div>
                <p className="text-tiny-medium text-slate-500">Створено</p>
                <p className="text-small-medium text-slate-700">
                  {new Date(product.createdAt).toLocaleDateString("uk-UA")}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(product.createdAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            )}
            {product.updatedAt && (
              <div>
                <p className="text-tiny-medium text-slate-500">Оновлено</p>
                <p className="text-small-medium text-slate-700">
                  {new Date(product.updatedAt).toLocaleDateString("uk-UA")}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(product.updatedAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            )}
          </div>
        )}
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
            className="text-xs h-7 bg-transparent"
            onClick={() => router.push(`/admin/createProduct/list/${product._id}`)}
          >
            Деталі
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const handleDateFilterApply = () => {
    console.log("handleDateFilterApply: Applying date filters from temp state to main filters");
    // When "Apply" is clicked, commit the tempDateFilters to the main filters state.
    // The URL parameters will be updated by the main useEffect due to `filters` state change.
    setFilters(tempDateFilters);
    setIsDateFilterModalOpen(false);
  };

  const handleDateFilterCancel = () => {
    console.log("handleDateFilterCancel: Cancelling, reverting tempDateFilters");
    // Revert tempDateFilters to the currently active filters if cancelled
    setTempDateFilters(filters);
    setIsDateFilterModalOpen(false);
  };

  // This function updates the modal's temporary state.
  // The actual filtering and URL update happens when `handleDateFilterApply` is called.
  const updateTempDateFilter = (filterType: "createdAt" | "updatedAt", field: "from" | "to", value: string) => {
    console.log(`updateTempDateFilter: Updating temp ${filterType}.${field} to ${value}`);
    setTempDateFilters((prev) => {
        // Ensure that the nested object (createdAt or updatedAt) exists before accessing its properties
        const currentFilterType = prev[filterType] || { from: "", to: "" };
        return {
            ...prev,
            [filterType]: {
                ...currentFilterType,
                [field]: value,
            },
        };
    });
  };

  const handleExportXml = async () => {
    console.log("handleExportXml: Starting XML export");
    try {
      setIsExporting(true);
      setExportProgress(10);
      setExportStage("Підготовка даних...");

      if (!products || !Array.isArray(products)) {
        throw new Error("Дані про товари не знайдено або вони некоректні.");
      }

      if (products.length === 0) {
        setExportStage("Немає товарів для експорту.");
        setTimeout(() => {
          setIsExporting(false);
          setExportProgress(0);
          setExportStage("");
        }, 2000);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 200));

      setExportProgress(30);
      setExportStage("Отримання категорій...");

      const categoriesJsonString = await fetchAllCategories("json");
      const rawCategories: CategoryType[] = JSON.parse(categoriesJsonString);

      if (!rawCategories || !Array.isArray(rawCategories)) {
        throw new Error("Не вдалося завантажити або обробити категорії.");
      }

      setExportProgress(30);
      setExportStage("Отримання всіх товарів з сервера...");

      const allProducts: any[] = [];
      const batchSize = 500;
      let skip = 0;
      let batch: any[] = [];

      do {
        const raw = await fetchProductsByBatches(batchSize, skip);
        batch = JSON.parse(raw);
        console.log(batch);
        allProducts.push(...batch);
        skip += batchSize;
      } while (batch.length === batchSize);

      setExportProgress(60);
      setExportStage("Генерація XML файлу на вашому пристрої...");

      const xmlString = generateFullCatalogXmlOnClient(rawCategories, allProducts);

      if (!xmlString) {
        throw new Error("Помилка під час генерації XML файлу.");
      }

      setExportProgress(80);
      setExportStage("Підготовка до завантаження...");

      const blob = new Blob([xmlString], { type: "application/xml; charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${Store.name}_catalog_client.xml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportProgress(100);
      setExportStage("Завантаження завершено!");

      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        setExportStage("");
      }, 1000);
    } catch (error: any) {
      console.error("handleExportXml: Export error", error);
      setExportStage(`Помилка: ${error.message}`);
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        setExportStage("");
      }, 3000);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <div className="border-b border-slate-200 pb-4 sm:pb-8 pt-4 sm:pt-6 px-4 sm:px-6">
        <div className="w-full">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 sm:gap-4">
            <div>
              <h1 className="text-heading3-bold sm:text-heading2-bold">Ваш склад</h1>
              <p className="text-small-regular sm:text-base-regular text-slate-600 mt-1">
                Керуйте каталогом товарів, цінами та наявністю
              </p>
            </div>
            <Button onClick={handleExportXml} className="bg-green-600 hover:bg-green-700 text-white">
              <Download className="mr-2 h-4 w-4" />
              Експорт XML
            </Button>
          </div>
        </div>
      </div>

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
                {products.length > 0 ? Math.round((availableProducts / products.length) * 100) : 0}% від загальної
                кількості
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
                {products.length > 0 ? Math.round((discountedProducts / products.length) * 100) : 0}% від загальної
                кількості
              </p>
            </div>
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-red-50 rounded-full flex items-center justify-center">
              <Tag className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100 px-4 sm:px-6">
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
              className="border-slate-200 text-slate-700 hover:bg-slate-50 text-small-medium self-start sm:self-center bg-transparent min-w-0 max-w-[200px]"
              onClick={() => setIsSortModalOpen(true)}
            >
              <ArrowUpDown className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {sortConfig
                  ? `${sortFields.find((f) => f.value === sortConfig.field)?.label} ${sortConfig.direction === "asc" ? "↑" : "↓"}`
                  : "Сортувати"}
              </span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
          <div className="space-y-3 sm:space-y-4">
            {/* Basic Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center">
              <div className="flex-1 w-full sm:w-auto relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  className="w-full pl-10 text-small-regular sm:text-base-regular border-slate-200 focus:border-slate-300 focus:ring-slate-200"
                  placeholder={`Пошук за ${searchFields.find((f) => f.value === searchField)?.label.toLowerCase() || "назвою"}...`}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  value={inputValue}
                />
              </div>

              <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 sm:gap-4">
                <Select onValueChange={handleSearchFieldChange} value={searchField}>
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

                <Button
                  variant="outline"
                  className="w-full sm:w-auto border-slate-200 text-slate-700 hover:bg-slate-50 text-small-medium bg-transparent"
                  onClick={() => setIsBulkEditModalOpen(true)}
                  disabled={selectedProducts.size === 0}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Редагувати вибрані ({selectedProducts.size})
                </Button>

                <DeleteProductsButton
                  selectedIds={Array.from(selectedProducts)}
                  onDeleteComplete={() => setSelectedProducts(new Set())}
                />
              </div>
            </div>

            {/* Advanced Filters */}
            <Collapsible open={isAdvancedFiltersOpen} onOpenChange={setIsAdvancedFiltersOpen}>
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 text-slate-600 hover:text-slate-800">
                    <Filter className="h-4 w-4" />
                    Розширені фільтри
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${isAdvancedFiltersOpen ? "rotate-180" : ""}`}
                    />
                  </Button>
                </CollapsibleTrigger>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Очистити фільтри
                  </Button>
                )}
              </div>

              <CollapsibleContent className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  {/* Price Range Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Діапазон цін (UAH)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Від"
                        value={filters.price.min}
                        onChange={(e) => updateFilter("price", "min", e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        type="number"
                        placeholder="До"
                        value={filters.price.max}
                        onChange={(e) => updateFilter("price", "max", e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  {/* Date Filters Button */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Фільтри за датою
                    </Label>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full bg-transparent"
                      onClick={() => setIsDateFilterModalOpen(true)}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Налаштувати дати
                      {(filters.createdAt.from ||
                        filters.createdAt.to ||
                        filters.updatedAt.from ||
                        filters.updatedAt.to) && (
                        <span className="ml-2 inline-flex items-center justify-center w-2 h-2 bg-blue-600 rounded-full"></span>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Active Filters Summary */}
                {hasActiveFilters && (
                  <div className="flex flex-wrap gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="text-sm font-medium text-blue-800">Активні фільтри:</span>
                    {inputValue && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        Пошук: {inputValue}
                      </span>
                    )}
                    {(filters.price.min || filters.price.max) && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        Ціна: {filters.price.min || "0"} - {filters.price.max || "∞"} UAH
                      </span>
                    )}
                    {(filters.createdAt.from || filters.createdAt.to) && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        Створено: {filters.createdAt.from || "..."} - {filters.createdAt.to || "..."}
                      </span>
                    )}
                    {(filters.updatedAt.from || filters.updatedAt.to) && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        Оновлено: {filters.updatedAt.from || "..."} - {filters.updatedAt.to || "..."}
                      </span>
                    )}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Results Summary */}
            {sortedAndFilteredProducts.length !== products.length && (
              <div className="text-sm text-slate-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                Показано {sortedAndFilteredProducts.length} з {products.length} товарів
                {hasActiveFilters && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={clearAllFilters}
                    className="ml-2 text-yellow-700 hover:text-yellow-800 p-0 h-auto"
                  >
                    Скинути фільтри
                  </Button>
                )}
              </div>
            )}

            {/* Products Table/Cards */}
            {isMobileView ? (
              <div className="space-y-2">
                {paginatedProducts.length > 0 ? (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-small-medium text-slate-500">
                        {sortedAndFilteredProducts.length} товарів знайдено
                      </p>
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => toggleSelectAll()}>
                        {selectedProducts.size === products.length && products.length > 0 ? "Зняти все" : "Вибрати все"}
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
              <div className="w-full overflow-x-auto rounded-md border border-slate-200">
                <Table className="min-w-[1200px]">
                  <TableHeader className="bg-slate-50">
                    <TableRow className="text-small-semibold text-slate-700 hover:bg-slate-50">
                      <TableHead className="w-[50px] text-center">
                        <Checkbox
                          checked={selectedProducts.size === products.length && products.length > 0}
                          onCheckedChange={toggleSelectAll}
                          className="border-slate-300"
                          disabled={products.length === 0}
                        />
                      </TableHead>
                      <TableHead className="text-small-semibold w-[80px]">ID</TableHead>
                      <TableHead className="text-small-semibold w-[120px]">Постачальник</TableHead>
                      <TableHead className="text-small-semibold w-[250px]">Назва</TableHead>
                      <TableHead className="text-small-semibold w-[100px]">Доступність</TableHead>
                      <TableHead className="text-small-semibold text-right w-[120px]">Ціна без знижки</TableHead>
                      <TableHead className="text-small-semibold text-right w-[120px]">Ціна зі знижкою</TableHead>
                      <TableHead className="text-small-semibold w-[100px]">Артикул</TableHead>
                      <TableHead className="text-small-semibold w-[150px]">Створено</TableHead>
                      <TableHead className="text-small-semibold w-[150px]">Оновлено</TableHead>
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
                          <TableCell className="text-small-medium font-medium text-slate-800 truncate max-w-[250px]">
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
                          <TableCell className="text-small-medium text-slate-600 whitespace-nowrap w-[150px]">
                            {product.createdAt ? (
                              <div className="text-xs">
                                <div>{new Date(product.createdAt).toLocaleDateString("uk-UA")}</div>
                                <div className="text-slate-500">
                                  {new Date(product.createdAt).toLocaleTimeString("uk-UA", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-small-medium text-slate-600 whitespace-nowrap w-[150px]">
                            {product.updatedAt ? (
                              <div className="text-xs">
                                <div>{new Date(product.updatedAt).toLocaleDateString("uk-UA")}</div>
                                <div className="text-slate-500">
                                  {new Date(product.updatedAt).toLocaleTimeString("uk-UA", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} className="h-24 text-center text-base-medium text-slate-500">
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

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <Button
          onClick={() => handlePageChange(Math.max(pageNumber - 1, 1))}
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
          onClick={() => handlePageChange(Math.min(pageNumber + 1, totalPages))}
          disabled={pageNumber === totalPages || totalPages === 0}
          variant="outline"
          size={isMobileView ? "sm" : "default"}
          className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-800"
        >
          <span className="text-xs sm:text-small-medium">{isMobileView ? "Далі" : "Наступна"}</span>
          <ChevronRight className="ml-1 sm:ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs sm:text-small-medium">
        <p className="text-slate-500">
          Показано {sortedAndFilteredProducts.length > 0 ? (pageNumber - 1) * ITEMS_PER_PAGE + 1 : 0}-
          {Math.min(pageNumber * ITEMS_PER_PAGE, sortedAndFilteredProducts.length)} з {sortedAndFilteredProducts.length}{" "}
          товарів
        </p>
        <div className="flex items-center gap-2 text-slate-500">
          <Package className="h-3 w-3 sm:h-4 sm:w-4" />
          <span>Всього товарів: {products.length}</span>
        </div>
      </div>

      {/* Export Dialog */}
      <Dialog open={isExporting} onOpenChange={setIsExporting}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Експорт каталогу XML</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <div className="mb-4">
              <Progress value={exportProgress} className="w-full" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                {exportProgress < 100 &&
                exportStage !== "Завантаження завершено!" &&
                !exportStage.startsWith("Помилка:") ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-500" />
                ) : (
                  <Download
                    className={`mr-2 h-4 w-4 ${exportStage.startsWith("Помилка:") ? "text-red-500" : "text-green-500"}`}
                  />
                )}
                <span>{exportStage}</span>
              </div>
              <span className="text-slate-500">{exportProgress}%</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sort Modal */}
      <Dialog open={isSortModalOpen} onOpenChange={setIsSortModalOpen}>
        <DialogContent className="sm:max-w-md w-full mx-4">
          <DialogHeader>
            <DialogTitle>Сортування товарів</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Оберіть поле для сортування:</p>
              {sortFields.map((field) => (
                <div key={field.value} className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">{field.label}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs bg-transparent"
                      onClick={() => handleSort(field.value, "asc")}
                    >
                      ↑ За зростанням
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs bg-transparent"
                      onClick={() => handleSort(field.value, "desc")}
                    >
                      ↓ За спаданням
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-200">
              <Button variant="outline" className="flex-1 bg-transparent" onClick={clearSort}>
                Скинути сортування
              </Button>
              <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setIsSortModalOpen(false)}>
                Закрити
              </Button>
            </div>

            {sortConfig && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Активне сортування:</strong> {sortFields.find((f) => f.value === sortConfig.field)?.label}
                  {sortConfig.direction === "asc" ? " (за зростанням)" : " (за спаданням)"}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Modal */}
      <BulkEditProductsModal
        isOpen={isBulkEditModalOpen}
        onOpenChange={setIsBulkEditModalOpen}
        selectedProductIds={Array.from(selectedProducts)}
        onEditComplete={() => {
          setSelectedProducts(new Set());
          router.refresh();
        }}
      />

      {/* Date Filter Modal */}
      <Dialog open={isDateFilterModalOpen} onOpenChange={setIsDateFilterModalOpen}>
        <DialogContent className="sm:max-w-lg w-full mx-4">
          <DialogHeader>
            <DialogTitle>Фільтри за датою та часом</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="text-sm text-slate-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p>
                **Примітка:** Час автоматично конвертується з вашого місцевого часового поясу в UTC для
                порівняння з базою даних.
              </p>
            </div>

            {/* Created At Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Дата створення
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-500">Від</Label>
                  <Input
                    type="datetime-local"
                    // Use optional chaining just in case, though the state initialization should prevent it
                    value={tempDateFilters.createdAt?.from || ""}
                    onChange={(e) => updateTempDateFilter("createdAt", "from", e.target.value)}
                    className="text-sm w-full"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">До</Label>
                  <Input
                    type="datetime-local"
                    // Use optional chaining just in case
                    value={tempDateFilters.createdAt?.to || ""}
                    onChange={(e) => updateTempDateFilter("createdAt", "to", e.target.value)}
                    className="text-sm w-full"
                  />
                </div>
              </div>
            </div>

            {/* Updated At Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Дата оновлення
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-500">Від</Label>
                  <Input
                    type="datetime-local"
                    // Use optional chaining just in case
                    value={tempDateFilters.updatedAt?.from || ""}
                    onChange={(e) => updateTempDateFilter("updatedAt", "from", e.target.value)}
                    className="text-sm w-full"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">До</Label>
                  <Input
                    type="datetime-local"
                    // Use optional chaining just in case
                    value={tempDateFilters.updatedAt?.to || ""}
                    onChange={(e) => updateTempDateFilter("updatedAt", "to", e.target.value)}
                    className="text-sm w-full"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                className="flex-1 bg-transparent"
                onClick={() => {
                  console.log("Date Filter Modal: Clearing dates in temp state and then applying");
                  const clearedTempDates = {
                    ...tempDateFilters,
                    createdAt: { from: "", to: "" },
                    updatedAt: { from: "", to: "" },
                  };
                  setTempDateFilters(clearedTempDates); // Update temporary state
                  // Apply this clear to the main filters and URL via setFilters
                  setFilters((prev) => ({
                    ...prev,
                    createdAt: { from: "", to: "" },
                    updatedAt: { from: "", to: "" },
                  }));
                }}
              >
                Очистити дати
              </Button>
              <Button variant="outline" className="flex-1 bg-transparent" onClick={handleDateFilterCancel}>
                Скасувати
              </Button>
              <Button className="flex-1" onClick={handleDateFilterApply}>
                Застосувати
              </Button>
            </div>

            {/* Active Date Filters Preview */}
            {(tempDateFilters.createdAt?.from || // Use optional chaining here too
              tempDateFilters.createdAt?.to ||
              tempDateFilters.updatedAt?.from ||
              tempDateFilters.updatedAt?.to) && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800 mb-2">Попередній перегляд фільтрів:</p>
                {(tempDateFilters.createdAt?.from || tempDateFilters.createdAt?.to) && (
                  <p className="text-xs text-green-700">
                    Створено:{" "}
                    {tempDateFilters.createdAt.from
                      ? new Date(tempDateFilters.createdAt.from).toLocaleString("uk-UA")
                      : "..."}{" "}
                    -{" "}
                    {tempDateFilters.createdAt.to
                      ? new Date(tempDateFilters.createdAt.to).toLocaleString("uk-UA")
                      : "..."}
                  </p>
                )}
                {(tempDateFilters.updatedAt?.from || tempDateFilters.updatedAt?.to) && (
                  <p className="text-xs text-green-700">
                    Оновлено:{" "}
                    {tempDateFilters.updatedAt.from
                      ? new Date(tempDateFilters.updatedAt.from).toLocaleString("uk-UA")
                      : "..."}{" "}
                    -{" "}
                    {tempDateFilters.updatedAt.to
                      ? new Date(tempDateFilters.updatedAt.to).toLocaleString("uk-UA")
                      : "..."}
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductsTable;