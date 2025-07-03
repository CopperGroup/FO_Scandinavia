import React from 'react';
import Image from 'next/image';
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";

interface Product {
  _id: string;
  id: string;
  vendor: string;
  name: string;
  isAvailable: boolean;
  price: number;
  priceToShow: number;
  articleNumber: string;
  createdAt?: string;
  updatedAt?: string;
  images: string[];
}

interface ProductGridCardProps {
  product: Product;
  isSelected: boolean;
  onToggleSelection: (productId: string) => void;
  formatter: Intl.NumberFormat;
}

const ProductGridCard: React.FC<ProductGridCardProps> = ({ product, isSelected, onToggleSelection, formatter }) => {
  const router = useRouter();

  return (
    <Card key={product._id} className="mb-3 border-slate-200 overflow-hidden">
      <CardContent className="p-3">
        {product.images && product.images.length > 0 && (
          <div className="relative w-full h-40 mb-3 overflow-hidden rounded-md bg-slate-100 flex items-center justify-center">
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              style={{ objectFit: "contain" }}
              className="p-2"
            />
          </div>
        )}
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base-semibold text-slate-800 truncate">{product.name}</h3>
            <p className="text-subtle-medium text-slate-500 truncate">ID: {product.id}</p>
          </div>
          <div className="flex items-center ml-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelection(product._id)}
              className="border-slate-300 mr-2"
              onClick={(e) => e.stopPropagation()}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/admin/createProduct/list/${product._id}`)}>
                  <Eye className="mr-2 h-4 w-4" />
                  <span>Переглянути</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/admin/createProduct/list/${product._id}`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Редагувати</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelection(product._id); // This will deselect for deletion or select if not selected
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Видалити</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <p className="text-tiny-medium text-slate-500">Постачальник</p>
            <p className="text-small-medium text-slate-700 truncate">{product.vendor}</p>
          </div>
          <div>
            <p className="text-tiny-medium text-slate-500">Артикул</p>
            <p className="text-small-medium text-slate-700 truncate">{product.articleNumber}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <p className="text-tiny-medium text-slate-500">Ціна без знижки</p>
            <p className="text-small-medium text-slate-700">{formatter.format(product.price)}</p>
          </div>
          <div>
            <p className="text-tiny-medium text-slate-500">Ціна зі знижкою</p>
            <p
              className={`text-small-medium ${product.priceToShow < product.price ? "text-red-600 font-medium" : "text-slate-700"}`}
            >
              {formatter.format(product.priceToShow)}
            </p>
          </div>
        </div>
        {(product.createdAt || product.updatedAt) && (
          <div className="grid grid-cols-2 gap-2 mb-2">
            {product.createdAt && (
              <div>
                <p className="text-tiny-medium text-slate-500">Створено</p>
                <p className="text-small-medium text-slate-700">
                  {new Date(product.createdAt).toLocaleDateString("uk-UA")}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(product.createdAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            )}
            {product.updatedAt && (
              <div>
                <p className="text-tiny-medium text-slate-500">Оновлено</p>
                <p className="text-small-medium text-slate-700">
                  {new Date(product.updatedAt).toLocaleDateString("uk-UA")}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(product.updatedAt).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            )}
          </div>
        )}
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              product.isAvailable ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {product.isAvailable ? "Доступний" : "Недоступний"}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 bg-transparent"
            onClick={() => router.push(`/admin/createProduct/list/${product._id}`)}
          >
            Деталі
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductGridCard;