import { NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function POST(req: Request) {
  try {
    const { command, context, emailAccount, visibleEmails } = await req.json();

    if (!command) {
      return NextResponse.json({ error: "Command required" }, { status: 400 });
    }

    // Build context-aware message
    let contextMessage = command;
    if (context === "email" && visibleEmails?.length > 0) {
      const emailList = visibleEmails
        .slice(0, 15)
        .map((e: { from: string; subject: string }, i: number) => `${i + 1}. From: ${e.from} | Subject: ${e.subject}`)
        .join("\n");
      contextMessage = `User is looking at ${emailAccount || "their inbox"} with these emails:\n${emailList}\n\nUser says: "${command}"\n\nHelp them manage these emails. If they want to archive/delete/spam, tell them which specific senders or patterns to target.`;
    }

    // Route command to Bridge API chat
    const res = await fetch(`${BRIDGE_URL}/api/chat/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BRIDGE_SECRET}`,
      },
      body: JSON.stringify({
        message: contextMessage,
        chatContext: context || "general",
        userId: "michael",
        account: emailAccount,
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
