import { NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function POST(req: Request) {
  try {
    const { command, context, emailAccount, visibleEmails } = await req.json();

    if (!command) {
      return NextResponse.json({ error: "Command required" }, { status: 400 });
    }

    // Send the command AND visible emails separately
    // So the email command parser can search based on the raw command
    // but also know what emails the user is looking at
    const res = await fetch(`${BRIDGE_URL}/api/chat/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BRIDGE_SECRET}`,
      },
      body: JSON.stringify({
        message: command, // Keep the command clean!
        chatContext: context || "general",
        userId: "michael",
        account: emailAccount,
        // Pass visible emails separately for context
        visibleEmails: visibleEmails?.slice(0, 15) || [],
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
