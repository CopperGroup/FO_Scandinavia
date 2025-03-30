import { NextRequest, NextResponse } from "next/server";
import { transform } from "@babel/standalone";
import { redis } from "@/lib/redis";
import React from "react";

export async function POST(req: NextRequest) {
  try {
    const { jsxString, imports } = await req.json();
    const cacheKey = `jsx-landing`;

    // Check if cached in Redis
    let compiledCode = await redis.get(cacheKey);
    if (!compiledCode) {
      compiledCode = transform(`() => { ${jsxString} }`, { presets: ["react"] }).code;
      await redis.set(cacheKey, compiledCode, { ex: 60 * 60 * 24 }); // Cache for 24 hours
    }

    return NextResponse.json({ compiledCode });
  } catch (error) {
    return NextResponse.json({ error: "Failed to compile JSX" }, { status: 500 });
  }
}
