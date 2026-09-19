import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client (anon key). Safe to use in Client Components.
 * The NEXT_PUBLIC_* vars are inlined at build time.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
