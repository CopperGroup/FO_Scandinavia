import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Layers, Tag } from "lucide-react";

interface ProductStatsCardsProps {
  totalProducts: number;
  availableProducts: number;
  discountedProducts: number;
}

const ProductStatsCards: React.FC<ProductStatsCardsProps> = ({ totalProducts, availableProducts, discountedProducts }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-3 sm:p-6 flex items-center justify-between">
        <div>
          <p className="text-small-medium text-slate-500">Всього товарів</p>
          <h3 className="text-heading4-medium sm:text-heading3-bold text-slate-900 mt-1">{totalProducts}</h3>
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
            {totalProducts > 0 ? Math.round((availableProducts / totalProducts) * 100) : 0}% від загальної
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
            {totalProducts > 0 ? Math.round((discountedProducts / totalProducts) * 100) : 0}% від загальної
            кількості
          </p>
        </div>
        <div className="h-10 w-10 sm:h-12 sm:w-12 bg-red-50 rounded-full flex items-center justify-center">
          <Tag className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
        </div>
      </CardContent>
    </Card>
  </div>
);

export default ProductStatsCards;