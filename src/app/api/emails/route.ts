import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL = process.env.KORA_BRIDGE_URL || "https://api.korabot.xyz";
const BRIDGE_SECRET = process.env.KORA_BRIDGE_SECRET || "";

async function bridgeFetch(path: string) {
  const res = await fetch(`${BRIDGE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${BRIDGE_SECRET}`,
      "Content-Type": "application/json",
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
  const account = searchParams.get("account");
  const query = searchParams.get("query") || "newer_than:14d";
  const max = searchParams.get("max") || "50";
  const dashboard = searchParams.get("dashboard"); // For dashboard, fetch all

  try {
    // Dashboard view - get accounts AND all emails
    if (dashboard === "true" || !account) {
      const { accounts } = await bridgeFetch("/api/email/accounts");
      
      // For dashboard, fetch emails from all accounts
      const allEmails: Array<{ account: string; id: string; subject: string; from: string; read: boolean; date: string; labels: string[] }> = [];
      
      for (const acc of accounts || []) {
        try {
          const data = await bridgeFetch(
            `/api/email/messages?account=${encodeURIComponent(acc.email)}&max=30`
          );
          if (data.emails) {
            // Add account identifier to each email
            const emailsWithAccount = data.emails.map((e: { id: string; subject: string; from: string; read: boolean; date: string; labels: string[] }) => ({
              ...e,
              account: acc.email,
            }));
            allEmails.push(...emailsWithAccount);
          }
        } catch (err) {
          console.error(`Failed to fetch emails for ${acc.email}:`, err);
        }
      }
      
      return NextResponse.json({ 
        accounts: accounts?.map((a: { email: string }) => a.email) || [],
        emails: allEmails,
      });
    }

    // Fetch emails for specific account
    const data = await bridgeFetch(
      `/api/email/messages?account=${encodeURIComponent(account)}&query=${encodeURIComponent(query)}&max=${max}`
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch emails:", error);
    return NextResponse.json(
      { error: "Failed to fetch emails", accounts: [], emails: [] },
      { status: 500 }
    );
  }
}
