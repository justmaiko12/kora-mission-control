import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { account, to, cc, bcc, subject, body: emailBody, threadId, attachments } = body;

    if (!account || !to || !emailBody) {
      return NextResponse.json(
        { error: "account, to, and body are required" },
        { status: 400 }
      );
    }

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
        attachments, // Array of {filename, mimeType, data (base64)}
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to send email", details: data.details },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
