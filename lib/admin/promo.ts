/**
 * Reads a personal promo code: "DV-" + percent + 4 random digits + 3 letters
 * of the e-mail + validity date (YYYYMMDD) + uses left. The format is made by
 * lib/actions/promocode.actions.ts.
 */
export type PromoInfo = { code: string; percent: number | null; validUntil: string | null; usesLeft: number | null; expired: boolean };

export function describePromoCode(code: string, now: Date = new Date()): PromoInfo {
  const body = String(code ?? "").split("-")[1] ?? "";
  const tail = 4 + 3 + 8 + 1;
  if (body.length < tail + 1) return { code, percent: null, validUntil: null, usesLeft: null, expired: false };

  const percentText = body.slice(0, body.length - tail);
  const rest = body.slice(percentText.length + 4 + 3);
  const dateText = rest.slice(0, 8);
  const percent = Number.parseInt(percentText, 10);
  const usesLeft = Number.parseInt(rest.slice(8), 10);

  let validUntil: string | null = null;
  let expired = false;
  if (/^\d{8}$/.test(dateText)) {
    validUntil = `${dateText.slice(0, 4)}-${dateText.slice(4, 6)}-${dateText.slice(6, 8)}`;
    expired = new Date(`${validUntil}T00:00:00+02:00`).getTime() < now.getTime();
  }

  return {
    code,
    percent: Number.isFinite(percent) ? percent : null,
    validUntil,
    usesLeft: Number.isFinite(usesLeft) ? usesLeft : null,
    expired: expired || (Number.isFinite(usesLeft) && usesLeft <= 0),
  };
}
