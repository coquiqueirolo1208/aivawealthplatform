import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fetchAllIn, getAdvisorClientsWithSnapshots } from "@/lib/queries/portfolio";
import { computeQuarterFee, consolidatedMonthlyValues, toUsdSnapshotsByMonth } from "@/lib/finance";

type FeeRecordRow = Database["public"]["Tables"]["fee_records"]["Row"];

export interface FeeRow {
  clientId: string;
  name: string;
  feePct: number | null;
  feeMinAnnual: number | null;
  /** Estimate from the statements (USD). */
  baseAum: number | null;
  monthsUsed: number;
  estimate: number | null;
  minimumApplied: boolean;
  /** What was actually invoiced, frozen at invoicing time; null = not invoiced yet. */
  record: { id: string; status: "facturado" | "cobrado"; amount: number; baseAum: number | null; feePct: number | null; invoicedAt: string; paidAt: string | null } | null;
}

export interface FeesSummary {
  rows: FeeRow[];
  /** Invoiced amount where there is one, else the estimate. */
  total: number;
  facturado: number;
  cobrado: number;
  sinFacturar: number;
  sinConfigurar: number;
}

export const loadFeesData = cache(async (supabase: SupabaseClient<Database>, advisorId: string, quarter: string): Promise<FeesSummary> => {
  const clients = await getAdvisorClientsWithSnapshots(supabase, advisorId);
  const ids = clients.map((c) => c.id);
  const [settings, records] = await Promise.all([
    fetchAllIn(ids, (chunk, from, to) =>
      supabase.from("clients").select("id, fee_pct, fee_min_annual").in("id", chunk).order("id").range(from, to),
    ),
    fetchAllIn(ids, (chunk, from, to) =>
      supabase.from("fee_records").select("*").in("client_id", chunk).eq("period", quarter).order("id").range(from, to),
    ),
  ]);
  const settingsById = new Map(settings.map((s) => [s.id, s]));
  const recordByClient = new Map<string, FeeRecordRow>(records.map((r) => [r.client_id, r]));

  const rows: FeeRow[] = clients.map((c) => {
    const s = settingsById.get(c.id);
    const feePct = s?.fee_pct ?? null;
    const feeMinAnnual = s?.fee_min_annual ?? null;
    const monthly = consolidatedMonthlyValues(c.accounts.map((a) => ({ snapshots: toUsdSnapshotsByMonth(a.snapshots) })));
    const q = computeQuarterFee(monthly, quarter, feePct, feeMinAnnual);
    const r = recordByClient.get(c.id);
    return {
      clientId: c.id,
      name: c.name,
      feePct,
      feeMinAnnual,
      baseAum: q.baseAum,
      monthsUsed: q.monthsUsed,
      estimate: q.fee,
      minimumApplied: q.minimumApplied,
      record: r
        ? { id: r.id, status: r.status, amount: r.amount, baseAum: r.base_aum, feePct: r.fee_pct, invoicedAt: r.invoiced_at, paidAt: r.paid_at }
        : null,
    };
  });

  let total = 0;
  let facturado = 0;
  let cobrado = 0;
  let sinFacturar = 0;
  for (const r of rows) {
    if (r.record) {
      total += r.record.amount;
      facturado += r.record.amount;
      if (r.record.status === "cobrado") cobrado += r.record.amount;
    } else if (r.estimate != null) {
      total += r.estimate;
      sinFacturar += r.estimate;
    }
  }
  return { rows, total, facturado, cobrado, sinFacturar, sinConfigurar: rows.filter((r) => r.feePct == null).length };
});
