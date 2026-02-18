import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");

  try {
    // Fetch from Bridge API
    const endpoint = path 
      ? `${BRIDGE_URL}/api/memory/${encodeURIComponent(path)}`
      : `${BRIDGE_URL}/api/memory/`;
    
    const res = await fetch(endpoint, {
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
    console.error("Memory API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch memory files" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Path required" }, { status: 400 });
  }

  try {
    const body = await request.json();
    
    const res = await fetch(`${BRIDGE_URL}/api/memory/${encodeURIComponent(path)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${BRIDGE_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Bridge API error: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Memory API error:", error);
    return NextResponse.json(
      { error: "Failed to update memory file" },
      { status: 500 }
    );
  }
}
