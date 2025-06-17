"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit } from "lucide-react";
import PriceAdjustmentForm from "./PriceAdjustmentForm";

interface BulkEditProductsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProductIds: string[];
  onEditComplete: () => void;
}

const BulkEditProductsModal = ({
  isOpen,
  onOpenChange,
  selectedProductIds,
  onEditComplete,
}: BulkEditProductsModalProps): JSX.Element => {
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const handleOptionChange = (value: string): void => {
    setSelectedOption(value);
    if (value === "Змінити ціну") {
      setIsEditing(true);
    } else {
      setIsEditing(false);
    }
  };

  const handleModalClose = (): void => {
    onOpenChange(false);
    setSelectedOption("");
    setIsEditing(false);
    onEditComplete();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="sm:max-w-[480px] p-4 sm:p-6 rounded-lg shadow-lg">
        <DialogHeader className="border-b border-slate-100 pb-3 sm:pb-4 mb-3 sm:mb-4">
          <DialogTitle className="text-heading4-medium sm:text-heading3-bold text-slate-800">
            Редагувати вибрані товари ({selectedProductIds.length})
          </DialogTitle>
          <DialogDescription className="text-small-regular text-slate-500">
            Оберіть дію, яку бажаєте застосувати до вибраних товарів.
          </DialogDescription>
        </DialogHeader>

        {!isEditing ? (
          <div className="space-y-4">
            <p className="text-base-regular text-slate-700">Оберіть опцію:</p>
            <Select onValueChange={handleOptionChange} value={selectedOption}>
              <SelectTrigger className="w-full text-base-regular border-slate-200">
                <Edit className="mr-2 h-4 w-4 text-slate-500" />
                <SelectValue placeholder="Виберіть дію..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="Змінити ціну" className="text-base-regular">
                    Змінити ціну
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <PriceAdjustmentForm
            productIds={selectedProductIds}
            onAdjustmentComplete={handleModalClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkEditProductsModal;