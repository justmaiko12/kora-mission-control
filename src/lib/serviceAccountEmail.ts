import { google } from "googleapis";
import { JWT } from "google-auth-library";

// Service account credentials
const SERVICE_ACCOUNT_EMAIL = "kora-email-reader@kora-485502.iam.gserviceaccount.com";
const PROJECT_ID = "kora-485502";

// The three email accounts we can impersonate
const TARGET_ACCOUNTS = [
  "justmaiko@shluv.com",
  "business@shluv.com",
  "business@meettherodz.com",
];

export interface EmailMessage {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
  account: string;
}

/**
 * Create a JWT client that impersonates a specific email account
 */
function createJWTClient(userEmail: string) {
  // Parse the private key from environment or config
  const privateKeyString = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!privateKeyString) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY not configured");
  }

  // Replace escaped newlines
  const privateKey = privateKeyString.replace(/\\n/g, "\n");

  const jwtClient = new JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/gmail.modify"],
    subject: userEmail, // Impersonate this user
  });

  return jwtClient;
}

/**
 * Fetch emails from a specific account using service account impersonation
 */
export async function fetchEmailsFromAccount(
  userEmail: string,
  maxResults: number = 50
): Promise<EmailMessage[]> {
  try {
    console.log(`[ServiceAccount] Fetching emails for ${userEmail}`);

    const jwtClient = createJWTClient(userEmail);
    const gmail = google.gmail({ version: "v1", auth: jwtClient });

    // List messages in inbox
    const listResponse = await gmail.users.messages.list({
      userId: "me",
      q: "in:inbox",
      maxResults,
    });

    if (!listResponse.data.messages) {
      console.log(`[ServiceAccount] No emails found for ${userEmail}`);
      return [];
    }

    const emails: EmailMessage[] = [];

    // Get full details for each message
    for (const msg of listResponse.data.messages.slice(0, maxResults)) {
      if (!msg.id) continue;

      try {
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
          account: userEmail,
        });
      } catch (err) {
        console.error(`[ServiceAccount] Error getting message ${msg.id}:`, err);
        continue;
      }
    }

    console.log(
      `[ServiceAccount] Fetched ${emails.length} emails for ${userEmail}`
    );
    return emails;
  } catch (err) {
    console.error(
      `[ServiceAccount] Error fetching emails for ${userEmail}:`,
      err
    );
    throw err;
  }
}

/**
 * Fetch emails from all target accounts
 */
export async function fetchAllEmails(
  filterAccount?: string
): Promise<EmailMessage[]> {
  const accountsToFetch = filterAccount
    ? TARGET_ACCOUNTS.filter((acc) => acc.includes(filterAccount))
    : TARGET_ACCOUNTS;

  const allEmails: EmailMessage[] = [];

  for (const account of accountsToFetch) {
    try {
      const emails = await fetchEmailsFromAccount(account);
      allEmails.push(...emails);
    } catch (err) {
      console.error(`[ServiceAccount] Failed for ${account}:`, err);
      // Continue to next account
    }
  }

  // Sort by date (newest first)
  return allEmails.sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA;
  });
}

/**
 * Mark email as read
 */
export async function markAsRead(
  userEmail: string,
  messageId: string
): Promise<boolean> {
  try {
    const jwtClient = createJWTClient(userEmail);
    const gmail = google.gmail({ version: "v1", auth: jwtClient });

    await gmail.users.messages.modify({
      userId: "me",
      id: messageId,
      requestBody: {
        removeLabelIds: ["UNREAD"],
      },
    });

    return true;
  } catch (err) {
    console.error(
      `[ServiceAccount] Error marking ${messageId} as read:`,
      err
    );
    return false;
  }
}

/**
 * Archive email
 */
export async function archiveEmail(
  userEmail: string,
  messageId: string
): Promise<boolean> {
  try {
    const jwtClient = createJWTClient(userEmail);
    const gmail = google.gmail({ version: "v1", auth: jwtClient });

    await gmail.users.messages.modify({
      userId: "me",
      id: messageId,
      requestBody: {
        addLabelIds: ["ARCHIVE"],
      },
    });

    return true;
  } catch (err) {
    console.error(`[ServiceAccount] Error archiving ${messageId}:`, err);
    return false;
  }
}
