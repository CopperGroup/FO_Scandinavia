import { parseSizeToken } from "./attributes";
import type { ParsedArticle } from "./article";
import { collapseWhitespace, escapeRegExp } from "./text";
import type { NormalizedSize } from "./types";

/**
 * Removes a code from a name when it stands on its own (not inside a longer
 * code). Written without lookbehind so it also runs in older Safari.
 */
function removeCode(name: string, code: string): string {
  if (code.length < 4) return name;
  // The optional "/36" covers names that spell a size range the article abbreviates ("…-34/36").
  const body = `${escapeRegExp(code)}(?:/\\d{1,3})?`;
  const parenthesized = new RegExp(`[\\s,]*\\(\\s*${body}\\s*\\)`, "gi");
  const bare = new RegExp(`(^|[^0-9A-Za-z])${body}(?![0-9A-Za-z])`, "gi");
  return name.replace(parenthesized, " ").replace(bare, "$1 ");
}

function tidy(name: string): string {
  return collapseWhitespace(
    name
      .replace(/\(\s*\)/g, " ")
      .replace(/\s+([,;])/g, "$1")
      .replace(/([,;])\1+/g, "$1"),
  )
    .replace(/^[\s,;–-]+/, "")
    .replace(/[\s,;–-]+$/, "");
}

/** Product name without its article number (in any of its written forms). */
export function stripArticle(name: string, article: ParsedArticle): string {
  let result = name;
  if (article.raw) result = removeCode(result, article.raw);
  if (article.stem && article.stem !== article.raw) result = removeCode(result, article.stem);
  return tidy(result);
}

function bare(token: string): string {
  return token.replace(/^[\s,;:()[\]]+|[\s,;:()[\].]+$/g, "");
}

/** True when the size appears in the name as a word of its own. */
export function nameMentionsSize(nameWithoutArticle: string, size: NormalizedSize): boolean {
  return nameWithoutArticle.split(/\s+/).some((token) => parseSizeToken(bare(token))?.key === size.key);
}

/** Removes the size word from a name, leaving the rest untouched. */
export function stripSize(nameWithoutArticle: string, size: NormalizedSize | null): string {
  if (!size) return nameWithoutArticle;
  const tokens = nameWithoutArticle.split(/\s+/);
  for (let index = tokens.length - 1; index >= 0; index--) {
    if (parseSizeToken(bare(tokens[index]))?.key === size.key) {
      // "140x220 см": the unit travels with the size.
      const unitFollows = size.cls === "dimension" && /^(см|cm)[,.;]?$/i.test(tokens[index + 1] ?? "");
      tokens.splice(index, unitFollows ? 2 : 1);
      return tidy(tokens.join(" "));
    }
  }
  return nameWithoutArticle;
}
