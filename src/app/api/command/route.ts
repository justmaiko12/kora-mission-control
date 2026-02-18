import { NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function POST(req: Request) {
  try {
    const { command, context } = await req.json();

    if (!command) {
      return NextResponse.json({ error: "Command required" }, { status: 400 });
    }

    // Route command to Bridge API chat (which handles email commands directly)
    const res = await fetch(`${BRIDGE_URL}/api/chat/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BRIDGE_SECRET}`,
      },
      body: JSON.stringify({
        message: command,
        chatContext: context || "general",
        userId: "michael",
      }),
    });

    const data = await res.json();

    // Log the command to activity
    try {
      await fetch(`${BRIDGE_URL}/api/activity/log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BRIDGE_SECRET}`,
        },
        body: JSON.stringify({
          type: "command",
          action: command,
          details: data.response || "Executed",
          context,
        }),
      });
    } catch (logErr) {
      console.warn("Failed to log activity:", logErr);
    }

    return NextResponse.json({
      success: true,
      result: data.response,
      command,
    });
  } catch (error) {
    console.error("Command error:", error);
    return NextResponse.json(
      { error: "Command failed" },
      { status: 500 }
    );
  }
}
