"use server";

import { requireAdmin } from "@/lib/auth/guards";
import { searchProductsForOrder, type ProductHit } from "./orders";

/** Product search for the "add to order" dialog: staff only, at most 20 results. */
export async function searchOrderProducts(query: string): Promise<ProductHit[]> {
  await requireAdmin();
  return searchProductsForOrder(String(query ?? ""));
}
