import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface Prospect {
  id: string;
  name: string;
  empresa: string | null;
  fuente: string | null;
  aumEstimado: number | null;
  proximaAccion: string | null;
  proximaFecha: string | null;
  notas: string | null;
  stage: string;
  createdAt: string;
  convertedClientId: string | null;
}

export async function getProspectsForAdvisor(supabase: SupabaseClient<Database>, advisorId: string): Promise<Prospect[]> {
  const { data, error } = await supabase
    .from("prospects")
    .select("*")
    .eq("advisor_id", advisorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    empresa: p.empresa,
    fuente: p.fuente,
    aumEstimado: p.aum_estimado,
    proximaAccion: p.proxima_accion,
    proximaFecha: p.proxima_fecha,
    notas: p.notas,
    stage: p.stage,
    createdAt: p.created_at,
    convertedClientId: p.converted_client_id,
  }));
}
