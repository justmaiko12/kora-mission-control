import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.INVOICER_SUPABASE_URL;
const supabaseKey = process.env.INVOICER_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase configuration");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export interface GmailToken {
  id?: string;
  email: string;
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  company_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Store Gmail tokens in Supabase
export async function storeGmailTokens(
  email: string,
  accessToken: string,
  refreshToken: string | null,
  expiryDate: number | null,
  companyId?: string
) {
  try {
    const { data, error } = await supabase
      .from("gmail_tokens")
      .upsert(
        {
          email,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiryDate,
          company_id: companyId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      )
      .select();

    if (error) {
      console.error("Error storing Gmail tokens:", error);
      throw error;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error("Failed to store Gmail tokens:", error);
    throw error;
  }
}

// Retrieve Gmail tokens from Supabase
export async function getGmailTokens(email: string): Promise<GmailToken | null> {
  try {
    const { data, error } = await supabase
      .from("gmail_tokens")
      .select("*")
      .eq("email", email)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found (which is OK)
      console.error("Error retrieving Gmail tokens:", error);
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error("Failed to retrieve Gmail tokens:", error);
    throw error;
  }
}

// Get all Gmail tokens for a company
export async function getCompanyGmailTokens(
  companyId: string
): Promise<GmailToken[]> {
  try {
    const { data, error } = await supabase
      .from("gmail_tokens")
      .select("*")
      .eq("company_id", companyId);

    if (error) {
      console.error("Error retrieving company Gmail tokens:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Failed to retrieve company Gmail tokens:", error);
    return [];
  }
}

// Delete Gmail tokens
export async function deleteGmailTokens(email: string) {
  try {
    const { error } = await supabase
      .from("gmail_tokens")
      .delete()
      .eq("email", email);

    if (error) {
      console.error("Error deleting Gmail tokens:", error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Failed to delete Gmail tokens:", error);
    throw error;
  }
}
