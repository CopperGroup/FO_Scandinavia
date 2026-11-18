import { isResizable, photoUrl } from "../photo/request";

/** Whether pictures come from the shop's own photo route (/img) or from Next's (see next.config.mjs). */
const OWN_PHOTO_ROUTE = process.env.NEXT_PUBLIC_PHOTO_ROUTE === "on";

/** A thumbnail at one fixed width (a srcset of 11 widths per 36px picture made the orders page 280 KB). */
export function thumbnailUrl(src: string | undefined | null, width: 64 | 96 | 160 = 96): string {
  if (!src) return "";
  if (OWN_PHOTO_ROUTE) return isResizable(src) ? photoUrl(src, width) : src;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
}
