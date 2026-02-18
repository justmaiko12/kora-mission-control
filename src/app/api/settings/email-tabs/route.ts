import { NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    const res = await fetch(`${BRIDGE_URL}/api/settings/email-tabs`, {
      method: "PUT",
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
    console.error("Email tabs update error:", error);
    return NextResponse.json({ error: "Failed to update tab names" }, { status: 500 });
  }
}
