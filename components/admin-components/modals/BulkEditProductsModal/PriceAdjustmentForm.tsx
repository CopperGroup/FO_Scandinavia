"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { applyDiscountToProduct } from "@/lib/actions/product.actions";
import clearCache from "@/lib/actions/cache";

interface PriceAdjustmentFormProps {
  productIds: string[];
  onAdjustmentComplete: () => void;
}

const PriceAdjustmentForm = ({ productIds, onAdjustmentComplete }: PriceAdjustmentFormProps): JSX.Element => {
  const [adjustmentType, setAdjustmentType] = useState<"Зменшити" | "Збільшити">("Зменшити");
  const [percentage, setPercentage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [completedRequests, setCompletedRequests] = useState<number>(0);
  const [totalRequests, setTotalRequests] = useState<number>(productIds.length);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isError, setIsError] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const parsedPercentage: number = parseFloat(percentage);
    if (isNaN(parsedPercentage) || parsedPercentage <= 0) {
      setStatusMessage("Будь ласка, введіть дійсний відсоток (більше нуля).");
      setIsError(true);
      return;
    }

    setIsSubmitting(true);
    setCompletedRequests(0);
    setProgress(0);
    setStatusMessage("Оновлення цін товарів...");
    setIsError(false);

    const CONCURRENCY_LIMIT: number = 10;
    let successfulUpdates: number = 0;
    let failedUpdates: number = 0;

    const productIdsCopy: string[] = [...productIds];
    const productBatches: string[][] = [];
    for (let i: number = 0; i < productIdsCopy.length; i += CONCURRENCY_LIMIT) {
      productBatches.push(productIdsCopy.slice(i, i + CONCURRENCY_LIMIT));
    }

    for (const batch of productBatches) {
      const promises: Promise<void>[] = batch.map(async (productId: string) => {
        try {
          await applyDiscountToProduct({
            productId,
            percentage: parsedPercentage,
            direction: adjustmentType,
          });
          successfulUpdates++;
        } catch (error: unknown) {
          console.error(`Failed to update product ${productId}:`, error);
          failedUpdates++;
        } finally {
          setCompletedRequests((prev: number) => {
            const newCount: number = prev + 1;
            setProgress(Math.round((newCount / totalRequests) * 100));
            return newCount;
          });

          await clearCache("updateProduct", "")
        }
      });
      await Promise.all(promises);
    }

    setIsSubmitting(false);
    if (failedUpdates === 0) {
      setStatusMessage("Успішно оновлено всі ціни!");
      setIsError(false);
    } else if (successfulUpdates > 0) {
      setStatusMessage(`Оновлено ${successfulUpdates} товарів, ${failedUpdates} не вдалося.`);
      setIsError(true);
    } else {
      setStatusMessage("Не вдалося оновити жоден товар.");
      setIsError(true);
    }
    setTimeout(onAdjustmentComplete, 2000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      <div className="space-y-2">
        <Label htmlFor="adjustmentType" className="text-base-semibold text-slate-700">
          Тип зміни:
        </Label>
        <RadioGroup
          value={adjustmentType}
          onValueChange={(value: "Зменшити" | "Збільшити") => setAdjustmentType(value)}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Зменшити" id="decrease" className="border-slate-300" />
            <Label htmlFor="decrease" className="text-base-regular text-slate-700">
              Зменшити
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Збільшити" id="increase" className="border-slate-300" />
            <Label htmlFor="increase" className="text-base-regular text-slate-700">
              Збільшити
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="percentage" className="text-base-semibold text-slate-700">
          Відсоток:
        </Label>
        <Input
          id="percentage"
          type="number"
          placeholder="Наприклад, 10 або 25"
          value={percentage}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPercentage(e.target.value)}
          className="w-full text-base-regular border-slate-200 focus:border-slate-300 focus:ring-slate-200"
          min="0.01"
          step="0.01"
        />
      </div>

      {isSubmitting && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-small-regular text-slate-600 text-center">
            {completedRequests} з {totalRequests} товарів оновлено ({progress}%)
          </p>
        </div>
      )}

      {statusMessage && (
        <div className={`flex items-center gap-2 text-small-medium ${isError ? "text-red-600" : "text-green-600"}`}>
          {isError ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          <span>{statusMessage}</span>
        </div>
      )}

      <Button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-base-semibold py-2 rounded-md transition-colors text-white"
        disabled={isSubmitting || productIds.length === 0}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Застосування...
          </>
        ) : (
          "Застосувати"
        )}
      </Button>
    </form>
  );
};

export default PriceAdjustmentForm;