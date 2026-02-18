import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Send to Bridge API which will forward to OpenClaw
    const res = await fetch(`${BRIDGE_URL}/api/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${BRIDGE_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        context,
        source: "mission-control",
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Bridge API error: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Failed to send message",
        // Return a fallback response so the UI still works
        response: "I received your message, but the connection to OpenClaw is having issues. Please try again or message me on Telegram directly.",
      },
      { status: 200 } // Return 200 so UI handles it gracefully
    );
  }
}
