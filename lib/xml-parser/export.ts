import { create } from 'xmlbuilder2';

export interface CategoryData {
  id: string;
  name: string;
  parentId?: string;
}

export interface ProductParam {
  name: string;
  value: string;
  unit?: string;
}

export interface ProductData {
  id: string;
  name: string;
  isAvailable?: boolean;
  price?: number;
  priceToShow?: number;
  currencyId?: string;
  categoryId: string; // Made mandatory as per XML structure, ensure it's resolved
  vendor?: string;
  images: string[];
  quantity?: number;
  description?: string;
  params?: ProductParam[];
  url?: string;
  country_of_origin?: string;
}

export interface ShopData {
  name: string;
  company: string;
  url: string;
  currencies: Array<{ id: string; rate: string }>;
  local_delivery_cost: string;
}

// This is the input type for raw categories
export type CategoryType = {
  _id: string;
  id: string;
  name: string;
  products: string[];
  totalValue: number;
  subCategories: string[]; // Array of child category _IDs
};


function transformRawCategoriesToXmlCategories(
  rawCategories: CategoryType[]
): CategoryData[] {
  const outputList: CategoryData[] = [];
  const categoryMapBy_Id = new Map<string, CategoryType>();
  const parentIdAssignments = new Map<string, string>();

  for (const cat of rawCategories) {
    categoryMapBy_Id.set(cat._id.toString(), cat);
  }

  for (const parentCat of rawCategories) {
    const parentPublicId = parentCat.id;

    if (parentCat.subCategories && Array.isArray(parentCat.subCategories)) {
      for (const child_InternalId of parentCat.subCategories) {
        const childCatObject = categoryMapBy_Id.get(child_InternalId.toString());
        if (childCatObject) {
          parentIdAssignments.set(childCatObject.id, parentPublicId);
        }
      }
    }
  }

  for (const cat of rawCategories) {
    outputList.push({
      id: cat.id,
      name: cat.name,
      parentId: parentIdAssignments.get(cat.id),
    });
  }
  return outputList;
}

function transformRawProductsToXmlProducts(
  rawProducts: any[],
  rawCategoriesForLookup: CategoryType[]
): ProductData[] {
  return rawProducts.map((product: any) => {
    let resolvedProductCategoryId: string | undefined = undefined;
    if (product.category && Array.isArray(product.category) && product.category.length > 0) {
        const productCategory_InternalId = product.category[0].toString();
        const foundCategory = rawCategoriesForLookup.find(c => c._id.toString() === productCategory_InternalId);
        if (foundCategory) {
            resolvedProductCategoryId = foundCategory.id;
        }
    }

    const transformedParams: ProductParam[] = [];
    if (Array.isArray(product.params)) {
        product.params.forEach((param: any) => {
            if (param && typeof param.name === 'string' && param.value !== undefined) {
                transformedParams.push({
                    name: param.name,
                    value: String(param.value),
                    unit: param.unit || undefined,
                });
            }
        });
    }

    return {
      id: String(product.articleNumber || product.id || product._id || `fallback-id-${Math.random().toString(36).substr(2, 9)}`),
      name: product.name || "Unnamed Product",
      isAvailable: product.isAvailable !== undefined ? Boolean(product.isAvailable) : true,
      price: Number(product.price) || 0,
      priceToShow: Number(product.priceToShow) || Number(product.price) || 0,
      currencyId: product.currencyId || "UAH",
      categoryId: resolvedProductCategoryId || "default_category_id", // Ensure categoryId is always a string
      vendor: product.vendor || "",
      images: (Array.isArray(product.images) && product.images.length > 0)
                ? product.images.map(String)
                : ["https://sveamoda.com.ua/placeholder-product-image.jpg"],
      quantity: product.quantity !== undefined ? Number(product.quantity) : (Boolean(product.isAvailable) ? 10 : 0),
      description: product.description || `<p>Опис товару ${product.name || 'N/A'}</p>`,
      params: transformedParams,
      url: product.url || undefined,
      country_of_origin: product.country_of_origin || undefined,
    };
  });
}

function getCurrentTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function generateFullCatalogXmlOnClient(
  rawCategories: CategoryType[],
  rawProducts: any[]
): string {
  const shopData: ShopData = {
    name: 'Интернет-магазин "Sveamoda',
    company: 'Интернет-магазин "Sveamoda',
    url: "https://sveamoda.com.ua/",
    currencies: [
      { id: "USD", rate: "CB" }, { id: "RUR", rate: "CB" },
      { id: "UAH", rate: "1" },  { id: "BYN", rate: "CB" },
      { id: "KZT", rate: "CB" }, { id: "EUR", rate: "CB" },
    ],
    local_delivery_cost: "50.00",
  };

  const categoriesForXml: CategoryData[] = transformRawCategoriesToXmlCategories(rawCategories);
  const productsForXml: ProductData[] = transformRawProductsToXmlProducts(rawProducts, rawCategories);

  const root = create({ version: '1.0', encoding: 'utf-8' })
    .ele('yml_catalog', { date: getCurrentTimestamp() });

  const shop = root.ele('shop');
  shop.ele('name').txt(shopData.name);
  shop.ele('company').txt(shopData.company);
  shop.ele('url').txt(shopData.url);

  const currenciesEle = shop.ele('currencies');
  shopData.currencies.forEach(currency => {
    currenciesEle.ele('currency', { id: currency.id, rate: currency.rate });
  });

  const categoriesEle = shop.ele('categories');
  categoriesForXml.forEach(cat => {
    const catAttrs: { id: string; parentId?: string } = { id: cat.id };
    if (cat.parentId) {
      catAttrs.parentId = cat.parentId;
    }
    categoriesEle.ele('category', catAttrs).txt(cat.name);
  });

  shop.ele('local_delivery_cost').txt(shopData.local_delivery_cost);

  const offersEle = shop.ele('offers');
  productsForXml.forEach(product => {
    const offerAttrs: { id: string; available?: string } = { id: product.id };
    if (typeof product.isAvailable === 'boolean') {
      offerAttrs.available = String(product.isAvailable);
    }

    const offer = offersEle.ele('offer', offerAttrs);
    if (product.url) offer.ele('url').txt(product.url);
    offer.ele('price').txt(String(product.priceToShow ?? product.price ?? 0));

    if (product.priceToShow !== undefined && product.price !== undefined && product.priceToShow !== product.price) {
      offer.ele('price_old').txt(String(product.price));
    }

    offer.ele('currencyId').txt(product.currencyId || 'UAH');
    offer.ele('categoryId').txt(product.categoryId); // categoryId is now guaranteed to be a string

    if (Array.isArray(product.images)) {
        product.images.forEach(imgUrl => {
            if (typeof imgUrl === 'string') {
                 offer.ele('picture').txt(imgUrl);
            }
        });
    }


    if (product.vendor) offer.ele('vendor').txt(product.vendor);
    if (product.country_of_origin) offer.ele('country_of_origin').txt(product.country_of_origin);
    if (typeof product.quantity === 'number') offer.ele('stock_quantity').txt(String(product.quantity));
    offer.ele('name').txt(product.name);

    if (product.description) {
      offer.ele('description').dat(product.description);
    }

    if (product.params && product.params.length > 0) {
      product.params.forEach(param => {
        const paramAttrs: { name: string; unit?: string } = { name: param.name };
        if (param.unit) {
          paramAttrs.unit = param.unit;
        }
        offer.ele('param', paramAttrs).txt(param.value);
      });
    }
  });

  return root.end({ prettyPrint: true, indent: '    ' });
}