/**
 * E-mail addresses are compared without regard to case.
 *
 * Older records keep the case the customer typed ("Olena@Gmail.com"), so a
 * lookup normalises its input and runs with this collation. The users
 * collection has an index with the same collation ("email_ci"), which turns
 * the lookup into one index hit instead of a regex scan.
 */
export const EMAIL_COLLATION = { locale: "en", strength: 2 } as const;

/** Trimmed and lower-cased; the form every new record is stored in. */
export function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

/** A loose shape check: enough to refuse obvious garbage before touching the database. */
export function looksLikeEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
