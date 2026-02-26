import { NextRequest, NextResponse } from "next/server";
import { getOAuthUrl } from "@/lib/gmailService";
import { fetchEmails } from "@/lib/gmailService";
import { getCompanyGmailTokens, getGmailTokens } from "@/lib/gmailTokenStorage";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const company = searchParams.get("company") || "shluv";
  const dashboard = searchParams.get("dashboard");

  try {
    // If user is trying to login, return OAuth URL with company context
    if (action === "login") {
      try {
        const oauthUrl = getOAuthUrl();
        console.log("[Gmail OAuth] Generated URL:", oauthUrl);
        console.log("[Gmail OAuth] Client ID:", process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + "...");
        console.log("[Gmail OAuth] Redirect URI:", process.env.GOOGLE_REDIRECT_URI);
        
        return NextResponse.json({ 
          oauthUrl: `${oauthUrl}&state=${encodeURIComponent(company)}`,
          company,
          debug: {
            clientIdSet: !!process.env.GOOGLE_CLIENT_ID,
            clientSecretSet: !!process.env.GOOGLE_CLIENT_SECRET,
            redirectUriSet: !!process.env.GOOGLE_REDIRECT_URI,
          }
        });
      } catch (err) {
        console.error("[Gmail OAuth] Error generating URL:", err);
        return NextResponse.json({ 
          error: err instanceof Error ? err.message : "Unknown error",
          oauthUrl: null
        }, { status: 500 });
      }
    }

    // For dashboard view, fetch stored tokens and emails
    if (dashboard === "true") {
      const companyGmailTokens = await getCompanyGmailTokens(
        company === "mtr" 
          ? "1e9a87f3-0a12-48b0-be03-c4a98359f71f"
          : "a2e5d4fd-30cd-44b7-a3ce-dc5f8ae5d50b"
      );

      if (companyGmailTokens.length === 0) {
        return NextResponse.json({
          authenticated: false,
          accounts: [],
          emails: [],
          loginUrl: getOAuthUrl() + `&state=${encodeURIComponent(company)}`,
        });
      }

      // Fetch emails from first connected account
      const token = companyGmailTokens[0];
      const emails = await fetchEmails({
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiryDate: token.expires_at,
      });

      return NextResponse.json({
        authenticated: true,
        accounts: companyGmailTokens.map(t => ({ email: t.email })),
        emails,
        count: emails.length,
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
    const { action, company = "shluv" } = body;

    if (action === "getLoginUrl") {
      const oauthUrl = getOAuthUrl();
      return NextResponse.json({ 
        oauthUrl: `${oauthUrl}&state=${encodeURIComponent(company)}`
      });
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
