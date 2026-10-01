import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fetchAllIn, getAdvisorClientsWithLatestSnapshot } from "./portfolio";
import { getModelPortfolio } from "./reference";
import { buildRadarData, type RadarClientInput, type RadarData, type RadarProspectInput } from "@/lib/finance/radar";
import { toUsdSnapshotsByMonth } from "@/lib/finance/currency";
import { todayIso } from "@/lib/dates";
import type { RiskProfileKey } from "@/lib/constants";

type TaskLite = { title: string; due: string | null; done: boolean };

const RISK_PROFILE_KEYS: RiskProfileKey[] = ["conservador", "balanceado", "dinamico"];

/**
 * Every Radar check reads only each account's latest statement (lateness, concentration,
 * risk deviation, US-situs), so this uses the latest-snapshot query instead of full
 * history. Memoized per request: the nav badge and Mi Oficina both call it.
 * Query errors are thrown rather than ignored — an empty result used to render as
 * "Todo en orden" when the queries had actually failed.
 */
export const loadRadarData = cache(async (supabase: SupabaseClient<Database>, advisorId: string): Promise<RadarData> => {
  const [clients, { data: prospects, error: prospectsError }] = await Promise.all([
    getAdvisorClientsWithLatestSnapshot(supabase, advisorId),
    supabase.from("prospects").select("id, name").eq("advisor_id", advisorId),
  ]);
  if (prospectsError) throw prospectsError;

  const clientIds = clients.map((c) => c.id);
  const prospectIds = (prospects ?? []).map((p) => p.id);

  // There are only three model portfolios, so fetch all of them in this same round
  // rather than waiting for the risk profiles to know which ones are needed.
  const [documents, riskProfiles, tasks, notes, prospectTasks, portfolios] = await Promise.all([
    fetchAllIn(clientIds, (chunk, from, to) =>
      supabase.from("client_documents").select("id, client_id, tipo, estado, vencimiento").in("client_id", chunk).order("id").range(from, to),
    ),
    fetchAllIn(clientIds, (chunk, from, to) =>
      supabase.from("risk_profiles").select("client_id, profile").in("client_id", chunk).order("client_id").range(from, to),
    ),
    fetchAllIn(clientIds, (chunk, from, to) =>
      supabase.from("tasks").select("id, client_id, title, due, done").in("client_id", chunk).eq("done", false).order("id").range(from, to),
    ),
    fetchAllIn(clientIds, (chunk, from, to) =>
      supabase.from("client_notes").select("id, client_id, created_at").in("client_id", chunk).order("id").range(from, to),
    ),
    fetchAllIn(prospectIds, (chunk, from, to) =>
      supabase.from("tasks").select("id, prospect_id, title, due, done").in("prospect_id", chunk).eq("done", false).order("id").range(from, to),
    ),
    Promise.all(RISK_PROFILE_KEYS.map((p) => getModelPortfolio(supabase, p))),
  ]);

  const docsByClient = new Map<string, Array<{ tipo: string; estado: string; vencimiento: string | null }>>();
  documents.forEach((d) => {
    if (!docsByClient.has(d.client_id)) docsByClient.set(d.client_id, []);
    docsByClient.get(d.client_id)!.push({ tipo: d.tipo, estado: d.estado, vencimiento: d.vencimiento });
  });
  const riskByClient = new Map<string, string>();
  riskProfiles.forEach((r) => riskByClient.set(r.client_id, r.profile));
  const tasksByClient = new Map<string, TaskLite[]>();
  tasks.forEach((t) => {
    if (!t.client_id) return;
    if (!tasksByClient.has(t.client_id)) tasksByClient.set(t.client_id, []);
    tasksByClient.get(t.client_id)!.push({ title: t.title, due: t.due, done: t.done });
  });
  const lastNoteByClient = new Map<string, string>();
  notes.forEach((n) => {
    const current = lastNoteByClient.get(n.client_id);
    if (!current || n.created_at > current) lastNoteByClient.set(n.client_id, n.created_at);
  });
  const tasksByProspect = new Map<string, TaskLite[]>();
  prospectTasks.forEach((t) => {
    if (!t.prospect_id) return;
    if (!tasksByProspect.has(t.prospect_id)) tasksByProspect.set(t.prospect_id, []);
    tasksByProspect.get(t.prospect_id)!.push({ title: t.title, due: t.due, done: t.done });
  });

  const modelPortfolios = new Map<string, (typeof portfolios)[number]>(RISK_PROFILE_KEYS.map((p, i) => [p, portfolios[i]]));

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

  const prospectInput: RadarProspectInput[] = (prospects ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    tasks: tasksByProspect.get(p.id) ?? [],
  }));

  return buildRadarData(input, modelPortfolios, todayIso(), prospectInput);
});
