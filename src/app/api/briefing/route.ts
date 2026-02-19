import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function GET() {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/briefing`, {
      headers: {
        Authorization: `Bearer ${BRIDGE_SECRET}`,
      },
      next: { revalidate: 60 }, // Cache for 1 minute
    });

    if (!res.ok) {
      throw new Error(`Bridge API error: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Briefing fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch briefing" },
      { status: 500 }
    );
  }
}
