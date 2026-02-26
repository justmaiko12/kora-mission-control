import { NextRequest, NextResponse } from "next/server";
import {
  fetchAllEmails,
  markAsRead,
  archiveEmail,
} from "@/lib/serviceAccountEmail";

const ACCOUNTS = [
  "justmaiko@shluv.com",
  "business@shluv.com",
  "business@meettherodz.com",
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const account = searchParams.get("account");
  const dashboard = searchParams.get("dashboard");

  try {
    // For dashboard view, fetch emails via service account
    if (dashboard === "true") {
      console.log(`[Emails API] Fetching emails (account filter: ${account})`);

      // Determine which accounts to fetch
      let filterAccount: string | undefined;
      if (account) {
        if (account.includes("meettherodz")) {
          filterAccount = "meettherodz";
        } else if (account.includes("shluv")) {
          filterAccount = "shluv";
        }
      }

      // Fetch emails from service account (impersonates target accounts)
      const emails = await fetchAllEmails(filterAccount);

      // Get list of accounts we're using
      let accountsToShow = ACCOUNTS;
      if (filterAccount) {
        accountsToShow = ACCOUNTS.filter((a) => a.includes(filterAccount));
      }

      return NextResponse.json({
        authenticated: true,
        accounts: accountsToShow,
        emails,
        count: emails.length,
      });
    }

    // List available accounts
    return NextResponse.json({
      authenticated: true,
      accounts: ACCOUNTS,
      emails: [],
    });
  } catch (error) {
    console.error("Failed to fetch emails:", error);
    return NextResponse.json(
      { error: "Failed to fetch emails", accounts: ACCOUNTS, emails: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, account, messageId } = body;

    if (action === "markAsRead") {
      const success = await markAsRead(account, messageId);
      return NextResponse.json({ success });
    }

    if (action === "archive") {
      const success = await archiveEmail(account, messageId);
      return NextResponse.json({ success });
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
