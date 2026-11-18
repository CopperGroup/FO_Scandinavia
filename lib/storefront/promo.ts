import { cache } from "react";
import { listCustomerPromos } from "@/lib/promo/server";
import type { CustomerPromo } from "@/lib/promo/rules";
import { getCurrentUser } from "./session";

/**
 * The signed-in customer's personal promo codes; null for a guest. Read for
 * the session's own account only: there is no way to ask for someone else's.
 */
export const getMyPromoCodes = cache(async (): Promise<CustomerPromo[] | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  return listCustomerPromos(user.id);
});
