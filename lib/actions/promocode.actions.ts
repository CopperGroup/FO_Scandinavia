"use server"

import { getSessionUser } from "../auth/guards";
import { previewPromo, type PromoPreview } from "../promo/server";

/**
 * "Apply" at checkout: says whether the code would work for this customer and
 * what it gives. A public endpoint. It takes nothing and promises nothing: the
 * discount is decided again, by the same rules, when the order is placed
 * (createOrder), and who the customer is comes from the session, never from
 * the browser. `subtotal` only chooses the wording about a minimum order.
 */
export async function checkPromoCode(input: { code: string; subtotal: number }): Promise<PromoPreview> {
  try {
    const customer = await getSessionUser();
    const subtotal = Number(input?.subtotal);
    return await previewPromo({ code: input?.code, userId: customer?.id ?? null, subtotal: Number.isFinite(subtotal) && subtotal > 0 ? subtotal : 0 });
  } catch (error) {
    console.error("[promo] check:", error instanceof Error ? error.message : error);
    return { ok: false, error: "Не вдалося перевірити промокод. Спробуйте ще раз за хвилину." };
  }
}
