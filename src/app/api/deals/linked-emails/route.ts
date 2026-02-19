import { NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function GET() {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/deals/linked-emails`, {
      headers: {
        Authorization: `Bearer ${BRIDGE_SECRET}`,
      },
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: data.error || "Failed to fetch linked emails" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Linked emails error:", error);
    return NextResponse.json(
      { error: "Failed to fetch linked emails" },
      { status: 500 }
    );
  }
}
