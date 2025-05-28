import { Category as OutputCategoryType } from "@/lib/types/types";

interface RawProduct {
  _id: string;
  name: string;
  price?: number; // Assuming price is a field on your product
}

interface RawCategory {
  _id: string;
  name: string;
  totalValue?: number; // If this exists directly on the category document
  products?: RawProduct[];
}

self.onmessage = (event: MessageEvent<RawCategory[]>) => {
  const rawCategoriesChunk = event.data;
  const processedCategories: OutputCategoryType[] = [];

  for (const rawCategory of rawCategoriesChunk) {
    if (!rawCategory.products || rawCategory.products.length === 0) {
      continue; // Skip categories with no products
    }

    const productsArray = rawCategory.products || [];
    const totalProducts = productsArray.length;

    let currentTotalValue = 0;
    if (typeof rawCategory.totalValue === 'number') {
      currentTotalValue = rawCategory.totalValue;
    } else {
      // Fallback: Calculate totalValue if not present on category document
      // This assumes products have a 'price' field. Adjust if necessary.
      currentTotalValue = productsArray.reduce((sum, product) => sum + (product.price || 0), 0);
    }
    
    const averageProductPrice =
      totalProducts > 0
        ? parseFloat((currentTotalValue / totalProducts).toFixed(2))
        : 0;

    const stringifiedProducts = JSON.stringify(productsArray);

    processedCategories.push({
      category: {
        name: rawCategory.name,
        _id: rawCategory._id.toString(), // Ensure _id is a string
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