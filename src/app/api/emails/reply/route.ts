import { NextRequest, NextResponse } from "next/server";
import { updateEmailState } from "@/lib/emailStateService";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      account,
      to,
      cc,
      bcc,
      subject,
      body: emailBody,
      threadId,
      messageId,
      attachments,
    } = body;

    if (!account || !to || !emailBody) {
      return NextResponse.json(
        { error: "account, to, and body are required" },
        { status: 400 }
      );
    }

    // Send reply via bridge
    const res = await fetch(`${BRIDGE_URL}/api/email/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BRIDGE_SECRET}`,
      },
      body: JSON.stringify({
        account,
        to,
        cc,
        bcc,
        subject,
        body: emailBody,
        threadId,
        attachments,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to send reply", details: data.details },
        { status: res.status }
      );
    }

    // After successful reply, update email state to "awaiting"
    const idToUpdate = messageId || threadId;
    if (idToUpdate && account) {
      await updateEmailState(idToUpdate, account, "awaiting", {
        threadId,
        subject,
      }).catch((err) =>
        console.warn("[reply] Could not update email state:", err)
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Email reply error:", error);
    return NextResponse.json(
      { error: "Failed to send reply" },
      { status: 500 }
    );
  }
}
