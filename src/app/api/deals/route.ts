import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") || "pipeline";
  const account = searchParams.get("account"); // e.g., "business@shluv.com"

  try {
    // TODO: Connect to Notion Outreach Pipeline DB for real deals
    // For now, return empty pipeline structure
    
    if (view === "inbox") {
      return NextResponse.json({ deals: { inbox: [] } });
    }
    
    // Pipeline view (grouped by status)
    const pipeline = {
      prospecting: [],
      negotiation: [],
      won: [],
      lost: [],
    };
    
    return NextResponse.json({ deals: pipeline });
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

    // TODO: Implement actual deal actions with Notion integration
    // For now, return success stub
    
    if (action === "draft") {
      return NextResponse.json({ success: true, deal: { ...body } });
    }

    if (action === "create") {
      return NextResponse.json({ success: true, deal: { id: `deal-${Date.now()}`, ...body } });
    }

    if (action === "update" || action === "updateStatus") {
      return NextResponse.json({ success: true, updated: true });
    }

    if (action === "delete") {
      return NextResponse.json({ success: true, deleted: true });
    }

    if (action === "link") {
      return NextResponse.json({ success: true, linked: true });
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
