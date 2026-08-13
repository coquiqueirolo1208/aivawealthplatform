import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { InvestecFundAllocationRow, InvestecFundInfo } from "@/lib/finance/types";

export interface InvestecSolution {
  id: string;
  badge: string | null;
  name: string;
  isin: string | null;
  risk: string | null;
  equityRange: string | null;
  allocKey: string | null;
  ydKey: string | null;
  tipoRfKey: string | null;
  fullName: string | null;
  evoKey: string | null;
}

export interface InvestecClassRow {
  solutionId: string;
  className: string;
  isinAcc: string | null;
  isinDist: string | null;
  managementFeeBps: number | null;
  terPct: number | null;
  allInPct: number | null;
}

export interface InvestecDataBlob {
  fundAllocation: Record<string, InvestecFundAllocationRow[]>;
  aaTiempo: Record<string, Array<Record<string, string | number | null>>>;
  fundInfo: InvestecFundInfo[];
  top10: { fixedIncome: string[]; equity: string[] };
  yd: Record<string, { yield: number; duration: number; funds: Array<{ fondo: string; peso: number; yield: number; duration: number }> }>;
  regional: {
    equityRegions: Record<string, Record<string, number>>;
    bondRegions: Record<string, Record<string, number>>;
    currencies: Record<string, Record<string, number>>;
  };
  tipoRentaFija: Record<string, Record<string, number>>;
}

export async function getInvestecSolutions(supabase: SupabaseClient<Database>): Promise<InvestecSolution[]> {
  const { data, error } = await supabase.from("investec_solutions").select("*");
  if (error) throw error;
  return (data ?? []).map((s) => ({
    id: s.id,
    badge: s.badge,
    name: s.name,
    isin: s.isin,
    risk: s.risk,
    equityRange: s.equity_range,
    allocKey: s.alloc_key,
    ydKey: s.yd_key,
    tipoRfKey: s.tipo_rf_key,
    fullName: s.full_name,
    evoKey: s.evo_key,
  }));
}

export async function getInvestecClasses(supabase: SupabaseClient<Database>): Promise<InvestecClassRow[]> {
  const { data, error } = await supabase.from("investec_classes").select("*");
  if (error) throw error;
  return (data ?? []).map((c) => ({
    solutionId: c.solution_id,
    className: c.class_name,
    isinAcc: c.isin_acc,
    isinDist: c.isin_dist,
    managementFeeBps: c.management_fee_bps,
    terPct: c.ter_pct,
    allInPct: c.all_in_pct,
  }));
}

export async function getInvestecDataBlob(supabase: SupabaseClient<Database>): Promise<InvestecDataBlob | null> {
  const { data, error } = await supabase.from("reference_data").select("data").eq("key", "investec_data").maybeSingle();
  if (error) throw error;
  return (data?.data as unknown as InvestecDataBlob) ?? null;
}
