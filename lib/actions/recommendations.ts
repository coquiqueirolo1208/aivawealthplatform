"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdvisorClientsWithSnapshots } from "@/lib/queries/portfolio";
import { buildPortfolioSummaryForRecs, currentFingerprint } from "@/lib/finance";
import { getRecommendations } from "@/lib/ai/recommendations";

export async function refreshRecommendations(clientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const clients = await getAdvisorClientsWithSnapshots(supabase, user.id);
  const client = clients.find((c) => c.id === clientId);
  if (!client) return;

  const accs = client.accounts.map((a) => ({ account: a, snapshots: a.snapshots }));
  const summary = buildPortfolioSummaryForRecs(accs);
  const result = await getRecommendations(summary);
  const fingerprint = currentFingerprint(accs);

  const { error } = await supabase.from("recommendations_cache").upsert({
    client_id: clientId,
    fecha: result.fecha,
    resumen_mercado: result.resumenMercado,
    cambiar: result.cambiar,
    mantener_con_condicion: result.mantenerConCondicion,
    estructurales: result.estructurales,
    fingerprint,
  });
  if (error) throw error;
  revalidatePath(`/clientes/${clientId}`);
}
