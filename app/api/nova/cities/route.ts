import { NextResponse } from "next/server"
import { NovaPoshtaUnavailable, getCities, novaPoshtaConfigured } from "../novaposhta"

// Public: the checkout city picker calls it as a guest.
export const dynamic = "force-dynamic"

export async function GET() {
  if (!(await novaPoshtaConfigured())) {
    return NextResponse.json({ success: false, error: "Довідник Нової пошти недоступний" }, { status: 503, headers: { "Cache-Control": "no-store" } })
  }

  try {
    const data = await getCities()
    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } },
    )
  } catch (error) {
    console.error("[nova] cities:", error instanceof Error ? error.message : error)
    const status = error instanceof NovaPoshtaUnavailable ? 503 : 502
    return NextResponse.json({ success: false, error: "Не вдалося отримати список міст" }, { status, headers: { "Cache-Control": "no-store" } })
  }
}
