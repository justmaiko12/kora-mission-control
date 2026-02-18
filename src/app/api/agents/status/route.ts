import { NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function GET() {
  try {
    // Get real activity from Bridge API
    const res = await fetch(`${BRIDGE_URL}/api/activity`, {
      headers: { Authorization: `Bearer ${BRIDGE_SECRET}` },
      cache: "no-store",
    });
    
    if (!res.ok) {
      throw new Error(`Bridge API error: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Agent status error:", error);
    
    // Fallback
    return NextResponse.json({
      sessions: [
        {
          id: "kora-main",
          name: "Kora",
          status: "idle",
          currentTask: "Connection issue",
          lastHeartbeat: new Date().toISOString(),
          progress: 0,
          type: "assistant",
        },
      ],
      activeCount: 0,
      recentCompletions: [],
      updatedAt: new Date().toISOString(),
    });
  }
}

// POST - Update activity from external sources
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const res = await fetch(`${BRIDGE_URL}/api/activity/${body.endpoint || 'kora'}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BRIDGE_SECRET}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Activity update error:", error);
    return NextResponse.json({ error: "Failed to update activity" }, { status: 500 });
  }
}
