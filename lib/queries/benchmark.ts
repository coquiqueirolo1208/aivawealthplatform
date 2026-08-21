import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { BenchmarkLevel } from "@/lib/finance/benchmark";

export async function getBenchmarkLevels(supabase: SupabaseClient<Database>): Promise<Record<string, BenchmarkLevel>> {
  const { data, error } = await supabase.from("benchmark_levels").select("*").order("month");
  if (error) throw error;
  const out: Record<string, BenchmarkLevel> = {};
  for (const row of data ?? []) out[row.month] = { msci: row.msci, agg: row.agg };
  return out;
}

/** month -> MSCI World share (0-100) this client uses from that month on. */
export async function getClientBenchmarkWeights(
  supabase: SupabaseClient<Database>,
  clientId: string,
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("client_benchmark_weights")
    .select("month, msci_pct")
    .eq("client_id", clientId)
    .order("month");
  if (error) throw error;
  const out: Record<string, number> = {};
  for (const row of data ?? []) out[row.month] = row.msci_pct;
  return out;
}
