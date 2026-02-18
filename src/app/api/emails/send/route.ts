import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { account, to, subject, body: emailBody, threadId } = body;

    if (!account || !to || !emailBody) {
      return NextResponse.json(
        { error: "Missing required fields: account, to, body" },
        { status: 400 }
      );
    }

    const res = await fetch(`${BRIDGE_URL}/api/email/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${BRIDGE_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account,
        to,
        subject,
        body: emailBody,
        threadId,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Bridge API error: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send email" },
      { status: 500 }
    );
  }
}
