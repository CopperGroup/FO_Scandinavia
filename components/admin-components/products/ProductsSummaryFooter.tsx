import React from 'react';
import { Package } from "lucide-react";

interface ProductsSummaryFooterProps {
  displayedProductsCount: number;
  totalFilteredProducts: number;
  overallTotalProducts: number;
  currentPage: number;
  itemsPerPage: number;
}

const ProductsSummaryFooter: React.FC<ProductsSummaryFooterProps> = ({
  displayedProductsCount,
  totalFilteredProducts,
  overallTotalProducts,
  currentPage,
  itemsPerPage,
}) => {
  const startRange = totalFilteredProducts > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endRange = Math.min(currentPage * itemsPerPage, totalFilteredProducts);

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs sm:text-small-medium">
      <p className="text-slate-500">
        Показано {startRange}-
        {endRange} з {totalFilteredProducts}{" "}
        товарів
      </p>
      <div className="flex items-center gap-2 text-slate-500">
        <Package className="h-3 w-3 sm:h-4 sm:w-4" />
        <span>Всього товарів: {overallTotalProducts}</span>
      </div>
    </div>
  );
};

export default ProductsSummaryFooter;