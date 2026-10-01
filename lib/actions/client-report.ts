"use server";

import { requireUser } from "@/lib/supabase/server";
import { getClientWithSnapshots } from "@/lib/queries/portfolio";
import { getBenchmarkLevels, getClientBenchmarkWeights } from "@/lib/queries/benchmark";
import { getAdvisorLogoUrl } from "@/lib/queries/advisor";
import { toUsdSnapshotsByMonth } from "@/lib/finance";
import { buildClientReportData, type ClientReportData } from "@/lib/reports/client-report";

export type ClientReportResult =
  | { ok: true; data: ClientReportData; advisorName: string | null; logoUrl: string | null }
  | { ok: false; error: string };

export async function getClientReport(clientId: string, asOfMonth: string): Promise<ClientReportResult> {
  if (!/^\d{4}-\d{2}$/.test(asOfMonth)) return { ok: false, error: "Elegí una fecha de corte válida." };
  const { supabase, user } = await requireUser();
  const [client, levels, weights, logoUrl, { data: advisor }] = await Promise.all([
    getClientWithSnapshots(supabase, clientId),
    getBenchmarkLevels(supabase),
    getClientBenchmarkWeights(supabase, clientId),
    getAdvisorLogoUrl(supabase, user.id),
    supabase.from("advisors").select("name").eq("id", user.id).maybeSingle(),
  ]);
  if (!client) return { ok: false, error: "No se encontró el cliente." };
  // Same USD conversion as the consolidado page (each month at its own rate).
  const accounts = client.accounts.map((a) => ({ id: a.id, label: a.label, custodian: a.custodian, snapshots: toUsdSnapshotsByMonth(a.snapshots) }));
  const data = buildClientReportData(client.name, accounts, asOfMonth, { levels, weightsByMonth: weights });
  if (!data.accounts.length) return { ok: false, error: "No hay estados de cuenta a esa fecha." };
  return { ok: true, data, advisorName: advisor?.name?.trim() || null, logoUrl };
}
