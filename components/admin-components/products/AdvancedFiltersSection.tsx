import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, Filter, X, Calendar, DollarSign, FolderX } from "lucide-react";

interface FilterState {
  price: { min: string; max: string; };
  createdAt: { from: string; to: string; };
  updatedAt: { from: string; to: string; };
}

interface AdvancedFiltersSectionProps {
  filters: FilterState;
  inputValue: string; // Used for hasActiveFilters
  isAdvancedFiltersOpen: boolean;
  onToggleAdvancedFilters: (open: boolean) => void;
  onUpdateFilter: (filterType: keyof FilterState, field: string, value: string) => void;
  onClearAllFilters: () => void;
  onOpenDateFilterModal: () => void;
  emptyCategoryFilter: boolean;
  onEmptyCategoryFilterChange: (value: boolean) => void;
}

const AdvancedFiltersSection: React.FC<AdvancedFiltersSectionProps> = ({
  filters,
  inputValue,
  isAdvancedFiltersOpen,
  onToggleAdvancedFilters,
  onUpdateFilter,
  onClearAllFilters,
  onOpenDateFilterModal,
  emptyCategoryFilter,
  onEmptyCategoryFilterChange,
}) => {
  const hasActiveFilters = !!inputValue ||
    !!filters.price.min || !!filters.price.max ||
    !!filters.createdAt.from || !!filters.createdAt.to ||
    !!filters.updatedAt.from || !!filters.updatedAt.to ||
    emptyCategoryFilter;

  return (
    <Collapsible open={isAdvancedFiltersOpen} onOpenChange={onToggleAdvancedFilters}>
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
            onClick={onClearAllFilters}
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
                onChange={(e) => onUpdateFilter("price", "min", e.target.value)}
                className="text-sm"
              />
              <Input
                type="number"
                placeholder="До"
                value={filters.price.max}
                onChange={(e) => onUpdateFilter("price", "max", e.target.value)}
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
              onClick={onOpenDateFilterModal}
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

          {/* Empty Category Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <FolderX className="h-4 w-4" />
              Фільтр категорій
            </Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="emptyCategory"
                checked={emptyCategoryFilter}
                onCheckedChange={(checked) => onEmptyCategoryFilterChange(checked === true)}
              />
              <Label
                htmlFor="emptyCategory"
                className="text-sm font-normal cursor-pointer"
              >
                Показати товари без категорії
              </Label>
            </div>
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
            {emptyCategoryFilter && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                Без категорії
              </span>
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default AdvancedFiltersSection;