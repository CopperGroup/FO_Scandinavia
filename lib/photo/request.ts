import config from "./config.json";

/**
 * Addresses of resized photos: /img?url=<photo>&w=<width>&q=<quality>.
 *
 * Only the sizes the shop's pages ask for, and only photos from the shop's own
 * storage (and the sites old products were imported from) or from the public
 * folder, are accepted. Anything else is refused before any work is done, so
 * the address cannot be used to fetch other sites or to fill the disk with
 * endless variants.
 */

export const PHOTO_ROUTE = "/img";
export const PHOTO_WIDTHS: readonly number[] = [...config.imageSizes, ...config.deviceSizes];
export const PHOTO_QUALITIES: readonly number[] = config.qualities;
export const DEFAULT_QUALITY = 75;

const LOCAL_EXTENSIONS = /\.(jpe?g|png|webp|avif)$/i;
/** Parts of the site a "local picture" may never point at. */
const NOT_PICTURES = /^\/(_next|img|api|admin)(\/|$)/i;

export type PhotoSource = { kind: "remote"; url: string } | { kind: "local"; path: string };
export type PhotoFormat = "webp" | "original";
export type PhotoRequest = { source: PhotoSource; width: number; quality: number; format: PhotoFormat };

/** The address of a photo at one width. */
export function photoUrl(src: string, width: number, quality: number = DEFAULT_QUALITY): string {
  return `${PHOTO_ROUTE}?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}

/** Pictures that are never resized: vector files and pictures that are not addresses at all. */
export function isResizable(src: string): boolean {
  return !(src.startsWith("data:") || src.startsWith("blob:") || /\.svg($|[?#])/i.test(src));
}

function allowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return config.hosts.includes(host) || config.hostSuffixes.some((suffix) => host.endsWith(suffix) && host.length > suffix.length);
}

export function parsePhotoSource(raw: string): PhotoSource | null {
  if (!raw || raw.length > 2000 || /[\u0000-\u001f\\]/.test(raw)) return null;

  if (raw.startsWith("/")) {
    if (raw.startsWith("//")) return null;
    const pathname = raw.split(/[?#]/, 1)[0];
    let decoded: string;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      return null;
    }
    if (decoded.split("/").some((part) => part === ".." || part === ".") || /[\u0000-\u001f\\]/.test(decoded)) return null;
    if (NOT_PICTURES.test(decoded) || !LOCAL_EXTENSIONS.test(decoded)) return null;
    return { kind: "local", path: decoded };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  if (!allowedHost(url.hostname)) return null;
  return { kind: "remote", url: url.toString() };
}

/** Reads the query of a photo address. Null when it asks for something the shop does not serve. */
export function parsePhotoRequest(params: URLSearchParams, accept: string | null): PhotoRequest | null {
  const width = Number(params.get("w"));
  const quality = Number(params.get("q") ?? DEFAULT_QUALITY);
  if (!PHOTO_WIDTHS.includes(width) || !PHOTO_QUALITIES.includes(quality)) return null;

  const source = parsePhotoSource(params.get("url") ?? "");
  if (!source) return null;

  // Every current browser takes WebP; the few clients that do not get the photo in its own format.
  const format: PhotoFormat = /image\/webp/i.test(accept ?? "") ? "webp" : "original";
  return { source, width, quality, format };
}

/** Where the browser is sent when the resized photo cannot be made in time: the photo as it was uploaded. */
export function originalAddress(source: PhotoSource): string {
  return source.kind === "remote" ? source.url : source.path;
}
