import { NextRequest, NextResponse } from "next/server";
import { logAction } from "@/lib/actionLogger";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || process.env.KORA_BRIDGE_TOKEN || "";

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

    // Log the feedback action for ML Ops tracking
    let actionId: string | undefined;
    try {
      actionId = await logAction({
        agentId: "mission-control",
        actionType: "email_feedback",
        inputContext: {
          email_id: id,
          account: account || null,
          feedback_type: feedback,
          email_subject: email?.subject || null,
        },
      });
    } catch (logError) {
      console.warn("[email feedback] Could not log action:", logError);
      // Don't fail the API response if logging fails
    }

    // Forward to Bridge API
    const res = await fetch(`${BRIDGE_URL}/api/emails/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BRIDGE_SECRET}`,
      },
      body: JSON.stringify({ id, account, feedback, email }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Bridge API error:", error);
      return NextResponse.json(
        { error: "Failed to save feedback", actionId },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ ...data, actionId });
  } catch (error) {
    console.error("Email feedback error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
