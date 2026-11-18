import { parsePhotoRequest } from "@/lib/photo/request";
import { servePhoto } from "@/lib/photo/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MONTH_SECONDS = 60 * 60 * 24 * 30;
const DAY_SECONDS = 60 * 60 * 24;

/** A resized photo: /img?url=<photo>&w=<width>&q=<quality> (lib/photo). */
export async function GET(request: Request): Promise<Response> {
  const photo = parsePhotoRequest(new URL(request.url).searchParams, request.headers.get("accept"));
  if (!photo) return new Response("This photo address is not valid.", { status: 400, headers: { "Cache-Control": "no-store" } });

  const answer = await servePhoto(photo);

  if (answer.kind === "missing") return new Response("There is no such photo.", { status: 404, headers: { "Cache-Control": "no-store" } });

  if (answer.kind === "original") {
    // Not kept by the browser: the next request gets the resized copy as soon as it exists.
    return new Response(null, { status: 302, headers: { Location: answer.location, "Cache-Control": "no-store", "X-Photo": "original" } });
  }

  const headers = {
    "Content-Type": answer.contentType,
    "Cache-Control": answer.longLived ? `public, max-age=${MONTH_SECONDS}, immutable` : `public, max-age=${DAY_SECONDS}`,
    ETag: answer.etag,
    Vary: "Accept",
    "X-Content-Type-Options": "nosniff",
    "X-Photo": answer.made ? "made" : "ready",
  };
  if (request.headers.get("if-none-match") === answer.etag) return new Response(null, { status: 304, headers });
  return new Response(new Uint8Array(answer.body), { status: 200, headers: { ...headers, "Content-Length": String(answer.body.length) } });
}
