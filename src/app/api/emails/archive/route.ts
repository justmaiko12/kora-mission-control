import { NextRequest, NextResponse } from "next/server";
import { updateEmailState } from "@/lib/emailStateService";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    const { id, account, action = "archive", email } = await request.json();

    if (!id || !account) {
      return NextResponse.json(
        { error: "id and account required" },
        { status: 400 }
      );
    }

    // Update email state in Supabase based on action
    if (action === "done") {
      await updateEmailState(id, account, "done", {
        threadId: email?.threadId,
        subject: email?.subject,
        sender: email?.from,
      });
    } else if (action === "archive" || action === "spam") {
      await updateEmailState(id, account, "archived", {
        threadId: email?.threadId,
        subject: email?.subject,
        sender: email?.from,
      });
    }
    // action === "read" → no state change, just mark read below

    // Pass email metadata to bridge for learning system
    const res = await fetch(`${BRIDGE_URL}/api/email/archive`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${BRIDGE_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, account, action, email }),
    });

    if (!res.ok) {
      throw new Error(`Bridge API error: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to archive email:", error);
    return NextResponse.json(
      { error: "Failed to archive email" },
      { status: 500 }
    );
  }
}
