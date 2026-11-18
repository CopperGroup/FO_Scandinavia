import { parseSizeToken } from "./attributes";
import type { NormalizedSize } from "./types";

/**
 * Article numbers in the feeds follow a handful of conventions:
 *
 *   1354663001-XS          base + size
 *   1518326-18-44          model + colour code + size
 *   619494-0168r-34/36     model + colour code (+ re-listing marker) + size
 *   475563089-XXS-m        base + size + audience marker
 *   8537278_white-XS       model _ colour + size
 *   gille_saffran_300      a plain SKU with no variants
 *
 * The size is always the last dash-separated segment (optionally followed by a
 * one-letter audience marker). Everything before it identifies the item in a
 * given colour and is called the stem.
 */
export type ParsedArticle = {
  raw: string;
  /** Article number without the size segment. Identifies a variant group. */
  stem: string;
  /** Size encoded in the article number, when there is one. */
  size: NormalizedSize | null;
  /** The raw size segment as written, e.g. "XS" or "34/36". */
  sizeSegment: string | null;
  /** Audience marker that follows the size ("m", "w"), kept as part of the identity. */
  marker: string | null;
};

const MIN_STEM_LENGTH = 5;
const AUDIENCE_MARKER = /^[mwuk]$/;

export function parseArticle(articleNumber: string | null | undefined): ParsedArticle {
  const raw = (articleNumber ?? "").trim();
  const plain: ParsedArticle = { raw, stem: raw, size: null, sizeSegment: null, marker: null };
  if (raw.length === 0) return plain;

  const segments = raw.split("-");
  if (segments.length < 2) return plain;

  let marker: string | null = null;
  let sizeIndex = segments.length - 1;

  // "475563089-XXS-m": a lower-case marker after a size segment.
  if (
    segments.length >= 3 &&
    AUDIENCE_MARKER.test(segments[sizeIndex]) &&
    parseSizeToken(segments[sizeIndex - 1]) !== null
  ) {
    marker = segments[sizeIndex];
    sizeIndex -= 1;
  }

  const sizeSegment = segments[sizeIndex];
  const size = parseSizeToken(sizeSegment);
  if (!size) return plain;

  const stem = segments.slice(0, sizeIndex).join("-");
  if (stem.length < MIN_STEM_LENGTH || !/\d/.test(stem)) return plain;

  return { raw, stem, size, sizeSegment, marker };
}

/**
 * Identity shared by the colour variants of one model, derived from the stem.
 * Returns null when the stem does not follow a recognisable model/colour layout.
 */
export function modelStemOf(stem: string): string | null {
  const value = stem.trim();

  // "1518326-18", "619494-0168r", "20101801-151308"
  const dashed = value.split("-");
  if (dashed.length >= 2) {
    const model = dashed.slice(0, -1).join("-");
    return model.length >= MIN_STEM_LENGTH && /^\d/.test(model) ? model : null;
  }

  // "8537278_white"
  const underscored = /^(\d{5,})_[a-zа-яіїє]+$/i.exec(value);
  if (underscored) return underscored[1];

  // "1354663001", "475563089", "1129809015r": the last three digits are the colour.
  const numeric = /^(\d{6,7})\d{3}r?$/.exec(value);
  if (numeric) return numeric[1];

  return null;
}
