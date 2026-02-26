import { NextRequest, NextResponse } from "next/server";
import {
  fetchEmailsViaGog,
  getGmailAccounts,
  markEmailAsRead,
  archiveEmail,
} from "@/lib/gogEmailService";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const account = searchParams.get("account");
  const dashboard = searchParams.get("dashboard");

  try {
    // For dashboard view, fetch emails via gog
    if (dashboard === "true") {
      const accounts = await getGmailAccounts();

      // Filter by company if specified
      let accountsToFetch = accounts;
      if (account) {
        if (account.includes("meettherodz")) {
          accountsToFetch = accounts.filter((a) =>
            a.includes("meettherodz")
          );
        } else if (account.includes("shluv")) {
          accountsToFetch = accounts.filter((a) => a.includes("shluv"));
        }
      }

      console.log(`[Emails API] Fetching emails for accounts:`, accountsToFetch);

      // Fetch emails from all relevant accounts
      const emails = await fetchEmailsViaGog();

      // Filter by company/account if specified
      let filteredEmails = emails;
      if (account) {
        filteredEmails = emails.filter((e) => {
          if (account.includes("meettherodz")) {
            return e.account.includes("meettherodz");
          } else if (account.includes("shluv")) {
            return e.account.includes("shluv");
          }
          return true;
        });
      }

      return NextResponse.json({
        authenticated: true,
        accounts: accountsToFetch,
        emails: filteredEmails,
        count: filteredEmails.length,
      });
    }

    // List available accounts
    const accounts = await getGmailAccounts();
    return NextResponse.json({
      authenticated: true,
      accounts,
      emails: [],
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
    const { action, account, messageId } = body;

    if (action === "markAsRead") {
      const success = await markEmailAsRead(account, messageId);
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
