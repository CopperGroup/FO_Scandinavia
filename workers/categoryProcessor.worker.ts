import { Category as OutputCategoryType } from "@/lib/types/types";

interface RawProduct {
  _id: string;
  name: string;
  price?: number;
}

interface RawCategory {
  _id: string;
  name: string;
  totalValue?: number;
  products?: RawProduct[];
}

self.onmessage = (event: MessageEvent<RawCategory[]>) => {
  const rawCategoriesChunk = event.data;
  const processedCategories: OutputCategoryType[] = [];

  for (const rawCategory of rawCategoriesChunk) {
    const productsArray = rawCategory.products || [];
    const totalProducts = productsArray.length;

    let currentTotalValue = 0;
    if (typeof rawCategory.totalValue === 'number') {
      currentTotalValue = rawCategory.totalValue;
    } else {
      currentTotalValue = productsArray.reduce((sum, product) => sum + (product.price || 0), 0);
    }
    
    const averageProductPrice =
      totalProducts > 0
        ? parseFloat((currentTotalValue / totalProducts).toFixed(0))
        : 0;

    const stringifiedProducts = JSON.stringify(productsArray);

    processedCategories.push({
      category: {
        name: rawCategory.name,
        _id: rawCategory._id.toString(),
      },
      values: {
        totalProducts,
        totalValue: currentTotalValue,
        averageProductPrice,
        stringifiedProducts,
      },
    });
  }

  self.postMessage(processedCategories);
};

export {};