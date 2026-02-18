import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getInvoicerSupabase(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = process.env.INVOICER_SUPABASE_URL;
  // Prefer service key for server-side (bypasses RLS), fall back to anon key
  const supabaseKey = process.env.INVOICER_SUPABASE_SERVICE_KEY || process.env.INVOICER_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing INVOICER_SUPABASE_URL or INVOICER_SUPABASE_SERVICE_KEY/ANON_KEY");
  }

  _client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
  });

  return _client;
}
