import { NextResponse } from "next/server";
import { fetchCatalog } from "@/lib/actions/redis/catalog.actions";
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await fetchCatalog();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching catalog:", error);
    return NextResponse.json({ error: "Failed to fetch catalog" }, { status: 500 });
  }
}
