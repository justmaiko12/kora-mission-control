import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_TOKEN = process.env.KORA_BRIDGE_TOKEN || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, account, feedback, email } = body;

    if (!id || !feedback) {
      return NextResponse.json(
        { error: "id and feedback required" },
        { status: 400 }
      );
    }

    // Forward to Bridge API
    const res = await fetch(`${BRIDGE_URL}/api/emails/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BRIDGE_TOKEN}`,
      },
      body: JSON.stringify({ id, account, feedback, email }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Bridge API error:", error);
      return NextResponse.json(
        { error: "Failed to save feedback" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Email feedback error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
