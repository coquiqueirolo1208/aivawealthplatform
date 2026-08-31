import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface ProspectTask {
  id: string;
  title: string;
  due: string | null;
  done: boolean;
}

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
  tasks: ProspectTask[];
}

export async function getProspectsForAdvisor(supabase: SupabaseClient<Database>, advisorId: string): Promise<Prospect[]> {
  const { data, error } = await supabase
    .from("prospects")
    .select("*")
    .eq("advisor_id", advisorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const prospects = data ?? [];
  if (!prospects.length) return [];

  const prospectIds = prospects.map((p) => p.id);
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, prospect_id, title, due, done")
    .in("prospect_id", prospectIds);
  if (tasksError) throw tasksError;

  const tasksByProspect = new Map<string, ProspectTask[]>();
  (tasks ?? []).forEach((t) => {
    if (!t.prospect_id) return;
    if (!tasksByProspect.has(t.prospect_id)) tasksByProspect.set(t.prospect_id, []);
    tasksByProspect.get(t.prospect_id)!.push({ id: t.id, title: t.title, due: t.due, done: t.done });
  });

  return prospects.map((p) => ({
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
    tasks: tasksByProspect.get(p.id) ?? [],
  }));
}
