/**
 * Brands of the shop. A brand is the "vendor" of a product; the list of
 * brands is every vendor the products have, plus the names the owner added in
 * the admin ("Бренди") before any product got them. Pure helpers, shared by
 * the admin and the storefront.
 */

export const BRANDS_KEY = "brands"
export const BRAND_NAME_MAX = 60
/** A brand needs this many catalog cards in stock before its page is offered to search engines: a page with two products is not a brand page. */
export const BRAND_PAGE_MIN = 5
/** What a product without a brand holds in the database. */
export const NO_BRAND = "Не вказано"

export const cleanBrandName = (text: unknown) => (typeof text === "string" ? text.replace(/\s+/g, " ").trim().slice(0, BRAND_NAME_MAX) : "")

/** The same brand whatever the letter case and the spaces: "ELLOS" is "Ellos". */
export const brandKey = (name: string) => cleanBrandName(name).toLocaleLowerCase("uk-UA")

/** Cyrillic letters that look like Latin ones: "Сlas Ohlson" typed with a Cyrillic "С" reads the same as "Clas Ohlson". */
const LOOKALIKES: Record<string, string> = { а: "a", в: "b", е: "e", к: "k", м: "m", н: "h", о: "o", р: "p", с: "c", т: "t", у: "y", х: "x", і: "i" }

/**
 * Two names with the same twin key are spellings of one brand: letter case,
 * spaces, punctuation and accents do not count ("ELLOS", "Ellos", "+ Ellos";
 * "Áhkká", "Ahkka"), and neither do look-alike Cyrillic letters inside a
 * Latin name.
 */
export function brandTwinKey(name: string): string {
  let text = cleanBrandName(name).toLocaleLowerCase("uk-UA")
  // Only a name that mixes the two alphabets is folded: a Ukrainian name stays Ukrainian.
  if (/[a-z]/.test(text) && /[а-яіїєґ]/.test(text)) text = text.replace(/[а-яі]/g, (letter) => LOOKALIKES[letter] ?? letter)
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
}

/** Why a name cannot be a brand, or null. */
export function brandNameProblem(text: string): string | null {
  const name = cleanBrandName(text)
  if (!name) return "Напишіть назву бренду."
  if (name === NO_BRAND) return "Це позначка товару без бренду, а не назва бренду."
  if (/^[0-9a-f]{24}$/i.test(name)) return "Це схоже на внутрішній номер, а не на назву бренду."
  return null
}

/** The saved list as stored: names only. */
export function cleanBrandList(input: unknown): string[] {
  const source = (input && typeof input === "object" ? (input as Record<string, unknown>).names : null) ?? []
  const seen = new Set<string>()
  const names: string[] = []
  for (const entry of Array.isArray(source) ? source : []) {
    const name = cleanBrandName(entry)
    if (!name || brandNameProblem(name) || seen.has(brandKey(name))) continue
    seen.add(brandKey(name))
    names.push(name)
  }
  return names.slice(0, 500)
}

/** Address of a brand's page in the shop. */
export const brandHref = (name: string) => `/catalog?vendor=${encodeURIComponent(name)}`
