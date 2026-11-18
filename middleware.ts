import { withAuth, NextRequestWithAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

const STAFF = ["Admin", "Owner"]

/** Set on a storefront request made by the page editor's preview frame; lib/content/server.ts reads it. */
const PREVIEW_HEADER = "x-content-preview"
/** Which draft that preview shows: the key of the page (or "variables") open in the editor. */
const DRAFT_HEADER = "x-content-draft"

/**
 * First gate of the admin panel: no session → sign-in page; a session without
 * a staff role → the shop's home page. The role in the token can be weeks
 * old, so the admin layout and every admin server action check the role in
 * the database again (lib/auth/guards.ts).
 *
 * It also marks the requests of the page editor's preview frame (a storefront
 * address with ?preview=1&draft=<page>): those show the texts being edited on
 * that page instead of the saved ones. The mark is only a request; the server shows a draft to nobody
 * but a signed-in administrator.
 */
export default withAuth(
    function middleware(request: NextRequestWithAuth) {
        const staff = STAFF.includes(request.nextauth.token?.role || "User")

        if (request.nextUrl.pathname.startsWith("/admin")) {
            if (!staff) return NextResponse.rewrite(new URL("/", request.url))
            return
        }

        // A storefront page opened with ?preview=1.
        const headers = new Headers(request.headers)
        const draft = request.nextUrl.searchParams.get("draft") ?? ""
        headers.delete(PREVIEW_HEADER)
        headers.delete(DRAFT_HEADER)
        if (staff) {
            headers.set(PREVIEW_HEADER, "1")
            if (/^[a-z]{1,20}$/.test(draft)) headers.set(DRAFT_HEADER, draft)
        }
        return NextResponse.next({ request: { headers } })
    },
    {
        callbacks: {
            // Only the admin panel needs a session; a preview address without one is an ordinary page.
            authorized: ({ token, req }) => (req.nextUrl.pathname.startsWith("/admin") ? !!token : true),
        },
    }
)

export const config = {
    matcher: [
        "/admin/:path*",
        { source: "/((?!api|_next|admin|assets|samples|favicon).*)", has: [{ type: "query", key: "preview", value: "1" }] },
    ],
}
