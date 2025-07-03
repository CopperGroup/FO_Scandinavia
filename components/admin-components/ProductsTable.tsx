"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card"; // Only need Card for the main wrapper now
// Re-import shared types/actions/constants
import { fetchAllCategories } from "@/lib/actions/categories.actions";
import { fetchProductsByBatches } from "@/lib/actions/product.actions";
import { Store } from "@/constants/store";
import { CategoryType } from "@/lib/types/types";
import ProductsHeader from "./products/ProductsHeader";
import ProductStatsCards from "./products/ProductStatsCards";
import ProductActionsBar from "./products/ProductActionsBar";
import AdvancedFiltersSection from "./products/AdvancedFiltersSection";
import { Button } from "../ui/button";
import ProductsDisplay from "./products/ProductsDisplay";
import ProductsPagination from "./products/ProductsPagination";
import ProductsSummaryFooter from "./products/ProductsSummaryFooter";
import ExportProgressDialog from "./products/ExportProgressDialog";
import BulkEditProductsModal from "./modals/BulkEditProductsModal/BulkEditProductsModal";
import DateFilterModal from "./products/DateFilterModal";
import { generateFullCatalogXmlOnClient } from "@/lib/xml-parser/export";
import SortModal from "./products/SortModal";

// IMPORTANT: Define or import Product type here if not already in a shared file
interface Product {
  _id: string;
  id: string;
  vendor: string;
  name: string;
  isAvailable: boolean;
  price: number;
  priceToShow: number;
  category: string; // Assuming category is a string ID or name
  articleNumber: string;
  createdAt?: string;
  updatedAt?: string;
  images: string[]; // Ensure this is present
}

// Define filter and initial filter types here
interface PriceFilter { min: string; max: string; }
interface DateFilter { from: string; to: string; }
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
  viewMode?: "table" | "grid";
}

const convertToUTC = (localDateTimeString: string): Date => {
  if (!localDateTimeString) return new Date(0);
  const localDate = new Date(localDateTimeString);
  return new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000);
};

const convertToLocalDateTime = (utcDateString: string): string => {
  if (!utcDateString) return "";
  const utcDate = new Date(utcDateString);
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
  const products: Product[] = useMemo(() => JSON.parse(stringifiedProducts), [stringifiedProducts]);
  const router = useRouter();
  const searchParams = useSearchParams();

  // State management for main view
  const [pageNumber, setPageNumber] = useState(initialFilters.page);
  const [viewMode, setViewMode] = useState<"table" | "grid">(initialFilters.viewMode || "table");
  const [inputValue, setInputValue] = useState(initialFilters.search);
  const [searchField, setSearchField] = useState(initialFilters.searchField);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isMobileView, setIsMobileView] = useState(false); // For responsive rendering of cards/table

  // Modals and their related states
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState("");
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isDateFilterModalOpen, setIsDateFilterModalOpen] = useState(false);


  // Filter states
  const [filters, setFilters] = useState<FilterState>({
    price: { min: initialFilters.priceMin || "", max: initialFilters.priceMax || "" },
    createdAt: { from: initialFilters.createdFrom || "", to: initialFilters.createdTo || "" },
    updatedAt: { from: initialFilters.updatedFrom || "", to: initialFilters.updatedTo || "" },
  });

  // Temporary date filter state for modal
  const [tempDateFilters, setTempDateFilters] = useState<FilterState>(filters);

  // Sort state
  const [sortConfig, setSortConfig] = useState<{
    field: string;
    direction: "asc" | "desc";
  } | null>(initialFilters.sortField ? { field: initialFilters.sortField, direction: initialFilters.sortDirection } : null);

  // Common formatter for prices
  const formatter = useMemo(() => new Intl.NumberFormat("uk-UA", { style: "currency", currency: "UAH", currencyDisplay: "code" }), []);


  // --- Callbacks for URL and State Synchronization ---

  const updateSearchParams = useCallback(
    (updates: Partial<InitialFilters>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, value.toString());
        } else {
          params.delete(key);
        }
      });
      const newUrl = `?${params.toString()}`;
      router.push(newUrl, { scroll: false });
    },
    [router, searchParams]
  );

  // Effect to apply filters/search and update URL, resetting page to 1
  useEffect(() => {
    // Only update URL if there are actual filter/search changes
    const currentParams = Object.fromEntries(searchParams.entries());
    const newFilterParams: Partial<InitialFilters> = {
        search: inputValue,
        searchField: searchField,
        priceMin: filters.price.min,
        priceMax: filters.price.max,
        createdFrom: filters.createdAt.from,
        createdTo: filters.createdAt.to,
        updatedFrom: filters.updatedAt.from,
        updatedTo: filters.updatedAt.to,
    };

    const hasFilterChanged = Object.entries(newFilterParams).some(([key, value]) => {
        // Compare new filter value with current URL param value
        return String(value || '') !== String(currentParams[key] || '');
    });

    if (hasFilterChanged) {
        updateSearchParams({
            ...newFilterParams,
            page: 1 // Always reset to page 1 when filters or search change
        });
    }
  }, [inputValue, searchField, filters, updateSearchParams, searchParams]); // Add searchParams to dependencies


  // Effect to sync page number and view mode from URL
  useEffect(() => {
    const urlPage = Number.parseInt(searchParams.get("page") || "1");
    // Only update state if the URL param is different from current state
    if (urlPage !== pageNumber) {
      setPageNumber(urlPage);
    }

    const urlViewMode = (searchParams.get("viewMode") as "table" | "grid") || "table";
    if (urlViewMode !== viewMode) {
      setViewMode(urlViewMode);
    }
  }, [searchParams]); // Depend only on searchParams


  // --- Derived States (useMemo) ---

  const availableProducts = useMemo(() => products.filter((p) => p.isAvailable).length, [products]);
  const discountedProducts = useMemo(() => products.filter((p) => p.priceToShow < p.price).length, [products]);

  const searchFields = useMemo(() => ([
    { value: "name", label: "Назва" },
    { value: "id", label: "ID" },
    { value: "vendor", label: "Постачальник" },
    { value: "category", label: "Категорія" },
    { value: "isAvailable", label: "Доступність" },
    { value: "articleNumber", label: "Артикул" },
  ]), []);

  const sortFields = useMemo(() => ([
    { value: "name", label: "Назва" },
    { value: "price", label: "Ціна без знижки" },
    { value: "priceToShow", label: "Ціна зі знижкою" },
    { value: "createdAt", label: "Дата створення" },
    { value: "updatedAt", label: "Дата оновлення" },
    { value: "isAvailable", label: "Доступність" },
  ]), []);

  const sortedAndFilteredProducts = useMemo(() => {
    let filtered = products.filter((product) => {
      const searchValue = product[searchField as keyof Product];
      let matchesSearch = true;

      if (inputValue) {
        if (typeof searchValue === "boolean") {
          matchesSearch = inputValue.toLowerCase() === searchValue.toString();
        } else {
          matchesSearch = searchValue?.toString().toLowerCase().includes(inputValue.toLowerCase()) || false;
        }
      }

      let matchesPriceRange = true;
      if (filters.price.min || filters.price.max) {
        const minPrice = filters.price.min ? Number.parseFloat(filters.price.min) : 0;
        const maxPrice = filters.price.max ? Number.parseFloat(filters.price.max) : Number.POSITIVE_INFINITY;
        matchesPriceRange = product.price >= minPrice && product.price <= maxPrice;
      }

      let matchesCreatedAtRange = true;
      if (product.createdAt && (filters.createdAt.from || filters.createdAt.to)) {
        const productDate = new Date(product.createdAt);
        const fromDate = filters.createdAt.from ? convertToUTC(filters.createdAt.from) : new Date(0);
        const toDate = filters.createdAt.to ? convertToUTC(filters.createdAt.to) : new Date();
        matchesCreatedAtRange = productDate >= fromDate && productDate <= toDate;
      }

      let matchesUpdatedAtRange = true;
      if (product.updatedAt && (filters.updatedAt.from || filters.updatedAt.to)) {
        const productDate = new Date(product.updatedAt);
        const fromDate = filters.updatedAt.from ? convertToUTC(filters.updatedAt.from) : new Date(0);
        const toDate = filters.updatedAt.to ? convertToUTC(filters.updatedAt.to) : new Date();
        matchesUpdatedAtRange = productDate >= fromDate && productDate <= toDate;
      }

      return matchesSearch && matchesPriceRange && matchesCreatedAtRange && matchesUpdatedAtRange;
    });

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
    const start = (pageNumber - 1) * ITEMS_PER_PAGE;
    return sortedAndFilteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedAndFilteredProducts, pageNumber]);

  const totalPages = Math.ceil(sortedAndFilteredProducts.length / ITEMS_PER_PAGE);

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


  // --- Event Handlers ---

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map((product) => product._id)));
    }
  };

  const updateFilter = (filterType: keyof FilterState, field: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: { ...prev[filterType], [field]: value },
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      price: { min: "", max: "" },
      createdAt: { from: "", to: "" },
      updatedAt: { from: "", to: "" },
    });
    setInputValue("");
    // The useEffect that listens to filter changes will reset the page to 1
  };

  const handleSort = (field: string, direction: "asc" | "desc") => {
    setSortConfig({ field, direction });
    setIsSortModalOpen(false);
    updateSearchParams({ sortField: field, sortDirection: direction, page: 1 }); // Explicitly reset page to 1
  };

  const clearSort = () => {
    setSortConfig(null);
    setIsSortModalOpen(false);
    updateSearchParams({ sortField: "", sortDirection: "asc", page: 1 }); // Explicitly reset page to 1
  };

  const handlePageChange = (newPage: number) => {
    // Only update the page URL parameter
    updateSearchParams({ page: newPage });
  };

  const handleViewModeChange = (mode: "table" | "grid") => {
    setViewMode(mode);
    updateSearchParams({ viewMode: mode, page: 1 }); // Reset page to 1 when changing view mode
  };

  const handleDateFilterApply = () => {
    setFilters(tempDateFilters);
    setIsDateFilterModalOpen(false);
    // The useEffect that listens to filter changes will reset the page to 1
  };

  const handleDateFilterCancel = () => {
    setTempDateFilters(filters); // Revert to currently applied filters
    setIsDateFilterModalOpen(false);
  };

  const handleClearDateFilters = () => {
    const clearedDates = {
      createdAt: { from: "", to: "" },
      updatedAt: { from: "", to: "" },
    };
    setTempDateFilters(prev => ({ ...prev, ...clearedDates })); // Clear in modal temp state
    setFilters(prev => ({ ...prev, ...clearedDates })); // Apply clear to main filters immediately
    // The useEffect that listens to filter changes will reset the page to 1
  };

  const updateTempDateFilter = (filterType: "createdAt" | "updatedAt", field: "from" | "to", value: string) => {
    setTempDateFilters((prev) => ({
      ...prev,
      [filterType]: { ...prev[filterType], [field]: value },
    }));
  };

  const handleExportXml = async () => {
    try {
      setIsExporting(true);
      setExportProgress(10);
      setExportStage("Підготовка даних...");

      if (!products || !Array.isArray(products)) {
        throw new Error("Дані про товари не знайдено або вони некоректні.");
      }

      if (products.length === 0) {
        setExportStage("Немає товарів для експорту.");
        setTimeout(() => { setIsExporting(false); setExportProgress(0); setExportStage(""); }, 2000);
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

      setExportProgress(30); // Reset or keep 30, it's fine.
      setExportStage("Отримання всіх товарів з сервера...");
      const allProducts: any[] = [];
      const batchSize = 500;
      let skip = 0;
      let batch: any[] = [];
      do {
        const raw = await fetchProductsByBatches(batchSize, skip);
        batch = JSON.parse(raw);
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
      setTimeout(() => { setIsExporting(false); setExportProgress(0); setExportStage(""); }, 1000);
    } catch (error: any) {
      console.error("handleExportXml: Export error", error);
      setExportStage(`Помилка: ${error.message}`);
      setTimeout(() => { setIsExporting(false); setExportProgress(0); setExportStage(""); }, 3000);
    }
  };

  // Effect for mobile view detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 640);
    };
    handleResize(); // Set initial state
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <ProductsHeader onExportXml={handleExportXml} />
      <ProductStatsCards
        totalProducts={products.length}
        availableProducts={availableProducts}
        discountedProducts={discountedProducts}
      />

      <Card className="border-slate-200 shadow-sm">
        <ProductActionsBar
          inputValue={inputValue}
          searchField={searchField}
          searchFields={searchFields}
          sortConfig={sortConfig}
          sortFields={sortFields}
          selectedProductsCount={selectedProducts.size}
          allProductsCount={products.length} // Pass allProductsCount for select all toggle
          onSearchChange={setInputValue}
          onSearchFieldChange={setSearchField}
          onBulkEditClick={() => setIsBulkEditModalOpen(true)}
          onDeleteSelected={() => setSelectedProducts(new Set())} // Clear selections after delete
          onSortClick={() => setIsSortModalOpen(true)}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />

        <div className="pt-4 sm:pt-6 px-4 sm:px-6">
          <div className="space-y-3 sm:space-y-4">
            <AdvancedFiltersSection
              filters={filters}
              inputValue={inputValue}
              isAdvancedFiltersOpen={isAdvancedFiltersOpen}
              onToggleAdvancedFilters={setIsAdvancedFiltersOpen}
              onUpdateFilter={updateFilter}
              onClearAllFilters={clearAllFilters}
              onOpenDateFilterModal={() => setIsDateFilterModalOpen(true)}
            />

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

            <ProductsDisplay
              products={paginatedProducts}
              totalProductsCount={sortedAndFilteredProducts.length}
              selectedProducts={selectedProducts}
              onToggleSelection={toggleProductSelection}
              onToggleSelectAll={toggleSelectAll}
              formatter={formatter}
              viewMode={viewMode}
              isMobileView={isMobileView}
            />
          </div>
        </div>
      </Card>

      <ProductsPagination
        currentPage={pageNumber}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        isMobileView={isMobileView}
      />
      <ProductsSummaryFooter
        displayedProductsCount={paginatedProducts.length}
        totalFilteredProducts={sortedAndFilteredProducts.length}
        overallTotalProducts={products.length}
        currentPage={pageNumber}
        itemsPerPage={ITEMS_PER_PAGE}
      />

      <ExportProgressDialog
        isOpen={isExporting}
        onOpenChange={setIsExporting}
        progress={exportProgress}
        stage={exportStage}
      />

      <SortModal
        isOpen={isSortModalOpen}
        onOpenChange={setIsSortModalOpen}
        sortConfig={sortConfig}
        sortFields={sortFields}
        onSort={handleSort}
        onClearSort={clearSort}
      />

      <BulkEditProductsModal
        isOpen={isBulkEditModalOpen}
        onOpenChange={setIsBulkEditModalOpen}
        selectedProductIds={Array.from(selectedProducts)}
        onEditComplete={() => {
          setSelectedProducts(new Set());
          router.refresh();
        }}
      />

      <DateFilterModal
        isOpen={isDateFilterModalOpen}
        onOpenChange={setIsDateFilterModalOpen}
        tempDateFilters={tempDateFilters}
        onUpdateTempDateFilter={updateTempDateFilter}
        onApply={handleDateFilterApply}
        onCancel={handleDateFilterCancel}
        onClearDates={handleClearDateFilters}
      />
    </div>
  );
};

export default ProductsTable;