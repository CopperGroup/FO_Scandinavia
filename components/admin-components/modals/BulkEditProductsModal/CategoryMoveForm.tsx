"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, XCircle, FolderTree, Plus } from "lucide-react";
import { getCategoriesNamesAndIds, createNewCategory } from "@/lib/actions/categories.actions";
import { fetchProductById, editProduct } from "@/lib/actions/product.actions";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import type { ProductType } from "@/lib/types/types";

interface CategoryMoveFormProps {
  productIds: string[];
  onMoveComplete: () => void;
}

const CategoryMoveForm = ({ productIds, onMoveComplete }: CategoryMoveFormProps): JSX.Element => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [newCategoryName, setNewCategoryName] = useState<string>("");
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState<boolean>(false);
  const [removeFromOtherCategories, setRemoveFromOtherCategories] = useState<boolean>(false);
  const [categories, setCategories] = useState<{ name: string; categoryId: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [completedRequests, setCompletedRequests] = useState<number>(0);
  const [totalRequests, setTotalRequests] = useState<number>(productIds.length);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isError, setIsError] = useState<boolean>(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const categoriesList = await getCategoriesNamesAndIds();
        setCategories(categoriesList);
      } catch (error) {
        console.error("Error fetching categories:", error);
        setStatusMessage("Помилка завантаження категорій");
        setIsError(true);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    let targetCategoryId = selectedCategoryId;
    
    // If creating a new category, create it first
    if (isCreatingNewCategory) {
      if (!newCategoryName || newCategoryName.trim() === "") {
        setStatusMessage("Будь ласка, введіть назву нової категорії.");
        setIsError(true);
        return;
      }
      
      // Check if category already exists
      const existingCategory = categories.find(cat => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase());
      if (existingCategory) {
        setStatusMessage(`Категорія "${newCategoryName}" вже існує. Будь ласка, виберіть її зі списку.`);
        setIsError(true);
        setSelectedCategoryId(existingCategory.categoryId);
        setIsCreatingNewCategory(false);
        setNewCategoryName("");
        return;
      }
      
      try {
        setIsSubmitting(true);
        setStatusMessage("Створення нової категорії...");
        setIsError(false);
        
        // Create the new category with empty products array (we'll add products in the next step)
        const newCategory = await createNewCategory({
          name: newCategoryName.trim(),
          products: [],
        });
        
        targetCategoryId = newCategory._id.toString();
        
        // Refresh categories list
        const updatedCategories = await getCategoriesNamesAndIds();
        setCategories(updatedCategories);
        
        setStatusMessage("Категорію створено. Оновлення товарів...");
      } catch (error: unknown) {
        console.error("Error creating category:", error);
        setStatusMessage("Помилка створення категорії. Спробуйте ще раз.");
        setIsError(true);
        setIsSubmitting(false);
        return;
      }
    }
    
    if (!targetCategoryId) {
      setStatusMessage("Будь ласка, виберіть або створіть категорію.");
      setIsError(true);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    setCompletedRequests(0);
    setProgress(0);
    setStatusMessage("Оновлення категорій товарів...");
    setIsError(false);

    const CONCURRENCY_LIMIT: number = 5;
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
          // Fetch the product to get its current data
          const productJson = await fetchProductById(productId, "json");
          const product: ProductType = JSON.parse(productJson);

          // Determine the new category array
          let newCategories: string[];
          if (removeFromOtherCategories) {
            // Only the target category
            newCategories = [targetCategoryId];
          } else {
            // Add the selected category to existing categories (avoid duplicates)
            let existingCategories: string[] = [];
            if (Array.isArray(product.category)) {
              existingCategories = product.category.map((cat: any) => {
                if (typeof cat === 'string') {
                  return cat;
                } else if (cat && typeof cat === 'object' && cat._id) {
                  return cat._id.toString();
                } else {
                  return cat?.toString() || '';
                }
              }).filter((cat: string) => cat && cat.trim() !== '');
            } else if (product.category) {
              // Handle case where category is a single value
              existingCategories = [product.category.toString()];
            }
            const uniqueCategories = Array.from(new Set([...existingCategories, targetCategoryId]));
            newCategories = uniqueCategories.filter((cat: string) => cat && cat.trim() !== '');
          }

          // Update the product using editProduct
          await editProduct({
            _id: productId,
            id: product.id,
            name: product.name,
            quantity: product.quantity,
            images: product.images,
            url: product.url,
            price: product.price,
            priceToShow: product.priceToShow,
            vendor: product.vendor,
            category: newCategories,
            description: product.description,
            isAvailable: product.isAvailable,
            articleNumber: product.articleNumber,
            params: product.params || [],
          }, "json");

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
        }
      });
      await Promise.all(promises);
    }

    setIsSubmitting(false);
    if (failedUpdates === 0) {
      setStatusMessage("Успішно оновлено всі товари!");
      setIsError(false);
    } else if (successfulUpdates > 0) {
      setStatusMessage(`Оновлено ${successfulUpdates} товарів, ${failedUpdates} не вдалося.`);
      setIsError(true);
    } else {
      setStatusMessage("Не вдалося оновити жоден товар.");
      setIsError(true);
    }
    setTimeout(onMoveComplete, 2000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      <div className="space-y-2">
        <Label htmlFor="category" className="text-base-semibold text-slate-700 flex items-center gap-2">
          <FolderTree className="h-4 w-4" />
          Категорія:
        </Label>
        {isLoadingCategories ? (
          <div className="flex items-center gap-2 text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-small-regular">Завантаження категорій...</span>
          </div>
        ) : isCreatingNewCategory ? (
          <div className="space-y-2">
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Введіть назву нової категорії"
              className="text-base-regular border-slate-200 focus:border-slate-300"
              disabled={isSubmitting}
              autoFocus
            />
            {categories.some((category) => category.name.toLowerCase() === newCategoryName.trim().toLowerCase()) && (
              <p className="text-small-regular text-yellow-600 mt-1">
                Категорія вже існує.{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto text-small-regular"
                  onClick={() => {
                    const existing = categories.find(cat => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase());
                    if (existing) {
                      setSelectedCategoryId(existing.categoryId);
                      setIsCreatingNewCategory(false);
                      setNewCategoryName("");
                    }
                  }}
                  disabled={isSubmitting}
                >
                  Виберіть її замість цього
                </Button>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <SearchableSelect
              isForm={false}
              items={categories}
              placeholder="Виберіть категорію..."
              value={selectedCategoryId}
              onValueChange={setSelectedCategoryId}
              renderValue="name"
              searchValue="name"
              itemValue="categoryId"
              className="min-w-[300px] text-base-regular bg-white"
              triggerStyle="font-normal mt-1"
              disabled={isSubmitting}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreatingNewCategory(true);
                setSelectedCategoryId("");
                setNewCategoryName("");
              }}
              disabled={isSubmitting}
              className="w-full text-small-regular border-slate-200 hover:bg-slate-50"
            >
              <Plus className="mr-2 h-4 w-4" />
              Створити категорію
            </Button>
          </div>
        )}
      </div>
      
      {isCreatingNewCategory && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsCreatingNewCategory(false);
            setNewCategoryName("");
          }}
          disabled={isSubmitting}
          className="text-small-regular text-slate-600 hover:text-slate-800"
        >
          Виберіть існуючу категорію
        </Button>
      )}

      <div className="flex items-center space-x-2">
        <Checkbox
          id="removeFromOtherCategories"
          checked={removeFromOtherCategories}
          onCheckedChange={(checked) => setRemoveFromOtherCategories(checked === true)}
          disabled={isSubmitting}
        />
        <Label
          htmlFor="removeFromOtherCategories"
          className="text-base-regular text-slate-700 cursor-pointer"
        >
          Видалити з усіх інших категорій
        </Label>
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
        disabled={isSubmitting || productIds.length === 0 || (!selectedCategoryId && !isCreatingNewCategory) || isLoadingCategories || (isCreatingNewCategory && !newCategoryName.trim())}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Застосування...
          </>
        ) : (
          "Перемістити товари"
        )}
      </Button>
    </form>
  );
};

export default CategoryMoveForm;

