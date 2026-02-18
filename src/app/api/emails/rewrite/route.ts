import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { draft, context } = body;

    if (!draft) {
      return NextResponse.json(
        { error: "draft is required" },
        { status: 400 }
      );
    }

    const res = await fetch(`${BRIDGE_URL}/api/email/rewrite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BRIDGE_SECRET}`,
      },
      body: JSON.stringify({
        draft,
        context: context || {},
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to rewrite email", details: data.details },
        { status: res.status }
      );
    }

    const rewritten =
      typeof data.rewritten === "string"
        ? data.rewritten
        : typeof data.text === "string"
          ? data.text
          : typeof data.response === "string"
            ? data.response
            : "";

    if (!rewritten) {
      return NextResponse.json(
        { error: "No rewritten text returned" },
        { status: 500 }
      );
    }

    return NextResponse.json({ rewritten });
  } catch (error) {
    console.error("Email rewrite error:", error);
    return NextResponse.json(
      { error: "Failed to rewrite email" },
      { status: 500 }
    );
  }
}
