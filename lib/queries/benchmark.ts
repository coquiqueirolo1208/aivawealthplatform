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
