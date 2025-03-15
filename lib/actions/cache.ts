"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { cache } from "react";
import { ProductType } from "../types/types";
import { fetchProductAndRelevantParams } from "./product.actions";
import { Store } from "@/constants/store";

const paths = {
    categories: "/admin/categories",
    createProduct: "/admin/createProduct",
    products: "/admin/products",
    dashboard: "/admin/dashboard",
    statistics: "/admin/statistics",
    orders: "/admin/Orders",
    payments: "/admin/payments",
    clients: "/admin/clients",
    filter: "/admin/filter",
    pixel: "/admin/pixel"
} as const

const adminPaths = [
    {
        name: 'createProduct',
        values: [paths.categories, paths.products, paths.filter],
        user_cache: {
            catalog: true,
            productPage: false,
            allProductPages: false
        }
    },
    {
        name: 'updateProduct',
        values: [paths.categories, paths.products, paths.dashboard, paths.statistics, paths.filter],
        user_cache: {
            catalog: true,
            productPage: true,
            allProductPages: false
        }
    },
    {
        name: 'deleteProduct',
        values: [paths.categories, paths.products, paths.dashboard, paths.statistics, paths.filter],
        user_cache: {
            catalog: true,
            productPage: false,
            allProductPages: true
        }
    },
    {
        name: 'createOrder',
        values: [paths.categories, paths.dashboard, paths.orders, paths.payments, paths.statistics]
    },
    {
        name: "createUser",
        values: [paths.clients, paths.statistics]
    },
    {
        name: 'likeProduct',
        values: [paths.statistics, paths.categories]
    },
    {
        name: "addToCart",
        values: [paths.dashboard, paths.statistics]
    },
    {
        name: "createCategory",
        values: [paths.categories, paths.createProduct, paths.filter]
    },
    {
        name: "updateCategory",
        values: [paths.categories, paths.createProduct, paths.filter, paths.statistics, paths.dashboard, paths.products],
        user_cache: {
            catalog: true,
            productPage: false,
            allProductPages: true
        }
    }, 
    {
        name: "deleteCategory",
        values: [paths.categories, paths.createProduct, paths.filter, paths.statistics, paths.dashboard, paths.products],
        user_cache: {
            catalog: true,
            productPage: false,
            allProductPages: true
        }
    },
    {
        name: "createPixel",
        values: [paths.pixel]
    },
    {
        name: "updatePixel",
        values: [paths.pixel]
    },
    {
        name: "deletePixel",
        values: [paths.pixel]
    }
] as const;

type ConditionalProps<T extends typeof adminPaths[number]["name"]> = 
    Extract<typeof adminPaths[number], { name: T }> extends { user_cache: { productPage: true } }
        ?  string 
        : undefined;

export default async function clearCache<T extends typeof adminPaths[number]["name"]>(
    functionNames: T | T[],
    productId: ConditionalProps<T>
) {
    const functionNamesArray = Array.isArray(functionNames) ? functionNames : [functionNames];

    functionNamesArray.forEach(functionName => {
        const path = adminPaths.filter(({ name, values }) => name === functionName);

        path[0]?.values.forEach((value: string) => {
            revalidatePath(value);
        });
    });

    if(productId) {
        revalidateTag(`${Store.name}-product-${productId}`)
    }
}

export const fetchProductPageInfo = cache(
    async (currentProductId: string, key: keyof ProductType, splitChar?: string, index?: number) => {
      return unstable_cache(
        async () => {
          const { product, selectParams } = await fetchProductAndRelevantParams(currentProductId, key, splitChar, index);
          return { product, selectParams };
        },
        [`${Store.name}-product-${currentProductId}`],
        { tags: [`${Store.name}-product-${currentProductId}`] }
      )();
    }
  );
  
  
  