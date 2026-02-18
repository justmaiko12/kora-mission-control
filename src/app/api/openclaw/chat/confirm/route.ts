import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { command, account } = body;

    if (!command || !account) {
      return NextResponse.json({ error: "command and account required" }, { status: 400 });
    }

    const res = await fetch(`${BRIDGE_URL}/api/chat/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BRIDGE_SECRET}`,
      },
      body: JSON.stringify({ command, account }),
    });

    if (!res.ok) {
      const error = await res.json();
      return NextResponse.json(
        { error: error.error || "Failed to confirm action" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Confirm action error:", error);
    return NextResponse.json(
      { error: "Failed to confirm action" },
      { status: 500 }
    );
  }
}
