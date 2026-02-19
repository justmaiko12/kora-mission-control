import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_TOKEN = process.env.KORA_BRIDGE_TOKEN || "";

// GET /api/chat-history?context=email
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const context = searchParams.get("context") || "general";

  try {
    const res = await fetch(`${BRIDGE_URL}/api/chat-history/${context}`, {
      headers: { Authorization: `Bearer ${BRIDGE_TOKEN}` },
    });

    if (!res.ok) {
      return NextResponse.json({ messages: [] });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Chat history fetch error:", error);
    return NextResponse.json({ messages: [] });
  }
}

// POST /api/chat-history - Save or append messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { context, messages, message, append } = body;

    if (!context) {
      return NextResponse.json({ error: "context required" }, { status: 400 });
    }

    const endpoint = append
      ? `${BRIDGE_URL}/api/chat-history/${context}/append`
      : `${BRIDGE_URL}/api/chat-history/${context}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BRIDGE_TOKEN}`,
      },
      body: JSON.stringify(append ? { message } : { messages }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Chat history save error:", error);
      return NextResponse.json({ error: "Failed to save" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Chat history error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// DELETE /api/chat-history?context=email
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const context = searchParams.get("context");

  if (!context) {
    return NextResponse.json({ error: "context required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${BRIDGE_URL}/api/chat-history/${context}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${BRIDGE_TOKEN}` },
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Chat history delete error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
