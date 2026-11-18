import { type NextRequest, NextResponse } from "next/server"
import { NovaPoshtaUnavailable, getWarehouses, isRef, novaPoshtaConfigured } from "../novaposhta"

// Public: the checkout warehouse picker calls it as a guest.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const cityRef = body?.cityRef

  if (!isRef(cityRef)) {
    return NextResponse.json({ success: false, error: "City reference is required" }, { status: 400 })
  }
  if (!(await novaPoshtaConfigured())) {
    return NextResponse.json({ success: false, error: "Довідник Нової пошти недоступний" }, { status: 503, headers: { "Cache-Control": "no-store" } })
  }

  try {
    const data = await getWarehouses(cityRef)
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "private, max-age=600" } })
  } catch (error) {
    console.error("[nova] warehouses:", error instanceof Error ? error.message : error)
    const status = error instanceof NovaPoshtaUnavailable ? 503 : 502
    return NextResponse.json({ success: false, error: "Не вдалося отримати список відділень" }, { status, headers: { "Cache-Control": "no-store" } })
  }
}
