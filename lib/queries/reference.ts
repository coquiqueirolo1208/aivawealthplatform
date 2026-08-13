import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { FundRow, ModelPortfolio } from "@/lib/finance/types";

/** The full fund watchlist (~590 rows) — used for fuzzy matching (refineAssetAllocation, matchInvestecFundPerf, etc). */
export async function getFunds(supabase: SupabaseClient<Database>): Promise<FundRow[]> {
  const { data, error } = await supabase.from("funds").select("*");
  if (error) throw error;
  return (data ?? []).map((f) => ({
    isin: f.isin,
    name: f.name,
    cat: f.cat,
    sub: f.sub,
    rt: f.rt,
    d1: f.d1,
    w1: f.w1,
    m1: f.m1,
    qtd: f.qtd,
    ytd: f.ytd,
    y1: f.y1,
    y3: f.y3,
    y5: f.y5,
    si: f.si,
    y2021: f.y2021,
    y2022: f.y2022,
    y2023: f.y2023,
    y2024: f.y2024,
    y2025: f.y2025,
    sh3: f.sh3,
    sh5: f.sh5,
    aum: f.aum,
  }));
}

export async function getModelPortfolio(
  supabase: SupabaseClient<Database>,
  key: string,
): Promise<ModelPortfolio | null> {
  const { data: pf, error: pfError } = await supabase.from("model_portfolios").select("*").eq("key", key).maybeSingle();
  if (pfError) throw pfError;
  if (!pf) return null;
  const { data: holdings, error: hError } = await supabase
    .from("model_portfolio_holdings")
    .select("isin, name, sector, section, weight")
    .eq("portfolio_key", key);
  if (hError) throw hError;
  return { key: pf.key, label: pf.label, cash: pf.cash, holdings: holdings ?? [] };
}
