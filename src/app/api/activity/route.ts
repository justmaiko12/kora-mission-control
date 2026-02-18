import { NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function GET() {
  try {
    // Get activity from Bridge API
    const res = await fetch(`${BRIDGE_URL}/api/activity/log`, {
      headers: { Authorization: `Bearer ${BRIDGE_SECRET}` },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    // Fallback to empty
    return NextResponse.json({ activities: [] });
  } catch (error) {
    console.error("Activity fetch error:", error);
    return NextResponse.json({ activities: [] });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Log activity to Bridge API
    const res = await fetch(`${BRIDGE_URL}/api/activity/log`, {
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
    console.error("Activity log error:", error);
    return NextResponse.json({ error: "Failed to log activity" }, { status: 500 });
  }
}
