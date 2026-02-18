import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "week";

    const res = await fetch(`${BRIDGE_URL}/api/usage?period=${period}`, {
      headers: {
        Authorization: `Bearer ${BRIDGE_SECRET}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Bridge API error: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Usage fetch error:", error);
    
    // Fallback to empty data
    return NextResponse.json({
      totalCost: 0,
      totalTokens: 0,
      conversations: 0,
      activity: 0,
      dailyCosts: [],
      byAgent: [{ name: "Kora", cost: 0, tokens: 0, percentage: 100 }],
      byModel: [{ name: "No data yet", cost: 0, tokens: 0, percentage: 0 }],
    });
  }
}
