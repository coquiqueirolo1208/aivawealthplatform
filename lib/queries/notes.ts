import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface ClientNote {
  id: string;
  texto: string;
  createdAt: string;
}

/** Most recent first — a running activity log, not something you'd normally scroll to the bottom of. */
export async function getNotesForClient(supabase: SupabaseClient<Database>, clientId: string): Promise<ClientNote[]> {
  const { data, error } = await supabase
    .from("client_notes")
    .select("id, texto, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((n) => ({ id: n.id, texto: n.texto, createdAt: n.created_at }));
}
