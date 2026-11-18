import { capitalize, collapseWhitespace, foldLookalikes } from "./text";
import type { NormalizedColor, NormalizedSize, ProductParam } from "./types";

/* -------------------------------------------------------------------------- */
/*                                    Sizes                                   */
/* -------------------------------------------------------------------------- */

/** Param names that carry the size, most specific first. */
const SIZE_PARAM_NAMES = [
  "розмір",
  "розміри",
  "size",
  "размер",
  "міжнародний розмір",
  "розмір одягу",
  "розмір жіночого одягу",
  "розмір чоловічого одягу",
  "розмір дитячого одягу",
  "розмір взуття",
];

const COLOR_PARAM_NAMES = ["колір", "color", "colour", "цвет"];

/**
 * Position of every letter size on one scale. "2XL" and "XXL" share a position
 * but stay distinct sizes: some vendors list both as separate SKUs.
 */
const ALPHA_POSITIONS: Record<string, number> = {
  XXXS: 0, "3XS": 0, XXS: 1, "2XS": 1, XS: 2, S: 3, M: 4, L: 5, XL: 6,
  XXL: 7, "2XL": 7, XXXL: 8, "3XL": 8, XXXXL: 9, "4XL": 9, "5XL": 10, "6XL": 11, "7XL": 12, "8XL": 13, "9XL": 14,
};

const EMPTY_VALUES = new Set(["", "-", "—", "не вказано", "немає", "нема", "n/a", "none"]);

export function isSizeParamName(name: string): boolean {
  return SIZE_PARAM_NAMES.includes(name.trim().toLowerCase());
}

export function isColorParamName(name: string): boolean {
  return COLOR_PARAM_NAMES.includes(name.trim().toLowerCase());
}

function canonicalAlpha(token: string): string | null {
  const upper = foldLookalikes(token).toUpperCase();
  return upper in ALPHA_POSITIONS ? upper : null;
}

function alphaSize(raw: string): NormalizedSize | null {
  const parts = raw.split("/");
  if (parts.length > 2) return null;
  const canonical = parts.map((part) => canonicalAlpha(part.trim()));
  if (canonical.some((part) => part === null)) return null;
  const label = canonical.join("/");
  return {
    key: label,
    label,
    cls: "alpha",
    rank: [0, ALPHA_POSITIONS[canonical[0] as string], canonical[1] ? ALPHA_POSITIONS[canonical[1]] : -1],
  };
}

function numericSize(raw: string): NormalizedSize | null {
  const match = /^(\d{1,3}(?:[.,]\d)?)(?:\s*([/–-])\s*(\d{1,3}(?:[.,]\d)?))?$/.exec(raw);
  if (!match) return null;
  // Sizes never carry a leading zero; "04" is a colour code, not a size.
  if (/^0\d/.test(match[1]) || (match[3] && /^0\d/.test(match[3]))) return null;
  const first = parseFloat(match[1].replace(",", "."));
  const second = match[3] ? parseFloat(match[3].replace(",", ".")) : -1;
  if (first <= 0) return null;
  const separator = match[2] === "/" ? "/" : "-";
  const label = match[3] ? `${match[1]}${separator}${match[3]}` : match[1];
  return { key: label.replace(",", "."), label, cls: "numeric", rank: [1, first, second] };
}

function braSize(raw: string): NormalizedSize | null {
  const match = /^(\d{2,3})\s?([A-H]{1,2})$/.exec(foldLookalikes(raw).toUpperCase());
  if (!match) return null;
  const label = `${match[1]}${match[2]}`;
  return { key: label, label, cls: "bra", rank: [2, Number(match[1]), match[2].charCodeAt(0) * 10 + match[2].length] };
}

const DIMENSION_UNITS = /\s|см|cm|\.$/gi;

function dimensionSize(raw: string): NormalizedSize | null {
  // Units are removed before folding lookalikes: folding would turn "см" into "cм".
  const compact = foldLookalikes(raw.replace(DIMENSION_UNITS, ""))
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/,/g, ".");
  const match = /^(\d{1,4}(?:\.\d+)?)x(\d{1,4}(?:\.\d+)?)(?:x(\d{1,4}(?:\.\d+)?))?$/.exec(compact);
  if (!match) return null;
  const parts = [match[1], match[2], match[3]].filter(Boolean);
  return {
    key: parts.join("x"),
    label: `${parts.join("×")} см`,
    cls: "dimension",
    rank: [3, Number(match[1]), Number(match[2])],
  };
}

/** A width×height token found in free text, e.g. "140x220" in a curtain name. */
export function dimensionFromText(text: string): NormalizedSize | null {
  for (const token of text.split(/\s+/)) {
    if (/^\d{2,4}[xх×]\d{2,4}/i.test(token)) {
      const size = dimensionSize(token.replace(/[,;()]/g, ""));
      if (size) return size;
    }
  }
  return null;
}

function oneSize(raw: string): NormalizedSize | null {
  if (!/^(one\s?size|onesize|os|універсальний|єдиний розмір)$/i.test(raw)) return null;
  return { key: "ONE", label: "One Size", cls: "onesize", rank: [4, 0, 0] };
}

/**
 * Parses a token that must be a size on its own (an article-number segment).
 * Returns null for anything that is not unmistakably a size.
 */
export function parseSizeToken(token: string): NormalizedSize | null {
  const raw = token.trim();
  if (raw.length === 0 || raw.length > 14) return null;
  return oneSize(raw) ?? alphaSize(raw) ?? braSize(raw) ?? dimensionSize(raw) ?? numericSize(raw);
}

/** Normalizes a free-form size value coming from a product param. */
export function normalizeSize(value: string | null | undefined): NormalizedSize | null {
  if (value == null) return null;
  let raw = collapseWhitespace(String(value).replace(/_/g, " "));
  if (EMPTY_VALUES.has(raw.toLowerCase())) return null;

  // "зріст моделі 185 , розмір M" -> "M"
  const embedded = /розмір\s+(\S+)$/i.exec(raw);
  if (embedded) raw = embedded[1];

  const strict = parseSizeToken(raw.replace(/\s*([/–-])\s*/g, "$1"));
  if (strict) return strict;

  return { key: raw.toLowerCase(), label: raw, cls: "other", rank: [5, 0, 0] };
}

export function compareSizes(a: NormalizedSize | null, b: NormalizedSize | null): number {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  for (let index = 0; index < 3; index++) {
    if (a.rank[index] !== b.rank[index]) return a.rank[index] - b.rank[index];
  }
  return a.label.localeCompare(b.label, "uk");
}

/* -------------------------------------------------------------------------- */
/*                                   Colours                                  */
/* -------------------------------------------------------------------------- */

/** Ukrainian colour word stems -> CSS colour. Order matters: first match wins. */
const COLOR_STEMS: [RegExp, string][] = [
  [/темно[\s-]?син|navy/, "#1e2a52"],
  [/темно[\s-]?зелен/, "#1f4d36"],
  [/темно[\s-]?сір|графіт|антрацит/, "#4a4f57"],
  [/світло[\s-]?син|блакит|голуб|небесн/, "#8ec5ea"],
  [/світло[\s-]?сір/, "#d5d8dc"],
  [/світло[\s-]?беж|кремов|айворі|молочн|ivory/, "#f1e7d3"],
  [/світло[\s-]?рожев|пудр/, "#f6cfd6"],
  [/чорн|black/, "#151515"],
  [/біл|white/, "#ffffff"],
  [/сір|сіро|grey|gray/, "#9aa0a6"],
  [/син|blue/, "#1f5fa8"],
  [/бірюз|м'ятн|мятн|mint/, "#5cc6b8"],
  [/хакі|оливк|khaki/, "#7a7a4d"],
  [/салат|лайм/, "#a8d45a"],
  [/зелен|green/, "#2f8f4e"],
  [/бордо|вишн|марсал/, "#6d1f2b"],
  [/червон|red/, "#cf2a2a"],
  [/корал|лосос|персик/, "#f4927a"],
  [/рожев|pink|rose/, "#ee8fb0"],
  [/фіолет|бузк|лаванд|пурпур|purple/, "#8b62c4"],
  [/гірчич|mustard/, "#c99a1c"],
  [/жовт|yellow/, "#f4cf2b"],
  [/помаранч|оранж|orange/, "#f08a24"],
  [/беж|пісочн|beige|sand/, "#d9c3a1"],
  [/коричн|шоколад|кавов|brown/, "#6b4a35"],
  [/золот|gold/, "#c9a44c"],
  [/срібл|silver/, "#c4c8cc"],
];

function swatchFor(label: string): string[] {
  const parts = label.toLowerCase().split(/[/+,]|\sі\s|\sта\s/).map((part) => part.trim()).filter(Boolean);
  const colors: string[] = [];
  for (const part of parts) {
    const hit = COLOR_STEMS.find(([pattern]) => pattern.test(part));
    if (hit && !colors.includes(hit[1])) colors.push(hit[1]);
    if (colors.length === 3) break;
  }
  return colors;
}

export function normalizeColor(value: string | null | undefined): NormalizedColor | null {
  if (value == null) return null;
  const raw = collapseWhitespace(String(value).replace(/_/g, " "));
  if (EMPTY_VALUES.has(raw.toLowerCase())) return null;
  return { key: raw.toLowerCase(), label: capitalize(raw.toLowerCase()), swatch: swatchFor(raw) };
}

/* -------------------------------------------------------------------------- */
/*                                   Params                                   */
/* -------------------------------------------------------------------------- */

function findParam(params: ProductParam[], names: string[]): string | null {
  for (const name of names) {
    const hit = params.find((param) => param.name?.trim().toLowerCase() === name && param.value);
    if (hit) return hit.value;
  }
  return null;
}

export function sizeFromParams(params: ProductParam[]): NormalizedSize | null {
  return normalizeSize(findParam(params, SIZE_PARAM_NAMES));
}

export function colorFromParams(params: ProductParam[]): NormalizedColor | null {
  return normalizeColor(findParam(params, COLOR_PARAM_NAMES));
}

/**
 * Value of a param as the catalog filters see it. Sizes and colours are
 * normalized so that "М"/"M" or "чорний"/"Чорний" count as one facet value.
 */
export function facetValue(name: string, value: string): string {
  if (isSizeParamName(name)) return normalizeSize(value)?.label ?? value;
  if (isColorParamName(name)) return normalizeColor(value)?.label ?? value;
  return value;
}
