import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

async function bridgeFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BRIDGE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${BRIDGE_SECRET}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Bridge API error: ${res.status}`);
  }
  return res.json();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") || "pipeline";

  try {
    if (view === "inbox") {
      const data = await bridgeFetch("/api/deals/inbox");
      return NextResponse.json(data);
    }
    
    const data = await bridgeFetch("/api/deals/pipeline");
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch deals:", error);
    return NextResponse.json(
      { error: "Failed to fetch deals" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "draft") {
      const data = await bridgeFetch("/api/deals/draft", {
        method: "POST",
        body: JSON.stringify(body),
      });
      return NextResponse.json(data);
    }

    if (action === "create") {
      // Create a deal from an email (manual)
      const data = await bridgeFetch("/api/deals/create", {
        method: "POST",
        body: JSON.stringify(body),
      });
      return NextResponse.json(data);
    }

    if (action === "update") {
      // Update deal stage, add deadline, etc.
      const data = await bridgeFetch("/api/deals/update", {
        method: "PUT",
        body: JSON.stringify(body),
      });
      return NextResponse.json(data);
    }

    if (action === "delete") {
      const data = await bridgeFetch("/api/deals/delete", {
        method: "DELETE",
        body: JSON.stringify(body),
      });
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Deals action failed:", error);
    return NextResponse.json(
      { error: "Action failed" },
      { status: 500 }
    );
  }
}
