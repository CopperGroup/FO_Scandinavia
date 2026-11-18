import { DEFAULT_QUALITY, PHOTO_QUALITIES, isResizable, photoUrl } from "./request";

/**
 * Where next/image takes a picture from when the shop's own photo route is
 * switched on (NEXT_PUBLIC_PHOTO_ROUTE=on at build time, see next.config.mjs).
 */
export default function photoLoader({ src, width, quality }: { src: string; width: number; quality?: number }): string {
  if (!isResizable(src)) return src;
  // Only the qualities the route serves; anything else would be refused there.
  return photoUrl(src, width, quality && PHOTO_QUALITIES.includes(quality) ? quality : DEFAULT_QUALITY);
}
