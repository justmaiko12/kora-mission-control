import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const account = searchParams.get("account");

  if (!id || !account) {
    return NextResponse.json(
      { error: "id and account required" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `${BRIDGE_URL}/api/email/thread?id=${encodeURIComponent(id)}&account=${encodeURIComponent(account)}`,
      {
        headers: {
          Authorization: `Bearer ${BRIDGE_SECRET}`,
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      throw new Error(`Bridge API error: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch thread:", error);
    return NextResponse.json(
      { error: "Failed to fetch thread" },
      { status: 500 }
    );
  }
}
