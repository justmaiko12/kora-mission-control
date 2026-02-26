import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { storeGmailTokens, getGmailTokens } from "@/lib/gmailTokenStorage";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const company = searchParams.get("company") || "shluv"; // default to shluv

  if (!code) {
    return NextResponse.json(
      { error: "No authorization code provided" },
      { status: 400 }
    );
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error("Missing Google OAuth configuration");
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error("No access token received");
    }

    // Get Gmail profile to get email address
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: "me" });
    const userEmail = profile.data.emailAddress;

    if (!userEmail) {
      throw new Error("Could not retrieve Gmail email address");
    }

    // Map company name to company ID
    const companyMap: Record<string, string> = {
      shluv: "a2e5d4fd-30cd-44b7-a3ce-dc5f8ae5d50b",
      mtr: "1e9a87f3-0a12-48b0-be03-c4a98359f71f",
    };

    const companyId = companyMap[company] || companyMap.shluv;

    // Store tokens in Supabase
    await storeGmailTokens(
      userEmail,
      tokens.access_token,
      tokens.refresh_token || null,
      tokens.expiry_date || null,
      companyId
    );

    // Redirect back to emails tab with success
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("gmail_connected", "true");
    redirectUrl.searchParams.set("email", userEmail);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("OAuth callback error:", error);
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("gmail_error", "authentication_failed");
    return NextResponse.redirect(redirectUrl);
  }
}
