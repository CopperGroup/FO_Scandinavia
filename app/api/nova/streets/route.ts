import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { cityRef, searchString = "" } = await req.json()

  if (!cityRef) {
    return NextResponse.json({ success: false, error: "City reference is required" }, { status: 400 })
  }

  try {
    const res = await fetch("https://api.novaposhta.ua/v2.0/json/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: process.env.NOVA_POSHTA_API_KEY,
        modelName: "Address",
        calledMethod: "getStreet",
        methodProperties: {
          CityRef: cityRef,
          FindByString: searchString,
        },
      }),
      cache: "no-store", // Disable caching to avoid the 2MB cache limit error
    })

    const data = await res.json()

    // Return with cache control headers
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    })
  } catch (error) {
    console.error("Error fetching streets:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch streets" }, { status: 500 })
  }
}
