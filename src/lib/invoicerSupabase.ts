import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getInvoicerSupabase(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = process.env.INVOICER_SUPABASE_URL;
  const supabaseAnonKey = process.env.INVOICER_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing INVOICER_SUPABASE_URL or INVOICER_SUPABASE_ANON_KEY");
  }

  _client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });

  return _client;
}
