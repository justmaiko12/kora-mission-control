import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const { id, account } = await req.json();

    if (!id || !account) {
      return NextResponse.json(
        { error: "id and account are required" },
        { status: 400 }
      );
    }

    // Call Bridge API to handle unsubscribe
    const res = await fetch(`${BRIDGE_URL}/api/email/unsubscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BRIDGE_SECRET}`,
      },
      body: JSON.stringify({ id, account }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 }
    );
  }
}
