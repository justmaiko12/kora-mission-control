import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const emailId = searchParams.get("emailId");

  if (!emailId) {
    return NextResponse.json({ error: "emailId required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${BRIDGE_URL}/api/deals/by-email?emailId=${encodeURIComponent(emailId)}`, {
      headers: {
        Authorization: `Bearer ${BRIDGE_SECRET}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ deal: null });
      }
      throw new Error(`Bridge API error: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch deal by email:", error);
    return NextResponse.json({ deal: null });
  }
}
