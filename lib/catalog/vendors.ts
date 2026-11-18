/**
 * Brand names arrive from supplier feeds in several spellings ("H&M",
 * "Hennes&Mauritz", "Henness&Mauritz"; "ELLOS", "Ellos"). The catalog shows
 * and filters by one canonical spelling per brand.
 */

/** Brands whose spellings differ by more than case and punctuation. */
const ALIASES: [RegExp, string][] = [[/^(h\s*(&|and)?\s*m|henn?ess?\s*(&|and)?\s*mauritz)$/i, "H&M"]];

/** Identity of a brand: letters and digits only, lower case, no diacritics. */
export function vendorKey(name: string): string {
  const trimmed = name.trim();
  for (const [pattern, label] of ALIASES) if (pattern.test(trimmed)) return vendorKey(`${label}\u0000`);
  return trimmed
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

/** The spelling shown to shoppers for one name on its own: the alias label when the brand has one. */
export function vendorLabel(name: string): string {
  const trimmed = name.trim();
  return ALIASES.find(([pattern]) => pattern.test(trimmed))?.[1] ?? trimmed;
}

const isShouting = (name: string) => name.length > 3 && name === name.toUpperCase();

/**
 * Maps every spelling to the one shown to shoppers: the alias label when
 * there is one, otherwise the most common spelling (mixed case preferred
 * over ALL CAPS when they tie).
 */
export function buildVendorMap(names: Iterable<string | null | undefined>): Map<string, string> {
  const spellings = new Map<string, Map<string, number>>();
  for (const raw of names) {
    const name = raw?.trim();
    if (!name) continue;
    const key = vendorKey(name);
    if (!key) continue;
    const counts = spellings.get(key) ?? new Map<string, number>();
    spellings.set(key, counts);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const result = new Map<string, string>();
  spellings.forEach((counts) => {
    const variants = Array.from(counts.entries());
    const alias = ALIASES.find(([pattern]) => variants.some(([name]) => pattern.test(name)))?.[1];
    const best =
      alias ??
      variants.sort(
        ([nameA, countA], [nameB, countB]) =>
          Number(isShouting(nameA)) - Number(isShouting(nameB)) || countB - countA || nameA.localeCompare(nameB),
      )[0][0];
    for (const [name] of variants) result.set(name, best);
  });
  return result;
}
