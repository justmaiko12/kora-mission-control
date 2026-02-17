import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // TODO: Connect to OpenClaw gateway WebSocket
    // For now, return a placeholder response
    
    return NextResponse.json({
      success: true,
      response: {
        content: `Received: "${message}". OpenClaw integration coming soon! 🦞`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}