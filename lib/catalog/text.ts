/** Text helpers shared by the catalog engine. Pure and dependency free. */

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Cyrillic letters that are routinely typed instead of their Latin lookalikes
 * in size codes ("ХL", "М", "85С").
 */
const LOOKALIKES: Record<string, string> = {
  А: "A", В: "B", С: "C", Е: "E", Н: "H", К: "K", М: "M", О: "O", Р: "P", Т: "T", Х: "X",
  а: "a", с: "c", е: "e", о: "o", р: "p", х: "x",
};

export function foldLookalikes(value: string): string {
  let out = "";
  for (const char of value) out += LOOKALIKES[char] ?? char;
  return out;
}

export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Lower-cased, punctuation-tolerant form used for search matching. */
export function normalizeForSearch(value: string): string {
  return collapseWhitespace(
    value
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[’`ʼ‘]/g, "'")
      .replace(/ё/g, "е"),
  );
}

export function capitalize(value: string): string {
  return value.length === 0 ? value : value.charAt(0).toLocaleUpperCase("uk-UA") + value.slice(1);
}

/** Splits a product name into word tokens, dropping surrounding punctuation. */
export function tokenize(value: string): string[] {
  return value
    .split(/\s+/)
    .map((token) => token.replace(/^[\s,;:()[\]"«»]+|[\s,;:()[\]"«».]+$/g, ""))
    .filter((token) => token.length > 0);
}

export function stripHtml(value: string): string {
  return collapseWhitespace(
    value
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<[^>]*>/g, " "),
  );
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}
