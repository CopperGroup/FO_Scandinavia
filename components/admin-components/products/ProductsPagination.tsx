import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProductsPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isMobileView: boolean;
}

const ProductsPagination: React.FC<ProductsPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  isMobileView,
}) => {
  return (
    <div className="flex justify-between items-center mt-4">
      <Button
        onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        disabled={currentPage === 1}
        variant="outline"
        size={isMobileView ? "sm" : "default"}
        className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-800"
      >
        <ChevronLeft className="mr-1 sm:mr-2 h-4 w-4" />
        <span className="text-xs sm:text-small-medium">{isMobileView ? "Назад" : "Попередня"}</span>
      </Button>

      <p className="text-xs sm:text-small-medium text-slate-600">
        {currentPage} / {totalPages || 1}
      </p>

      <Button
        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
        disabled={currentPage === totalPages || totalPages === 0}
        variant="outline"
        size={isMobileView ? "sm" : "default"}
        className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-800"
      >
        <span className="text-xs sm:text-small-medium">{isMobileView ? "Далі" : "Наступна"}</span>
        <ChevronRight className="ml-1 sm:ml-2 h-4 w-4" />
      </Button>
    </div>
  );
};

export default ProductsPagination;