import { NextResponse, type NextRequest } from "next/server"
import { currentAdmin } from "@/lib/import/admin"
import { ImportError, downloadFeed, readLimited, registerFeed } from "@/lib/import/server"

export const dynamic = "force-dynamic"
// Downloading and parsing a large feed can take a while.
export const maxDuration = 120

/**
 * Step 1 of the XML import. Takes either a raw XML body (an uploaded file) or
 * JSON `{ url }` (the server downloads the feed), parses it and keeps it in
 * memory for the next steps. A route handler, not a server action: feeds can
 * be up to 50 MB, and a fetch does not block navigation while it runs.
 */
export async function POST(request: NextRequest) {
  const admin = await currentAdmin()
  if (!admin) return NextResponse.json({ error: "Недостатньо прав для імпорту." }, { status: 401 })

  try {
    const type = request.headers.get("content-type") ?? ""
    let bytes: Uint8Array
    let fileName: string

    if (type.includes("application/json")) {
      const body = await request.json().catch(() => null)
      const url = typeof body?.url === "string" ? body.url.slice(0, 2000) : ""
      if (!url.trim()) return NextResponse.json({ error: "Вставте посилання на файл із товарами." }, { status: 400 })
      ;({ bytes, fileName } = await downloadFeed(url))
    } else {
      const length = Number(request.headers.get("content-length")) || null
      bytes = await readLimited(request.body, length)
      const header = request.headers.get("x-file-name") ?? ""
      try {
        fileName = decodeURIComponent(header).slice(0, 200) || "feed.xml"
      } catch {
        fileName = "feed.xml"
      }
    }

    return NextResponse.json(registerFeed(bytes, fileName, admin.id), { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    if (error instanceof ImportError) return NextResponse.json({ error: error.message }, { status: 400 })
    console.error("[import] source:", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Не вдалося прочитати файл. Спробуйте ще раз; якщо не допоможе, завантажте файл з комп’ютера." }, { status: 500 })
  }
}
