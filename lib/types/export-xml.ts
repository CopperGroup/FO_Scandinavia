export interface ProductParam {
    name: string;
    value: string;
    unit?: string; // The example XML had units for some params
  }
  
  export interface ProductData {
    id: string; // Corresponds to <offer id="...">
    name: string; // Corresponds to <name>...</name>
    images: string[]; // Corresponds to multiple <picture>...</picture>
    isAvailable?: boolean; // Corresponds to <offer available="...">
    quantity?: number; // Corresponds to <stock_quantity>...</stock_quantity>
    url?: string; // Corresponds to <url>...</url> in offer
    priceToShow?: number; // Corresponds to <price>...</price>
    price?: number; // Fallback if priceToShow is not available
    currencyId?: string; // Corresponds to <currencyId>...</currencyId>, defaults to UAH
    categoryId: string; // Corresponds to <categoryId>...</categoryId> (ensure this is the string ID)
    vendor?: string; // Corresponds to <vendor>...</vendor>
    description?: string; // Corresponds to <description><![CDATA[...]]></description>
    params?: ProductParam[]; // Corresponds to multiple <param name="..." unit="...">...</param>
    country_of_origin?: string; // Corresponds to <country_of_origin>...</country_of_origin>
  }
  
  export interface CategoryData {
    id: string; // Corresponds to <category id="...">
    name: string; // Corresponds to <category>...</category>
    parentId?: string; // Corresponds to <category parentId="...">
  }
  
  export interface ShopData {
    name: string;
    company: string;
    url: string;
    currencies: Array<{ id: string; rate: string; }>;
    local_delivery_cost: string;
  }