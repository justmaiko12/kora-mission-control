import { NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const res = await fetch(`${BRIDGE_URL}/api/emails/score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BRIDGE_SECRET}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Score API error:", error);
    return NextResponse.json(
      { error: "Failed to score emails" },
      { status: 500 }
    );
  }
}
