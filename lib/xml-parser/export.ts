import { create } from 'xmlbuilder2';
import { CategoryData, ProductData, ShopData } from '../types/export-xml';

function getCurrentTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function generateYmlCatalogXml(
  shopData: ShopData,
  categories: CategoryData[],
  products: ProductData[]
): string {
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
  categories.forEach(cat => {
    const catAttrs: { id: string; parentId?: string } = { id: cat.id };
    if (cat.parentId) {
      catAttrs.parentId = cat.parentId;
    }
    categoriesEle.ele('category', catAttrs).txt(cat.name);
  });

  shop.ele('local_delivery_cost').txt(shopData.local_delivery_cost);

  const offersEle = shop.ele('offers');
  products.forEach(product => {
    const offerAttrs: { id: string; available?: string } = { id: product.id };
    if (typeof product.isAvailable === 'boolean') {
      offerAttrs.available = String(product.isAvailable);
    }

    const offer = offersEle.ele('offer', offerAttrs);
    if (product.url) offer.ele('url').txt(product.url);
    offer.ele('price').txt(String(product.priceToShow ?? product.price ?? 0));
    offer.ele('currencyId').txt(product.currencyId || 'UAH');
    offer.ele('categoryId').txt(product.categoryId);

    product.images.forEach(imgUrl => {
      offer.ele('picture').txt(imgUrl);
    });

    if (product.vendor) offer.ele('vendor').txt(product.vendor);
    if (product.country_of_origin) offer.ele('country_of_origin').txt(product.country_of_origin);
    if (typeof product.quantity === 'number') offer.ele('stock_quantity').txt(String(product.quantity));
    offer.ele('name').txt(product.name);

    if (product.description) {
      // Use .dat() for CDATA sections
      offer.ele('description').dat(product.description);
    }

    if (product.params) {
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