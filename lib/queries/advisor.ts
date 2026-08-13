import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** Signed URL (1h) for this advisor's own logo, or null if none uploaded. */
export async function getAdvisorLogoUrl(supabase: SupabaseClient<Database>, advisorId: string): Promise<string | null> {
  const { data: advisor } = await supabase.from("advisors").select("logo_path").eq("id", advisorId).maybeSingle();
  if (!advisor?.logo_path) return null;
  const { data: signed } = await supabase.storage.from("advisor-logos").createSignedUrl(advisor.logo_path, 3600);
  return signed?.signedUrl ?? null;
}
