import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface ProspectTask {
  id: string;
  title: string;
  due: string | null;
  done: boolean;
}

export interface ProposalAttachment {
  path: string;
  name: string;
  url: string | null;
}

export interface ProposalRequest {
  id: string;
  montoEstimado: number | null;
  horizonte: string | null;
  perfil: string | null;
  comentarios: string | null;
  attachments: ProposalAttachment[];
  createdAt: string;
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
  proposalRequests: ProposalRequest[];
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

  const { data: requests, error: requestsError } = await supabase
    .from("proposal_requests")
    .select("id, prospect_id, monto_estimado, horizonte, perfil, comentarios, attachments, created_at")
    .in("prospect_id", prospectIds)
    .order("created_at", { ascending: false });
  if (requestsError) throw requestsError;

  const allPaths = (requests ?? []).flatMap((r) => (r.attachments as Array<{ path: string; name: string }>).map((a) => a.path));
  const signedUrlByPath = new Map<string, string>();
  if (allPaths.length) {
    const { data: signed } = await supabase.storage.from("proposal-attachments").createSignedUrls(allPaths, 3600);
    (signed ?? []).forEach((s) => {
      if (s.signedUrl) signedUrlByPath.set(s.path ?? "", s.signedUrl);
    });
  }

  const requestsByProspect = new Map<string, ProposalRequest[]>();
  (requests ?? []).forEach((r) => {
    if (!requestsByProspect.has(r.prospect_id)) requestsByProspect.set(r.prospect_id, []);
    const attachments = (r.attachments as Array<{ path: string; name: string }>).map((a) => ({
      path: a.path,
      name: a.name,
      url: signedUrlByPath.get(a.path) ?? null,
    }));
    requestsByProspect.get(r.prospect_id)!.push({
      id: r.id,
      montoEstimado: r.monto_estimado,
      horizonte: r.horizonte,
      perfil: r.perfil,
      comentarios: r.comentarios,
      attachments,
      createdAt: r.created_at,
    });
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
    proposalRequests: requestsByProspect.get(p.id) ?? [],
  }));
}
