import { getInvoicerSupabase } from "./invoicerSupabase";

export type EmailState = "needs_response" | "awaiting" | "done" | "archived";

export interface EmailStateRecord {
  id: string;
  email_id: string;
  thread_id: string | null;
  account: string;
  state: EmailState;
  subject: string | null;
  sender: string | null;
  last_activity: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all email states for an account
 */
export async function getEmailStates(account: string): Promise<EmailStateRecord[]> {
  const supabase = getInvoicerSupabase();
  
  const { data, error } = await supabase
    .from("email_states")
    .select("*")
    .eq("account", account);
  
  if (error) {
    console.error("[emailStateService] Failed to fetch states:", error);
    return [];
  }
  
  return data || [];
}

/**
 * Get email states filtered by state
 */
export async function getEmailsByState(account: string, state: EmailState): Promise<EmailStateRecord[]> {
  const supabase = getInvoicerSupabase();
  
  const { data, error } = await supabase
    .from("email_states")
    .select("*")
    .eq("account", account)
    .eq("state", state);
  
  if (error) {
    console.error("[emailStateService] Failed to fetch by state:", error);
    return [];
  }
  
  return data || [];
}

/**
 * Get state for a specific email
 */
export async function getEmailState(emailId: string, account: string): Promise<EmailStateRecord | null> {
  const supabase = getInvoicerSupabase();
  
  const { data, error } = await supabase
    .from("email_states")
    .select("*")
    .eq("email_id", emailId)
    .eq("account", account)
    .single();
  
  if (error) {
    // Not found is okay, just return null
    if (error.code === "PGRST116") return null;
    console.error("[emailStateService] Failed to fetch state:", error);
    return null;
  }
  
  return data;
}

/**
 * Update or insert email state
 */
export async function updateEmailState(
  emailId: string,
  account: string,
  state: EmailState,
  metadata?: {
    thread_id?: string;
    threadId?: string; // alias
    subject?: string;
    sender?: string;
  }
): Promise<boolean> {
  const supabase = getInvoicerSupabase();
  
  const { error } = await supabase
    .from("email_states")
    .upsert({
      email_id: emailId,
      account,
      state,
      thread_id: metadata?.thread_id || metadata?.threadId,
      subject: metadata?.subject,
      sender: metadata?.sender,
      last_activity: new Date().toISOString(),
    }, {
      onConflict: "email_id,account",
    });
  
  if (error) {
    console.error("[emailStateService] Failed to update state:", error);
    return false;
  }
  
  return true;
}

/**
 * Bulk upsert email states (for syncing)
 */
export async function bulkUpdateEmailStates(
  records: Array<{
    email_id: string;
    account: string;
    state: EmailState;
    thread_id?: string;
    subject?: string;
    sender?: string;
  }>
): Promise<boolean> {
  const supabase = getInvoicerSupabase();
  
  const toUpsert = records.map(r => ({
    email_id: r.email_id,
    account: r.account,
    state: r.state,
    thread_id: r.thread_id,
    subject: r.subject,
    sender: r.sender,
    last_activity: new Date().toISOString(),
  }));
  
  const { error } = await supabase
    .from("email_states")
    .upsert(toUpsert, {
      onConflict: "email_id,account",
    });
  
  if (error) {
    console.error("[emailStateService] Failed to bulk update:", error);
    return false;
  }
  
  return true;
}

/**
 * Link an email to a deal
 */
export async function linkEmailToDeal(
  emailId: string,
  dealId: string,
  account: string
): Promise<boolean> {
  const supabase = getInvoicerSupabase();
  
  const { error } = await supabase
    .from("email_deal_links")
    .upsert({
      email_id: emailId,
      deal_id: dealId,
      account,
    }, {
      onConflict: "email_id,deal_id",
    });
  
  if (error) {
    console.error("[emailStateService] Failed to link email to deal:", error);
    return false;
  }
  
  return true;
}

/**
 * Get all emails linked to a deal
 */
export async function getEmailsForDeal(dealId: string): Promise<string[]> {
  const supabase = getInvoicerSupabase();
  
  const { data, error } = await supabase
    .from("email_deal_links")
    .select("email_id")
    .eq("deal_id", dealId);
  
  if (error) {
    console.error("[emailStateService] Failed to get deal emails:", error);
    return [];
  }
  
  return (data || []).map(d => d.email_id);
}

/**
 * Get deal linked to an email
 */
export async function getDealForEmail(emailId: string): Promise<string | null> {
  const supabase = getInvoicerSupabase();
  
  const { data, error } = await supabase
    .from("email_deal_links")
    .select("deal_id")
    .eq("email_id", emailId)
    .single();
  
  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[emailStateService] Failed to get email deal:", error);
    return null;
  }
  
  return data?.deal_id || null;
}

/**
 * Get all linked email IDs (for showing link indicators)
 */
export async function getAllLinkedEmailIds(): Promise<string[]> {
  const supabase = getInvoicerSupabase();
  
  const { data, error } = await supabase
    .from("email_deal_links")
    .select("email_id");
  
  if (error) {
    console.error("[emailStateService] Failed to get linked emails:", error);
    return [];
  }
  
  return (data || []).map(d => d.email_id);
}

/**
 * Build a map of email_id/thread_id to state record for fast lookup
 */
export function buildStateMap(states: EmailStateRecord[]): Record<string, EmailStateRecord> {
  const map: Record<string, EmailStateRecord> = {};
  for (const state of states) {
    map[state.email_id] = state;
    if (state.thread_id) {
      map[state.thread_id] = state;
    }
  }
  return map;
}
