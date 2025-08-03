import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Edit, ArrowUpDown, Table as TableIcon, Grid } from "lucide-react";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import DeleteProductsButton from '@/components/interface/DeleteProductsButton';

interface Product { // Re-define Product if needed, or import from main type file
    _id: string;
    name: string;
    images: string[];
    // ... other properties you need for filtering/sorting display
}

interface ProductActionsBarProps {
  inputValue: string;
  searchField: string;
  searchFields: { value: string; label: string }[];
  sortConfig: { field: string; direction: "asc" | "desc" } | null;
  sortFields: { value: string; label: string }[];
  selectedProductsIds: string[];
  allProductsCount: number;
  onSearchChange: (value: string) => void;
  onSearchFieldChange: (value: string) => void;
  onBulkEditClick: () => void;
  onDeleteSelected: (ids: string[]) => void;
  onSortClick: () => void;
  viewMode: "table" | "grid";
  onViewModeChange: (mode: "table" | "grid") => void;
}

const ProductActionsBar: React.FC<ProductActionsBarProps> = ({
  inputValue,
  searchField,
  searchFields,
  sortConfig,
  sortFields,
  selectedProductsIds,
  allProductsCount,
  onSearchChange,
  onSearchFieldChange,
  onBulkEditClick,
  onDeleteSelected,
  onSortClick,
  viewMode,
  onViewModeChange,
}) => {
  return (
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
        <div className="flex gap-2 flex-wrap"> {/* Added flex-wrap for better mobile layout */}
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            className={`border-slate-200 hover:bg-slate-50 text-small-medium ${viewMode === "table" ? "text-white" : "text-slate-700"}`}
            onClick={() => onViewModeChange("table")}
            aria-label="Переглянути таблицею"
          >
            <TableIcon className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            className={`border-slate-200 hover:bg-slate-50 text-small-medium ${viewMode === "grid" ? "text-white" : "text-slate-700"}`}
            onClick={() => onViewModeChange("grid")}
            aria-label="Переглянути сіткою"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="border-slate-200 text-slate-700 hover:bg-slate-50 text-small-medium self-start sm:self-center bg-transparent min-w-0 max-w-[200px]"
            onClick={onSortClick}
          >
            <ArrowUpDown className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {sortConfig
                ? `${sortFields.find((f) => f.value === sortConfig.field)?.label} ${sortConfig.direction === "asc" ? "↑" : "↓"}`
                : "Сортувати"}
            </span>
          </Button>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center pt-4">
        <div className="flex-1 w-full sm:w-auto relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            className="w-full pl-10 text-small-regular sm:text-base-regular border-slate-200 focus:border-slate-300 focus:ring-slate-200"
            placeholder={`Пошук за ${searchFields.find((f) => f.value === searchField)?.label.toLowerCase() || "назвою"}...`}
            onChange={(e) => onSearchChange(e.target.value)}
            value={inputValue}
          />
        </div>

        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 sm:gap-4">
          <Select onValueChange={onSearchFieldChange} value={searchField}>
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
            onClick={onBulkEditClick}
            disabled={selectedProductsIds.length === 0}
          >
            <Edit className="mr-2 h-4 w-4" />
            Редагувати вибрані ({selectedProductsIds.length})
          </Button>

          <DeleteProductsButton
            selectedIds={selectedProductsIds} // Placeholder for selected IDs
            onDeleteComplete={() => onDeleteSelected([])} // Placeholder for onDeleteComplete
          />
        </div>
      </div>
    </CardHeader>
  );
};

export default ProductActionsBar;