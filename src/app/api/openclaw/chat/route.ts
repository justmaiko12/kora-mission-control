import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, context, chatContext } = body;

    if (!message) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    // Send message to Bridge API chat queue
    const sendRes = await fetch(`${BRIDGE_URL}/api/chat/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BRIDGE_SECRET}`,
      },
      body: JSON.stringify({
        message,
        context,
        chatContext,
        userId: "michael",
      }),
    });

    if (!sendRes.ok) {
      const error = await sendRes.json();
      return NextResponse.json(
        { error: error.error || "Failed to send message" },
        { status: sendRes.status }
      );
    }

    const sendData = await sendRes.json();
    const messageId = sendData.messageId;

    // Poll for response (with timeout)
    const startTime = Date.now();
    const timeout = 30000; // 30 seconds max wait
    const pollInterval = 500; // Check every 500ms

    while (Date.now() - startTime < timeout) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const checkRes = await fetch(
        `${BRIDGE_URL}/api/chat/response/${messageId}`,
        {
          headers: {
            Authorization: `Bearer ${BRIDGE_SECRET}`,
          },
        }
      );

      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.found) {
          return NextResponse.json({
            response: checkData.response,
            messageId,
          });
        }
      }
    }

    // Timeout - return acknowledgment
    return NextResponse.json({
      response:
        "I got your message! I'm a bit busy right now but I'll get back to you shortly. Check Telegram for my response 💜",
      messageId,
      timeout: true,
    });
  } catch (error) {
    console.error("OpenClaw chat error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}

// Get recent responses
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since");

    const url = since
      ? `${BRIDGE_URL}/api/chat/responses?since=${encodeURIComponent(since)}`
      : `${BRIDGE_URL}/api/chat/responses`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${BRIDGE_SECRET}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch responses" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch chat responses:", error);
    return NextResponse.json(
      { error: "Failed to fetch responses" },
      { status: 500 }
    );
  }
}
