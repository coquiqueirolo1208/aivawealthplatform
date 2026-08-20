// Ported verbatim from dashboard_patrimonial_13.html computeBenchmarkReturns (line 4302).
import { prevMonthKey } from "./core";

/** Default MSCI World weight when a client hasn't set their own (the rest goes to Bloomberg Global Agg). */
export const DEFAULT_MSCI_WEIGHT_PCT = 70;

export interface BenchmarkLevel {
  msci: number | null;
  agg: number | null;
}

export interface BenchmarkReturns {
  latestMonth: string;
  msciMTD: number | null;
  msciYTD: number | null;
  aggMTD: number | null;
  aggYTD: number | null;
  /** Weighted average of the two returns, using this client's own MSCI/Agg split. */
  blendMTD: number | null;
  blendYTD: number | null;
}

/** `msciWeightPct`: 0-100, share allocated to MSCI World — the rest goes to Bloomberg Global Agg. */
export function computeBenchmarkReturns(
  benchmarkLevels: Record<string, BenchmarkLevel>,
  msciWeightPct: number = DEFAULT_MSCI_WEIGHT_PCT,
): BenchmarkReturns | null {
  const months = Object.keys(benchmarkLevels).sort();
  if (!months.length) return null;
  const latest = months[months.length - 1];
  const prevMonth = prevMonthKey(latest);
  const year = latest.split("-")[0];
  const decMonth = parseInt(year, 10) - 1 + "-12";

  function ret(key: keyof BenchmarkLevel) {
    const cur = benchmarkLevels[latest] ? benchmarkLevels[latest][key] : null;
    const prev = benchmarkLevels[prevMonth] ? benchmarkLevels[prevMonth][key] : null;
    const dec = benchmarkLevels[decMonth] ? benchmarkLevels[decMonth][key] : null;
    const mtd = cur != null && prev != null && prev !== 0 ? ((cur - prev) / prev) * 100 : null;
    const ytd = cur != null && dec != null && dec !== 0 ? ((cur - dec) / dec) * 100 : null;
    return { mtd, ytd };
  }

  const msci = ret("msci");
  const agg = ret("agg");
  const msciWeight = msciWeightPct / 100;
  const aggWeight = 1 - msciWeight;
  return {
    latestMonth: latest,
    msciMTD: msci.mtd,
    msciYTD: msci.ytd,
    aggMTD: agg.mtd,
    aggYTD: agg.ytd,
    blendMTD: msci.mtd != null && agg.mtd != null ? msciWeight * msci.mtd + aggWeight * agg.mtd : null,
    blendYTD: msci.ytd != null && agg.ytd != null ? msciWeight * msci.ytd + aggWeight * agg.ytd : null,
  };
}
