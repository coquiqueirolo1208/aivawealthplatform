import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Service-role client for contexts with no user session (cron jobs) — bypasses RLS
 * entirely, so every query built for it must scope by advisor_id itself rather than
 * relying on RLS. Never import this into client-side code.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
