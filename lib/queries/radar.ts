import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getAdvisorClientsWithSnapshots } from "./portfolio";
import { getModelPortfolio } from "./reference";
import { buildRadarData, type RadarClientInput, type RadarData } from "@/lib/finance/radar";
import { toUsdSnapshotsByMonth } from "@/lib/finance/currency";

export async function loadRadarData(supabase: SupabaseClient<Database>, advisorId: string): Promise<RadarData> {
  const clients = await getAdvisorClientsWithSnapshots(supabase, advisorId);
  if (!clients.length) {
    return {
      concentraciones: [],
      atrasos: [],
      riesgo: [],
      tareas: [],
      documentos: [],
      usSitusRiesgo: [],
      todPendiente: [],
      contactoPendiente: [],
      fondeoPendiente: [],
    };
  }
  const clientIds = clients.map((c) => c.id);

  const [{ data: documents }, { data: riskProfiles }, { data: tasks }, { data: notes }] = await Promise.all([
    supabase.from("client_documents").select("client_id, tipo, estado, vencimiento").in("client_id", clientIds),
    supabase.from("risk_profiles").select("client_id, profile").in("client_id", clientIds),
    supabase.from("tasks").select("client_id, title, due, done").in("client_id", clientIds),
    supabase.from("client_notes").select("client_id, created_at").in("client_id", clientIds),
  ]);

  const docsByClient = new Map<string, Array<{ tipo: string; estado: string; vencimiento: string | null }>>();
  (documents ?? []).forEach((d) => {
    if (!docsByClient.has(d.client_id)) docsByClient.set(d.client_id, []);
    docsByClient.get(d.client_id)!.push({ tipo: d.tipo, estado: d.estado, vencimiento: d.vencimiento });
  });
  const riskByClient = new Map<string, string>();
  (riskProfiles ?? []).forEach((r) => riskByClient.set(r.client_id, r.profile));
  const tasksByClient = new Map<string, Array<{ title: string; due: string | null; done: boolean }>>();
  (tasks ?? []).forEach((t) => {
    if (!tasksByClient.has(t.client_id)) tasksByClient.set(t.client_id, []);
    tasksByClient.get(t.client_id)!.push({ title: t.title, due: t.due, done: t.done });
  });
  const lastNoteByClient = new Map<string, string>();
  (notes ?? []).forEach((n) => {
    const current = lastNoteByClient.get(n.client_id);
    if (!current || n.created_at > current) lastNoteByClient.set(n.client_id, n.created_at);
  });

  const distinctProfiles = Array.from(new Set(riskByClient.values()));
  const modelPortfolios = new Map<string, Awaited<ReturnType<typeof getModelPortfolio>>>();
  await Promise.all(
    distinctProfiles.map(async (p) => {
      modelPortfolios.set(p, await getModelPortfolio(supabase, p));
    }),
  );

  const input: RadarClientInput[] = clients.map((c) => ({
    id: c.id,
    name: c.name,
    createdAt: c.createdAt,
    lastNoteAt: lastNoteByClient.get(c.id) ?? null,
    // Radar's dollar-based checks (risk-deviation weighting, etc.) need every account
    // in the same currency — convert per snapshot's own month rate before comparing.
    accounts: c.accounts.map((a) => ({ ...a, snapshots: toUsdSnapshotsByMonth(a.snapshots) })),
    documents: docsByClient.get(c.id) ?? [],
    riskProfile: riskByClient.has(c.id) ? { profile: riskByClient.get(c.id)! } : null,
    tasks: tasksByClient.get(c.id) ?? [],
  }));

  return buildRadarData(input, modelPortfolios, new Date().toISOString().slice(0, 10));
}
