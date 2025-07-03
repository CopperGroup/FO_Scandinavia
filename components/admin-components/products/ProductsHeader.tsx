import React from 'react';
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ProductsHeaderProps {
  onExportXml: () => Promise<void>;
}

const ProductsHeader: React.FC<ProductsHeaderProps> = ({ onExportXml }) => (
  <div className="border-b border-slate-200 pb-4 sm:pb-8 pt-4 sm:pt-6 px-4 sm:px-6">
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 sm:gap-4">
        <div>
          <h1 className="text-heading3-bold sm:text-heading2-bold">Ваш склад</h1>
          <p className="text-small-regular sm:text-base-regular text-slate-600 mt-1">
            Керуйте каталогом товарів, цінами та наявністю
          </p>
        </div>
        <Button onClick={onExportXml} className="bg-green-600 hover:bg-green-700 text-white">
          <Download className="mr-2 h-4 w-4" />
          Експорт XML
        </Button>
      </div>
    </div>
  </div>
);

export default ProductsHeader;