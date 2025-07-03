import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

interface DateFilterState {
  createdAt: { from: string; to: string; };
  updatedAt: { from: string; to: string; };
}

interface DateFilterModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tempDateFilters: DateFilterState;
  onUpdateTempDateFilter: (filterType: "createdAt" | "updatedAt", field: "from" | "to", value: string) => void;
  onApply: () => void;
  onCancel: () => void;
  onClearDates: () => void;
}

const DateFilterModal: React.FC<DateFilterModalProps> = ({
  isOpen,
  onOpenChange,
  tempDateFilters,
  onUpdateTempDateFilter,
  onApply,
  onCancel,
  onClearDates,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg w-full mx-4">
        <DialogHeader>
          <DialogTitle>Фільтри за датою та часом</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-6">
          <div className="text-sm text-slate-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p>
              **Примітка:** Час автоматично конвертується з вашого місцевого часового поясу в UTC для
              порівняння з базою даних.
            </p>
          </div>

          {/* Created At Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Дата створення
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Від</Label>
                <Input
                  type="datetime-local"
                  value={tempDateFilters.createdAt?.from || ""}
                  onChange={(e) => onUpdateTempDateFilter("createdAt", "from", e.target.value)}
                  className="text-sm w-full"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500">До</Label>
                <Input
                  type="datetime-local"
                  value={tempDateFilters.createdAt?.to || ""}
                  onChange={(e) => onUpdateTempDateFilter("createdAt", "to", e.target.value)}
                  className="text-sm w-full"
                />
              </div>
            </div>
          </div>

          {/* Updated At Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Дата оновлення
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Від</Label>
                <Input
                  type="datetime-local"
                  value={tempDateFilters.updatedAt?.from || ""}
                  onChange={(e) => onUpdateTempDateFilter("updatedAt", "from", e.target.value)}
                  className="text-sm w-full"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500">До</Label>
                <Input
                  type="datetime-local"
                  value={tempDateFilters.updatedAt?.to || ""}
                  onChange={(e) => onUpdateTempDateFilter("updatedAt", "to", e.target.value)}
                  className="text-sm w-full"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-slate-200">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={onClearDates}
            >
              Очистити дати
            </Button>
            <Button variant="outline" className="flex-1 bg-transparent" onClick={onCancel}>
              Скасувати
            </Button>
            <Button className="flex-1" onClick={onApply}>
              Застосувати
            </Button>
          </div>

          {/* Active Date Filters Preview */}
          {(tempDateFilters.createdAt?.from ||
            tempDateFilters.createdAt?.to ||
            tempDateFilters.updatedAt?.from ||
            tempDateFilters.updatedAt?.to) && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-800 mb-2">Попередній перегляд фільтрів:</p>
              {(tempDateFilters.createdAt?.from || tempDateFilters.createdAt?.to) && (
                <p className="text-xs text-green-700">
                  Створено:{" "}
                  {tempDateFilters.createdAt.from
                    ? new Date(tempDateFilters.createdAt.from).toLocaleString("uk-UA")
                    : "..."}{" "}
                  -{" "}
                  {tempDateFilters.createdAt.to
                    ? new Date(tempDateFilters.createdAt.to).toLocaleString("uk-UA")
                    : "..."}
                </p>
              )}
              {(tempDateFilters.updatedAt?.from || tempDateFilters.updatedAt?.to) && (
                <p className="text-xs text-green-700">
                  Оновлено:{" "}
                  {tempDateFilters.updatedAt.from
                    ? new Date(tempDateFilters.updatedAt.from).toLocaleString("uk-UA")
                    : "..."}{" "}
                  -{" "}
                  {tempDateFilters.updatedAt.to
                    ? new Date(tempDateFilters.updatedAt.to).toLocaleString("uk-UA")
                    : "..."}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DateFilterModal;