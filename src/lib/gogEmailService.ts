import { execSync } from "child_process";

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

const ACCOUNTS = [
  "justmaiko@shluv.com",
  "business@shluv.com",
  "business@meettherodz.com",
];

/**
 * Fetch emails from Gmail using gog CLI (already authenticated locally)
 */
export async function fetchEmailsViaGog(
  account?: string,
  maxResults: number = 50
): Promise<EmailMessage[]> {
  const accountsToFetch = account ? [account] : ACCOUNTS;
  const allEmails: EmailMessage[] = [];

  for (const acc of accountsToFetch) {
    try {
      // Run gog gmail command to fetch messages
      const command = `gog gmail messages search "in:inbox" --account "${acc}" --json --max ${maxResults} 2>/dev/null`;
      console.log(`[GOG] Fetching emails for ${acc}`);

      let output: string;
      try {
        output = execSync(command, {
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        });
      } catch (err) {
        console.error(`[GOG] Command failed for ${acc}:`, err);
        continue;
      }

      if (!output.trim()) {
        console.log(`[GOG] No emails found for ${acc}`);
        continue;
      }

      // Parse JSON output
      const messages = JSON.parse(output);
      if (!messages.messages || !Array.isArray(messages.messages)) {
        console.warn(`[GOG] Unexpected output format for ${acc}`);
        continue;
      }

      // Convert to our email format
      for (const msg of messages.messages) {
        allEmails.push({
          id: msg.id || "",
          threadId: msg.threadId || "",
          from: msg.from || "Unknown",
          subject: msg.subject || "(No subject)",
          snippet: msg.snippet || "",
          date: msg.date || new Date().toISOString(),
          unread: msg.labels?.includes("UNREAD") || false,
          account: acc,
        });
      }

      console.log(
        `[GOG] Fetched ${messages.messages.length} emails for ${acc}`
      );
    } catch (err) {
      console.error(`[GOG] Error fetching emails for ${acc}:`, err);
      // Continue to next account on error
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
 * Get all accounts configured in gog
 */
export async function getGmailAccounts(): Promise<string[]> {
  try {
    // Just return our known accounts
    return ACCOUNTS;
  } catch (err) {
    console.error("[GOG] Error getting accounts:", err);
    return [];
  }
}

/**
 * Mark email as read
 */
export async function markEmailAsRead(
  account: string,
  messageId: string
): Promise<boolean> {
  try {
    const command = `gog gmail messages modify "${messageId}" --remove-label UNREAD --account "${account}" 2>/dev/null`;
    execSync(command, { encoding: "utf-8" });
    return true;
  } catch (err) {
    console.error(`[GOG] Error marking email as read:`, err);
    return false;
  }
}

/**
 * Archive email
 */
export async function archiveEmail(
  account: string,
  messageId: string
): Promise<boolean> {
  try {
    const command = `gog gmail messages modify "${messageId}" --add-label ARCHIVE --account "${account}" 2>/dev/null`;
    execSync(command, { encoding: "utf-8" });
    return true;
  } catch (err) {
    console.error(`[GOG] Error archiving email:`, err);
    return false;
  }
}
