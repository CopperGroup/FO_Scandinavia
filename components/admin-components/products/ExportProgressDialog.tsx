// components/admin/modals/ExportProgressDialog.tsx
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Download, Loader2 } from "lucide-react";

interface ExportProgressDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  progress: number;
  stage: string;
}

const ExportProgressDialog: React.FC<ExportProgressDialogProps> = ({
  isOpen,
  onOpenChange,
  progress,
  stage,
}) => {
  const isError = stage.startsWith("Помилка:");
  const isComplete = progress === 100 && !isError;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Експорт каталогу XML</DialogTitle>
        </DialogHeader>
        <div className="py-6">
          <div className="mb-4">
            <Progress value={progress} className="w-full" />
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              {!isComplete && !isError ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-500" />
              ) : (
                <Download
                  className={`mr-2 h-4 w-4 ${isError ? "text-red-500" : "text-green-500"}`}
                />
              )}
              <span>{stage}</span>
            </div>
            <span className="text-slate-500">{progress}%</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportProgressDialog;