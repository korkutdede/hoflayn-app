import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. SERVER ONLY — bypasses RLS.
 * Prefer Drizzle (`db`) for app data; use this for Auth admin APIs if needed.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "createSupabaseAdminClient: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
