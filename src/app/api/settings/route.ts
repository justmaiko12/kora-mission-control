import { NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function GET() {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/settings`, {
      headers: {
        Authorization: `Bearer ${BRIDGE_SECRET}`,
      },
      cache: "no-store",
    });
    
    if (!res.ok) {
      return NextResponse.json({ emailTabNames: {} });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Settings fetch error:", error);
    return NextResponse.json({ emailTabNames: {} });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    
    const res = await fetch(`${BRIDGE_URL}/api/settings`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${BRIDGE_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
      throw new Error("Bridge API error");
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
