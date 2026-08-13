import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type IdeaRow = Record<string, unknown>;

export async function getIdeasFunds(supabase: SupabaseClient<Database>): Promise<IdeaRow[]> {
  const { data, error } = await supabase.from("ideas_funds").select("*");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    isinAcc: r.isin_acc,
    name: r.name,
    class: r.class,
    sector: r.sector,
    subsector: r.subsector,
    currency: r.currency,
    ytd: r.ytd,
    ret1y: r.ret1y,
    ret3y: r.ret3y,
    ret5y: r.ret5y,
    minInvest: r.min_invest,
    vol3y: r.vol3y,
    sharpe3y: r.sharpe3y,
    expenseRatio: r.expense_ratio,
    dvdYield: r.dvd_yield,
    dvdFreq: r.dvd_freq,
    isinDist: r.isin_dist,
    inceptionDate: r.inception_date,
    ticker: r.ticker,
  }));
}

export async function getIdeasEtfs(supabase: SupabaseClient<Database>): Promise<IdeaRow[]> {
  const { data, error } = await supabase.from("ideas_etfs").select("*");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    isinAcc: r.isin_acc,
    name: r.name,
    sector: r.sector,
    subsector: r.subsector,
    tickerAcc: r.ticker_acc,
    tickerDist: r.ticker_dist,
    manager: r.manager,
    strategy: r.strategy,
    inception: r.inception,
    totalAssetsM: r.total_assets_m,
    price: r.price,
    ytd: r.ytd,
    ret1y: r.ret1y,
    ret3y: r.ret3y,
    isinDist: r.isin_dist,
    dvdYield: r.dvd_yield,
    cost: r.cost,
  }));
}

export async function getIdeasBonds(supabase: SupabaseClient<Database>): Promise<IdeaRow[]> {
  const { data, error } = await supabase.from("ideas_bonds").select("*");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    isin: r.isin,
    issuer: r.issuer,
    sector: r.sector,
    subsector: r.subsector,
    maturity: r.maturity,
    coupon: r.coupon,
    couponType: r.coupon_type,
    price: r.price,
    ytm: r.ytm,
    minPiece: r.min_piece,
    increment: r.increment,
    country: r.country,
    seniority: r.seniority,
    rule144a: r.rule144a,
    ratingSP: r.rating_sp,
    ratingMoody: r.rating_moody,
    duration: r.duration,
    callable: r.callable,
    nextCall: r.next_call,
    ytc: r.ytc,
    outstanding: r.outstanding,
  }));
}

export async function getIdeasStocks(supabase: SupabaseClient<Database>): Promise<IdeaRow[]> {
  const { data, error } = await supabase.from("ideas_stocks").select("*");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    isin: r.isin,
    name: r.name,
    sector: r.sector,
    industry: r.industry,
    ticker: r.ticker,
    currency: r.currency,
    price: r.price,
    targetMedian: r.target_median,
    expGrowth: r.exp_growth,
    dvdYield: r.dvd_yield,
    ytd: r.ytd,
    ret1y: r.ret1y,
    ret3y: r.ret3y,
    ret5y: r.ret5y,
    vol6m: r.vol6m,
    country: r.country,
    mktCapB: r.mkt_cap_b,
  }));
}
