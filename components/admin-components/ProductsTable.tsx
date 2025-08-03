// app/(root)/products/ProductsTable.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
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
  images: string[];
}

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

  const [pageNumber, setPageNumber] = useState(initialFilters.page);
  const [viewMode, setViewMode] = useState<"table" | "grid">(initialFilters.viewMode || "table");
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
  const [isDateFilterModalOpen, setIsDateFilterModalOpen] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    price: { min: initialFilters.priceMin || "", max: initialFilters.priceMax || "" },
    createdAt: { from: initialFilters.createdFrom || "", to: initialFilters.createdTo || "" },
    updatedAt: { from: initialFilters.updatedFrom || "", to: initialFilters.updatedTo || "" },
  });

  const [tempDateFilters, setTempDateFilters] = useState<FilterState>(filters);

  const [sortConfig, setSortConfig] = useState<{
    field: string;
    direction: "asc" | "desc";
  } | null>(initialFilters.sortField ? { field: initialFilters.sortField, direction: initialFilters.sortDirection } : null);

  const formatter = useMemo(() => new Intl.NumberFormat("uk-UA", { style: "currency", currency: "UAH", currencyDisplay: "code" }), []);


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

  useEffect(() => {
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
      return String(value || '') !== String(currentParams[key] || '');
    });

    if (hasFilterChanged) {
      updateSearchParams({
        ...newFilterParams,
        page: 1
      });
    }
  }, [inputValue, searchField, filters, updateSearchParams, searchParams]);


  useEffect(() => {
    const urlPage = Number.parseInt(searchParams.get("page") || "1");
    if (urlPage !== pageNumber) {
      setPageNumber(urlPage);
    }

    const urlViewMode = (searchParams.get("viewMode") as "table" | "grid") || "table";
    if (urlViewMode !== viewMode) {
      setViewMode(urlViewMode);
    }
  }, [searchParams]);

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
  };

  const handleSort = (field: string, direction: "asc" | "desc") => {
    setSortConfig({ field, direction });
    setIsSortModalOpen(false);
    updateSearchParams({ sortField: field, sortDirection: direction, page: 1 });
  };

  const clearSort = () => {
    setSortConfig(null);
    setIsSortModalOpen(false);
    updateSearchParams({ sortField: "", sortDirection: "asc", page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    updateSearchParams({ page: newPage });
  };

  const handleViewModeChange = (mode: "table" | "grid") => {
    setViewMode(mode);
    updateSearchParams({ viewMode: mode, page: 1 });
  };

  const handleDateFilterApply = () => {
    setFilters(tempDateFilters);
    setIsDateFilterModalOpen(false);
  };

  const handleDateFilterCancel = () => {
    setTempDateFilters(filters);
    setIsDateFilterModalOpen(false);
  };

  const handleClearDateFilters = () => {
    const clearedDates = {
      createdAt: { from: "", to: "" },
      updatedAt: { from: "", to: "" },
    };
    setTempDateFilters(prev => ({ ...prev, ...clearedDates }));
    setFilters(prev => ({ ...prev, ...clearedDates }));
  };

  const updateTempDateFilter = (filterType: "createdAt" | "updatedAt", field: "from" | "to", value: string) => {
    setTempDateFilters((prev) => ({
      ...prev,
      [filterType]: { ...prev[filterType], [field]: value },
    }));
  };

  // Modified handleExportXml to accept a boolean argument
  const handleExportXml = async (exportSelected: boolean) => {
    try {
      setIsExporting(true);
      setExportProgress(10);
      setExportStage("Підготовка даних...");

      if (!products || !Array.isArray(products)) {
        throw new Error("Дані про товари не знайдено або вони некоректні.");
      }

      let productsToExport: Product[] = [];
      if (exportSelected && selectedProducts.size > 0) {
        // Filter products based on selectedProductIds
        productsToExport = products.filter(product => selectedProducts.has(product._id));
      } else {
        // Export all products if no selection or exportSelected is false
        // Fetch all products from the server to ensure we have the complete, unfiltered list
        setExportProgress(30);
        setExportStage("Отримання всіх товарів з сервера...");
        const allFetchedProducts: Product[] = [];
        const batchSize = 500;
        let skip = 0;
        let batch: Product[] = [];
        do {
          const raw = await fetchProductsByBatches(batchSize, skip);
          batch = JSON.parse(raw);
          allFetchedProducts.push(...batch);
          skip += batchSize;
        } while (batch.length === batchSize);
        productsToExport = allFetchedProducts;
      }

      if (productsToExport.length === 0) {
        setExportStage("Немає товарів для експорту.");
        setTimeout(() => { setIsExporting(false); setExportProgress(0); setExportStage(""); }, 2000);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
      setExportProgress(30); // Adjust based on whether products were fetched or already available
      setExportStage("Отримання категорій...");
      const categoriesJsonString = await fetchAllCategories("json");
      const rawCategories: CategoryType[] = JSON.parse(categoriesJsonString);
      if (!rawCategories || !Array.isArray(rawCategories)) {
        throw new Error("Не вдалося завантажити або обробити категорії.");
      }

      setExportProgress(60);
      setExportStage("Генерація XML файлу на вашому пристрої...");
      const xmlString = generateFullCatalogXmlOnClient(rawCategories, productsToExport); // Use productsToExport
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

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <ProductsHeader
        onExportXml={handleExportXml}
        selectedProductsCount={selectedProducts.size} // Pass the count here
      />
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
          selectedProductsIds={Array.from(selectedProducts)}
          allProductsCount={products.length}
          onSearchChange={setInputValue}
          onSearchFieldChange={setSearchField}
          onBulkEditClick={() => setIsBulkEditModalOpen(true)}
          onDeleteSelected={() => setSelectedProducts(new Set())}
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