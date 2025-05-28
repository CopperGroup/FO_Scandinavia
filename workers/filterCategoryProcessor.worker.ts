interface RawProductParam {
    name: string;
    [key: string]: any;
  }
  
  interface RawProduct {
    _id: string;
    name?: string;
    params?: RawProductParam[];
    [key: string]: any;
  }
  
  interface RawCategory {
    _id: string;
    name: string;
    products?: RawProduct[];
    [key: string]: any;
  }
  
  export interface ProcessedCategoryParams {
    [categoryId: string]: {
      name: string;
      totalProducts: number;
      params: { name: string; totalProducts: number; type: string }[];
    };
  }
  
  self.onmessage = (event: MessageEvent<RawCategory[]>) => {
    const rawCategoriesChunk = event.data;
    const categoriesParamsResult: ProcessedCategoryParams = {};
  
    for (const rawCategory of rawCategoriesChunk) {
      const productsArray = rawCategory.products || [];
      const totalProductsInCat = productsArray.length;
      const paramCounts: Record<string, number> = {};
  
      productsArray.forEach((product) => {
        if (product.params && Array.isArray(product.params)) {
          product.params.forEach((param) => {
            const key = param.name;
            paramCounts[key] = (paramCounts[key] || 0) + 1;
          });
        }
      });
      
      const categoryId = typeof rawCategory._id === 'string' ? rawCategory._id : String(rawCategory._id);
  
      categoriesParamsResult[categoryId] = {
        name: rawCategory.name,
        totalProducts: totalProductsInCat,
        params: Object.entries(paramCounts).map(([name, count]) => ({
          name,
          totalProducts: count,
          type: "" 
        }))
      };
    }
  
    self.postMessage(categoriesParamsResult);
  };
  
  export {};