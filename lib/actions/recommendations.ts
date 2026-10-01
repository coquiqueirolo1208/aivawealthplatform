"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { getClientWithSnapshots } from "@/lib/queries/portfolio";
import { buildPortfolioSummaryForRecs, currentFingerprint, toUsdSnapshotsByMonth } from "@/lib/finance";
import { getRecommendations } from "@/lib/ai/recommendations";
import { getMeetingPrep } from "@/lib/ai/meeting-prep";
import { todayIso } from "@/lib/dates";
import { aiErrorMessage } from "@/lib/ai/anthropic";

type ActionResult = { error: string | null };

/** USD-converted accounts — the same conversion the consolidado page uses, so fingerprints match. */
async function loadClientAccounts(clientId: string) {
  const { supabase } = await requireUser();
  const client = await getClientWithSnapshots(supabase, clientId);
  if (!client) return { supabase, client: null, accs: [] };
  const accs = client.accounts.map((a) => ({ account: a, snapshots: toUsdSnapshotsByMonth(a.snapshots) }));
  return { supabase, client, accs };
}

export async function refreshRecommendations(clientId: string): Promise<ActionResult> {
  const { supabase, client, accs } = await loadClientAccounts(clientId);
  if (!client) return { error: "No se encontró el cliente." };
  try {
    const result = await getRecommendations(buildPortfolioSummaryForRecs(accs));
    const { error } = await supabase.from("recommendations_cache").upsert({
      client_id: clientId,
      fecha: result.fecha,
      resumen_mercado: result.resumenMercado,
      cambiar: result.cambiar,
      mantener_con_condicion: result.mantenerConCondicion,
      estructurales: result.estructurales,
      fingerprint: currentFingerprint(accs),
    });
    if (error) throw error;
  } catch (e) {
    console.error("refreshRecommendations", e);
    return { error: aiErrorMessage(e, "No se pudieron generar las recomendaciones. Probá de nuevo en un rato.") };
  }
  revalidatePath(`/clientes/${clientId}`, "layout");
  return { error: null };
}

export async function refreshMeetingPrep(clientId: string): Promise<ActionResult> {
  const { supabase, client, accs } = await loadClientAccounts(clientId);
  if (!client) return { error: "No se encontró el cliente." };
  try {
    const [{ data: tasks, error: tasksError }, { data: notes, error: notesError }, { data: docs, error: docsError }] =
      await Promise.all([
        supabase.from("tasks").select("title, due").eq("client_id", clientId).eq("done", false),
        supabase.from("client_notes").select("texto, created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(5),
        supabase.from("client_documents").select("tipo, estado, vencimiento").eq("client_id", clientId),
      ]);
    if (tasksError) throw tasksError;
    if (notesError) throw notesError;
    if (docsError) throw docsError;

    const today = todayIso();
    const sections = [
      `Cliente: ${client.name}. Fecha de hoy: ${today}. Montos en USD.`,
      "Cartera:\n" + (accs.length ? buildPortfolioSummaryForRecs(accs) : "Sin estados de cuenta cargados."),
      "Tareas pendientes:\n" +
        ((tasks ?? []).map((t) => `- ${t.title}${t.due ? ` (vence ${t.due}${t.due < today ? ", VENCIDA" : ""})` : ""}`).join("\n") || "Ninguna."),
      "Últimas notas del asesor:\n" + ((notes ?? []).map((n) => `- ${n.created_at.slice(0, 10)}: ${n.texto}`).join("\n") || "Ninguna."),
      "Documentos:\n" +
        ((docs ?? []).map((d) => `- ${d.tipo}: ${d.estado}${d.vencimiento ? `, vence ${d.vencimiento}` : ""}`).join("\n") || "Ninguno cargado."),
    ];
    const text = await getMeetingPrep(sections.join("\n\n"));
    const { error } = await supabase
      .from("meeting_prep_cache")
      .upsert({ client_id: clientId, text, generated_at: new Date().toISOString() });
    if (error) throw error;
  } catch (e) {
    console.error("refreshMeetingPrep", e);
    return { error: aiErrorMessage(e, "No se pudo preparar la reunión. Probá de nuevo en un rato.") };
  }
  revalidatePath(`/clientes/${clientId}`, "layout");
  return { error: null };
}
