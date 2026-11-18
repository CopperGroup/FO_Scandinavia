/** A thumbnail through the image optimiser at one fixed width (a srcset of 11 widths per 36px picture made the orders page 280 KB). */
export function thumbnailUrl(src: string | undefined | null, width: 64 | 96 | 160 = 96): string {
  if (!src) return "";
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
}
