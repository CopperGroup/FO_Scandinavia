import React from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import ProductTableRow from './ProductTableRow';
import ProductGridCard from './ProductGridCard';
import { Button } from '@/components/ui/button';

interface Product {
  _id: string;
  id: string;
  vendor: string;
  name: string;
  isAvailable: boolean;
  price: number;
  priceToShow: number;
  category: string; // Add if used in display
  articleNumber: string;
  createdAt?: string;
  updatedAt?: string;
  images: string[];
}

interface ProductsDisplayProps {
  products: Product[];
  totalProductsCount: number;
  selectedProducts: Set<string>;
  onToggleSelection: (productId: string) => void;
  onToggleSelectAll: () => void;
  formatter: Intl.NumberFormat;
  viewMode: "table" | "grid";
  isMobileView: boolean; // Keep for mobile card rendering logic
}

const ProductsDisplay: React.FC<ProductsDisplayProps> = ({
  products,
  totalProductsCount,
  selectedProducts,
  onToggleSelection,
  onToggleSelectAll,
  formatter,
  viewMode,
  isMobileView,
}) => {
  const isGridView = isMobileView || viewMode === "grid"; // Grid view for mobile or explicit grid selection

  if (products.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-base-medium text-slate-500">Товари не знайдено</p>
      </div>
    );
  }

  return (
    <>
      {isGridView ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div className="col-span-full flex justify-between items-center mb-2">
            <p className="text-small-medium text-slate-500">
              {totalProductsCount} товарів знайдено
            </p>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onToggleSelectAll}>
              {selectedProducts.size === totalProductsCount && totalProductsCount > 0 ? "Зняти все" : "Вибрати все"}
            </Button>
          </div>
          {products.map((product) => (
            <ProductGridCard
              key={product._id}
              product={product}
              isSelected={selectedProducts.has(product._id)}
              onToggleSelection={onToggleSelection}
              formatter={formatter}
            />
          ))}
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-md border border-slate-200">
          <Table className="min-w-[1200px]">
            <TableHeader className="bg-slate-50">
              <TableRow className="text-small-semibold text-slate-700 hover:bg-slate-50">
                <TableHead className="w-[50px] text-center">
                  <Checkbox
                    checked={selectedProducts.size === totalProductsCount && totalProductsCount > 0}
                    onCheckedChange={onToggleSelectAll}
                    className="border-slate-300"
                    disabled={totalProductsCount === 0}
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
              {products.map((product) => (
                <ProductTableRow
                  key={product._id}
                  product={product}
                  isSelected={selectedProducts.has(product._id)}
                  onToggleSelection={onToggleSelection}
                  formatter={formatter}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
};

export default ProductsDisplay;