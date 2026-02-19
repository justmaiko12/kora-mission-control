import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { module, itemId, itemTitle, feedback, notes } = body;

    if (!module) {
      return NextResponse.json(
        { error: "module is required" },
        { status: 400 }
      );
    }

    const res = await fetch(`${BRIDGE_URL}/api/briefing/${module}/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BRIDGE_SECRET}`,
      },
      body: JSON.stringify({ itemId, itemTitle, feedback, notes }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Briefing feedback error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
