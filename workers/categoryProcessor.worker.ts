import { Category as OutputCategoryType } from "@/lib/types/types"; // User's Category type

self.onmessage = (event: MessageEvent<any[]>) => {
  const categoriesChunk = event.data;

  const processedChunk: OutputCategoryType[] = categoriesChunk.map(data => {
    const totalProducts = data.products.length;
    const totalValue = data.totalValue; 

    const averageProductPrice =
      totalProducts > 0
        ? parseFloat((totalValue / totalProducts).toFixed(2))
        : 0;

    const stringifiedProducts = JSON.stringify(data.products);

    return {
      category: {
        name: data.name,
        _id: data._id,
      },
      values: {
        totalProducts,
        totalValue,
        averageProductPrice,
        stringifiedProducts,
      },
    };
  });

  self.postMessage(processedChunk);
};

export {};