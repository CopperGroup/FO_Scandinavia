import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SortModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sortConfig: { field: string; direction: "asc" | "desc" } | null;
  sortFields: { value: string; label: string }[];
  onSort: (field: string, direction: "asc" | "desc") => void;
  onClearSort: () => void;
}

const SortModal: React.FC<SortModalProps> = ({
  isOpen,
  onOpenChange,
  sortConfig,
  sortFields,
  onSort,
  onClearSort,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full mx-4">
        <DialogHeader>
          <DialogTitle>Сортування товарів</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Оберіть поле для сортування:</p>
            {sortFields.map((field) => (
              <div key={field.value} className="space-y-2">
                <p className="text-sm font-medium text-slate-700">{field.label}</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs bg-transparent"
                    onClick={() => onSort(field.value, "asc")}
                  >
                    ↑ За зростанням
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs bg-transparent"
                    onClick={() => onSort(field.value, "desc")}
                  >
                    ↓ За спаданням
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4 border-t border-slate-200">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={onClearSort}>
              Скинути сортування
            </Button>
            <Button variant="outline" className="flex-1 bg-transparent" onClick={() => onOpenChange(false)}>
              Закрити
            </Button>
          </div>

          {sortConfig && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Активне сортування:</strong> {sortFields.find((f) => f.value === sortConfig.field)?.label}
                {sortConfig.direction === "asc" ? " (за зростанням)" : " (за спаданням)"}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SortModal;