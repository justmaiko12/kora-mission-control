import { google } from "googleapis";

interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
}

interface EmailMessage {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
}

// Initialize Gmail service
export function getGmailClient(tokens: StoredTokens) {
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

  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiryDate,
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

// Fetch emails from Gmail
export async function fetchEmails(
  tokens: StoredTokens,
  query: string = "is:unread"
): Promise<EmailMessage[]> {
  try {
    const gmail = getGmailClient(tokens);

    // List messages matching query
    const listResponse = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 50,
    });

    if (!listResponse.data.messages) {
      return [];
    }

    // Get full details for each message
    const emails: EmailMessage[] = [];
    for (const msg of listResponse.data.messages.slice(0, 20)) {
      if (!msg.id) continue;

      const fullMsg = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "metadata",
        metadataHeaders: ["Subject", "From", "Date"],
      });

      const headers = fullMsg.data.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name === name)?.value || "";

      emails.push({
        id: msg.id,
        threadId: msg.threadId || "",
        from: getHeader("From"),
        subject: getHeader("Subject"),
        snippet: fullMsg.data.snippet || "",
        date: getHeader("Date"),
        unread: msg.labelIds?.includes("UNREAD") || false,
      });
    }

    return emails;
  } catch (error) {
    console.error("Failed to fetch emails from Gmail:", error);
    throw error;
  }
}

// Get Gmail accounts (for display)
export async function getGmailProfile(tokens: StoredTokens) {
  try {
    const gmail = getGmailClient(tokens);
    const profile = await gmail.users.getProfile({ userId: "me" });

    return {
      email: profile.data.emailAddress || "",
      messagesTotal: profile.data.messagesTotal || 0,
    };
  } catch (error) {
    console.error("Failed to get Gmail profile:", error);
    throw error;
  }
}

// Generate OAuth URL for login
export function getOAuthUrl() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error("Missing Google OAuth configuration");
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
  });

  return authUrl;
}
