import { NextRequest, NextResponse } from "next/server";
import { getOAuthUrl } from "@/lib/gmailService";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const dashboard = searchParams.get("dashboard");

  try {
    // If user is trying to login, return OAuth URL
    if (action === "login") {
      const oauthUrl = getOAuthUrl();
      return NextResponse.json({ oauthUrl });
    }

    // For dashboard view, check if tokens are stored
    if (dashboard === "true") {
      // TODO: Implement token storage/retrieval from secure storage
      // For now, return empty with login prompt
      return NextResponse.json({
        authenticated: false,
        accounts: [],
        emails: [],
        loginUrl: getOAuthUrl(),
      });
    }

    return NextResponse.json({
      authenticated: false,
      emails: [],
      count: 0,
      loginUrl: getOAuthUrl(),
    });
  } catch (error) {
    console.error("Failed to fetch emails:", error);
    return NextResponse.json(
      { error: "Failed to fetch emails", accounts: [], emails: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "storeTokens") {
      // TODO: Implement secure token storage
      // For now, acknowledge
      return NextResponse.json({ success: true, stored: true });
    }

    return NextResponse.json({ success: false, error: "Unknown action" });
  } catch (error) {
    console.error("Email action failed:", error);
    return NextResponse.json(
      { error: "Action failed" },
      { status: 500 }
    );
  }
}
