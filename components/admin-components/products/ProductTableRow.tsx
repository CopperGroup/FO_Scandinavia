import React from 'react';
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

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
}

interface ProductTableRowProps {
  product: Product;
  isSelected: boolean;
  onToggleSelection: (productId: string) => void;
  formatter: Intl.NumberFormat;
}

const ProductTableRow: React.FC<ProductTableRowProps> = ({ product, isSelected, onToggleSelection, formatter }) => {
  const router = useRouter();

  return (
    <TableRow
      key={product._id}
      className="cursor-pointer hover:bg-slate-50 transition-all text-base-regular"
      onClick={() => router.push(`/admin/createProduct/list/${product._id}`)}
    >
      <TableCell className="font-medium" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelection(product._id)}
          className="border-slate-300"
        />
      </TableCell>
      <TableCell className="text-small-medium text-slate-600 truncate max-w-[80px]">
        {product.id}
      </TableCell>
      <TableCell className="text-small-medium text-slate-600 truncate max-w-[120px]">
        {product.vendor}
      </TableCell>
      <TableCell className="text-small-medium font-medium text-slate-800 truncate max-w-[250px]">
        {product.name}
      </TableCell>
      <TableCell>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            product.isAvailable ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {product.isAvailable ? "Так" : "Ні"}
        </span>
      </TableCell>
      <TableCell className="text-small-medium text-right text-slate-600 whitespace-nowrap">
        {formatter.format(product.price)}
      </TableCell>
      <TableCell
        className={`text-small-medium text-right whitespace-nowrap ${
          product.priceToShow < product.price ? "text-red-600 font-medium" : "text-slate-600"
        }`}
      >
        {formatter.format(product.priceToShow)}
      </TableCell>
      <TableCell className="text-small-medium text-slate-600 truncate max-w-[100px]">
        {product.articleNumber}
      </TableCell>
      <TableCell className="text-small-medium text-slate-600 whitespace-nowrap w-[150px]">
        {product.createdAt ? (
          <div className="text-xs">
            <div>{new Date(product.createdAt).toLocaleDateString("uk-UA")}</div>
            <div className="text-slate-500">
              {new Date(product.createdAt).toLocaleTimeString("uk-UA", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        ) : (
          "-"
        )}
      </TableCell>
      <TableCell className="text-small-medium text-slate-600 whitespace-nowrap w-[150px]">
        {product.updatedAt ? (
          <div className="text-xs">
            <div>{new Date(product.updatedAt).toLocaleDateString("uk-UA")}</div>
            <div className="text-slate-500">
              {new Date(product.updatedAt).toLocaleTimeString("uk-UA", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        ) : (
          "-"
        )}
      </TableCell>
    </TableRow>
  );
};

export default ProductTableRow;