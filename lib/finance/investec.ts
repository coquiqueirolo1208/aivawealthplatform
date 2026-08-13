// Ported verbatim from dashboard_patrimonial_13.html:
//   FUND_NAME_ALIASES/expandFundTokens (2913-2923), matchInvestecFundPerf (2924-2939),
//   investecPortfolioMetricsFull (2855-2870), investecBuildManagerOverlap (2987-3005),
//   matchPMHolding/pmPortfolioMetrics/pmPortfolioMetricsFull (2134-2180),
//   computePMTargetWeights (3970-3977), classifyByCat/classifyHoldingByFundDb (3909-3927),
//   refineAssetAllocation (3935-3969).
//
// These all take their reference data (funds, model portfolio, Investec allocation
// rows) as parameters rather than importing globals, so they stay pure/testable —
// the caller fetches that data from Supabase (the `funds`, `model_portfolios` /
// `model_portfolio_holdings`, and `reference_data` tables).

import { normalizeName, aggregateAllocation } from "./core";
import type {
  Account,
  FundRow,
  InvestecFundAllocationRow,
  InvestecFundInfo,
  ModelPortfolio,
  ModelPortfolioHolding,
  Snapshot,
  SnapshotsByMonth,
} from "./types";
import type { AssetType } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Fund-name fuzzy matching (Investec short names <-> AIVA fund watchlist)
// ---------------------------------------------------------------------------

export const FUND_NAME_ALIASES: Record<string, string> = {
  GLB: "GLOBAL",
  GLBL: "GLOBAL",
  EQ: "EQUITY",
  EQTY: "EQUITY",
  INV: "INVESTMENT",
  GR: "GROWTH",
  GRWTH: "GROWTH",
  HY: "HIGHYIELD",
  HIYLD: "HIGHYIELD",
  INCM: "INCOME",
  BD: "BOND",
  BND: "BOND",
  MKTS: "MARKETS",
  MKT: "MARKET",
  EM: "EMERGING",
  EMKT: "EMERGING",
  ALLCP: "ALLCAP",
  OPPS: "OPPORTUNITIES",
  OPP: "OPPORTUNITIES",
  CRDT: "CREDIT",
  DIVERS: "DIVERSIFIED",
  STRAT: "STRATEGIC",
  GBL: "GLOBAL",
  RL: "REAL",
  ESTT: "ESTATE",
  RE: "REAL",
};

export function expandFundTokens(str: string): string[] {
  return normalizeName(str)
    .split(" ")
    .filter(Boolean)
    .map((t) => FUND_NAME_ALIASES[t] || t);
}

/** Token-overlap match of an Investec short fund name against the AIVA watchlist. Requires score >= 0.6. */
export function matchInvestecFundPerf(fondoName: string, fondosDb: FundRow[]): FundRow | null {
  const keyTokens = expandFundTokens(fondoName);
  if (!keyTokens.length) return null;
  let best: FundRow | null = null;
  let bestScore = -1;
  fondosDb.forEach((f) => {
    const nameTokens = expandFundTokens(f.name);
    if (!nameTokens.length) return;
    const matched = keyTokens.filter((t) => nameTokens.includes(t)).length;
    if (!matched) return;
    const score = matched / keyTokens.length;
    if (score > bestScore) {
      bestScore = score;
      best = f;
    }
  });
  return bestScore >= 0.6 ? best : null;
}

export interface PeriodMetrics {
  ytd: number | null;
  y1: number | null;
  y3: number | null;
  y5: number | null;
}

/** Weighted-average return per period across an Investec solution's fund-allocation rows, renormalized over matched funds only. */
export function investecPortfolioMetricsFull(
  allocationRows: InvestecFundAllocationRow[],
  fondosDb: FundRow[],
): PeriodMetrics {
  const periods = ["ytd", "y1", "y3", "y5"] as const;
  const result = {} as PeriodMetrics;
  periods.forEach((p) => {
    let w = 0;
    let wsum = 0;
    allocationRows.forEach((r) => {
      const f = matchInvestecFundPerf(r.fondo, fondosDb);
      if (!f) return;
      const raw = f[p];
      const v = typeof raw === "number" ? raw : parseFloat(raw as unknown as string);
      if (!isNaN(v)) {
        w += v * r.peso;
        wsum += r.peso;
      }
    });
    result[p] = wsum ? w / wsum : null;
  });
  return result;
}

export interface ManagerOverlapEntry {
  manager: string;
  weights: Record<string, number>;
  nSolutions: number;
  total: number;
}

/** Cross-solution manager exposure: managers appearing in >=2 solutions, sorted by #solutions then total weight. */
export function investecBuildManagerOverlap(
  solutions: Array<{ id: string; allocKey: string }>,
  fundAllocationByAllocKey: Record<string, InvestecFundAllocationRow[]>,
  fundInfo: InvestecFundInfo[],
): ManagerOverlapEntry[] {
  const byManager: Record<string, Record<string, number>> = {};
  solutions
    .filter((s) => fundAllocationByAllocKey[s.allocKey])
    .forEach((s) => {
      (fundAllocationByAllocKey[s.allocKey] || []).forEach((r) => {
        const key = normalizeName(r.fondo);
        const info =
          fundInfo.find((f) => f.name && normalizeName(f.name) === key) ||
          fundInfo.find((f) => f.name && (normalizeName(f.name).includes(key) || key.includes(normalizeName(f.name))));
        const manager = info ? info.manager : null;
        if (!manager) return;
        if (!byManager[manager]) byManager[manager] = {};
        byManager[manager][s.id] = (byManager[manager][s.id] || 0) + r.peso;
      });
    });
  return Object.entries(byManager)
    .map(([manager, weights]) => ({
      manager,
      weights,
      nSolutions: Object.keys(weights).length,
      total: Object.values(weights).reduce((a, b) => a + b, 0),
    }))
    .filter((m) => m.nSolutions >= 2)
    .sort((a, b) => b.nSolutions - a.nSolutions || b.total - a.total);
}

// ---------------------------------------------------------------------------
// Model portfolios (PM_DATA)
// ---------------------------------------------------------------------------

export interface PmHoldingMatch {
  fund: FundRow | null;
  proxy: boolean;
}

/**
 * Resolves a model-portfolio holding to a row in the fund watchlist by ISIN.
 * Falls back to the Investec "Composite" share class as a proxy for Investec
 * funds without their exact class tracked (flagged via `proxy: true`).
 *
 * NOTE: ported verbatim including the original's `x.isin.toLowerCase().includes(...)`
 * checks below, which look at the ISIN field for "investec"/"composite" substrings
 * rather than the fund name — preserved as-is per the "port 1:1" mandate; flag to
 * the team as a possible latent bug in the source rather than silently changing it.
 */
export function matchPMHolding(h: ModelPortfolioHolding, fondosDb: FundRow[]): PmHoldingMatch {
  let f = fondosDb.find((x) => x.isin === h.isin) || null;
  if (f) return { fund: f, proxy: false };
  if (/investec/i.test(h.name)) {
    const key = h.name.toLowerCase();
    const want = key.includes("cautious")
      ? "cautious"
      : key.includes("balanced")
        ? "balanced"
        : key.includes("dynamic")
          ? "dynamic"
          : key.includes("select equity")
            ? "select equity"
            : key.includes("fixed income")
              ? "fixed income"
              : null;
    if (want) {
      f =
        fondosDb.find(
          (x) =>
            typeof x.isin === "string" &&
            x.isin.toLowerCase().includes("investec") &&
            x.isin.toLowerCase().includes("composite") &&
            x.name.toLowerCase().includes(want),
        ) || null;
    }
  }
  return { fund: f || null, proxy: !!f };
}

export interface PmMetrics {
  ytd: number | null;
  y1: number | null;
}

/** Weighted YTD/1y of a model portfolio. Divides flat by 100 (weight already in %) — does NOT renormalize over unmatched holdings. */
export function pmPortfolioMetrics(pf: ModelPortfolio, fondosDb: FundRow[]): PmMetrics {
  let wYtd = 0;
  let wY1 = 0;
  let wSum = 0;
  pf.holdings.forEach((h) => {
    const { fund } = matchPMHolding(h, fondosDb);
    if (!fund) return;
    const ytd = typeof fund.ytd === "number" ? fund.ytd : parseFloat(fund.ytd as unknown as string);
    const y1 = typeof fund.y1 === "number" ? fund.y1 : parseFloat(fund.y1 as unknown as string);
    if (!isNaN(ytd)) {
      wYtd += ytd * h.weight;
      wSum += h.weight;
    }
    if (!isNaN(y1)) wY1 += y1 * h.weight;
  });
  return { ytd: wSum ? wYtd / 100 : null, y1: wSum ? wY1 / 100 : null };
}

/** Same as pmPortfolioMetrics but for ytd/y1/y3/y5 (no 2-year window: not in the fund watchlist). */
export function pmPortfolioMetricsFull(pf: ModelPortfolio, fondosDb: FundRow[]): PeriodMetrics {
  const periods = ["ytd", "y1", "y3", "y5"] as const;
  const result = {} as PeriodMetrics;
  periods.forEach((p) => {
    let w = 0;
    pf.holdings.forEach((h) => {
      const { fund } = matchPMHolding(h, fondosDb);
      if (!fund) return;
      const raw = fund[p];
      const v = typeof raw === "number" ? raw : parseFloat(raw as unknown as string);
      if (!isNaN(v)) w += v * h.weight;
    });
    result[p] = w / 100;
  });
  return result;
}

/** Aggregates a model portfolio's per-fund target weights into asset-class-level targets. */
export function computePMTargetWeights(pf: ModelPortfolio | null | undefined): Record<string, number> | null {
  if (!pf) return null;
  const sections: Record<string, number> = {};
  pf.holdings.forEach((h) => {
    sections[h.section] = (sections[h.section] || 0) + h.weight;
  });
  sections["Efectivo"] = pf.cash;
  return sections;
}

// ---------------------------------------------------------------------------
// Reclassifying the generic "Fondos Mutuos" bucket (refineAssetAllocation)
// ---------------------------------------------------------------------------

export function classifyByCat(fund: Pick<FundRow, "cat">): "Renta Variable" | "Renta Fija" | "Multi Activo" | null {
  const cat = (fund.cat || "").toLowerCase();
  if (cat.includes("acciones")) return "Renta Variable";
  if (cat.includes("renta fija")) return "Renta Fija";
  if (cat.includes("balanced") || cat.includes("convertibles") || cat.includes("infraestructura") || cat.includes("cocos")) {
    return "Multi Activo";
  }
  return null;
}

export function classifyHoldingByFundDb(holdingName: string, fondosDb: FundRow[]): ReturnType<typeof classifyByCat> {
  const key = normalizeName(holdingName);
  if (!key) return null;
  let match = fondosDb.find((f) => normalizeName(f.name) === key);
  if (!match) {
    match = fondosDb.find((f) => {
      const fk = normalizeName(f.name);
      return fk && (fk.includes(key) || key.includes(fk));
    });
  }
  return match ? classifyByCat(match) : null;
}

export interface RefinedAllocation {
  refined: Record<AssetType | "Multi Activo", number>;
  coveragePct: number;
  fondosMutuosTotal: number;
  leftoverFM: number;
}

/**
 * Reclassifies the generic "Fondos Mutuos" allocation bucket into Renta
 * Variable / Renta Fija / Multi Activo by matching every holding across all
 * accounts against the fund watchlist — then scales the classified amounts down
 * (never up) to fit within the actual "Fondos Mutuos" total, since matched
 * holdings may include positions reported under other buckets too.
 */
export function refineAssetAllocation(
  accountLatestSnapshots: Snapshot[],
  fondosDb: FundRow[],
): RefinedAllocation {
  const base = aggregateAllocation(accountLatestSnapshots);
  const fondosMutuosTotal = base["Fondos Mutuos"] || 0;

  let classifiedRV = 0;
  let classifiedRF = 0;
  let classifiedMA = 0;
  let classifiedSum = 0;
  accountLatestSnapshots.forEach((snap) => {
    (snap.holdings || []).forEach((h) => {
      const cls = classifyHoldingByFundDb(h.nombre, fondosDb);
      if (!cls) return;
      const val = Number(h.valor) || 0;
      classifiedSum += val;
      if (cls === "Renta Variable") classifiedRV += val;
      else if (cls === "Renta Fija") classifiedRF += val;
      else if (cls === "Multi Activo") classifiedMA += val;
    });
  });

  let addRV = 0;
  let addRF = 0;
  let addMA = 0;
  let leftoverFM = fondosMutuosTotal;
  if (classifiedSum > 0 && fondosMutuosTotal > 0) {
    const scale = Math.min(fondosMutuosTotal / classifiedSum, 1);
    addRV = classifiedRV * scale;
    addRF = classifiedRF * scale;
    addMA = classifiedMA * scale;
    leftoverFM = Math.max(fondosMutuosTotal - (addRV + addRF + addMA), 0);
  }
  const refined = { ...base, "Multi Activo": 0 } as Record<AssetType | "Multi Activo", number>;
  refined["Renta Variable"] = (base["Renta Variable"] || 0) + addRV;
  refined["Renta Fija"] = (base["Renta Fija"] || 0) + addRF;
  refined["Multi Activo"] = addMA;
  refined["Fondos Mutuos"] = leftoverFM;
  const coveragePct = fondosMutuosTotal > 0 ? ((fondosMutuosTotal - leftoverFM) / fondosMutuosTotal) * 100 : 100;
  return { refined, coveragePct, fondosMutuosTotal, leftoverFM };
}

// Re-exported for convenience so callers don't need to import from ./core too.
export type { Account, SnapshotsByMonth };
