import { NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function GET() {
  try {
    // Fetch cron jobs from Bridge API
    const res = await fetch(`${BRIDGE_URL}/api/automations`, {
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
    console.error("Automations fetch error:", error);
    return NextResponse.json({ jobs: [], error: "Failed to fetch" }, { status: 500 });
  }
}
