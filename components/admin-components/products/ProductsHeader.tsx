// components/ProductsHeader.tsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ProductsHeaderProps {
  onExportXml: (exportSelected: boolean) => Promise<void>; // Modified to accept a boolean
  selectedProductsCount: number; // New prop for the count
}

const ProductsHeader: React.FC<ProductsHeaderProps> = ({ onExportXml, selectedProductsCount }) => {
  const exportButtonText = selectedProductsCount > 0
    ? `Експорт XML (${selectedProductsCount})`
    : "Експорт XML";

  // Determine if we should export selected or all based on the count
  const handleExportClick = () => {
    onExportXml(selectedProductsCount > 0);
  };

  return (
    <div className="border-b border-slate-200 pb-4 sm:pb-8 pt-4 sm:pt-6 px-4 sm:px-6">
      <div className="w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 sm:gap-4">
          <div>
            <h1 className="text-heading3-bold sm:text-heading2-bold">Ваш склад</h1>
            <p className="text-small-regular sm:text-base-regular text-slate-600 mt-1">
              Керуйте каталогом товарів, цінами та наявністю
            </p>
          </div>
          <Button onClick={handleExportClick} className="bg-green-600 hover:bg-green-700 text-white">
            <Download className="mr-2 h-4 w-4" />
            {exportButtonText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductsHeader;