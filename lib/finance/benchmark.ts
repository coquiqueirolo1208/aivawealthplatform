// Ported verbatim from dashboard_patrimonial_13.html computeBenchmarkReturns (line 4302),
// extended so each client can have their own MSCI World / Bloomberg Agg mix per month
// instead of one fixed 70/30 for everyone.
import { prevMonthKey } from "./core";

/** MSCI World weight used for any month the client hasn't set their own for. */
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
  /** Blended using the weight in effect for the latest month. */
  blendMTD: number | null;
  /**
   * Chains each month's own blended return (using whichever weight was in effect that
   * month) from December of last year through the latest month, rather than blending
   * the two YTD endpoint returns with today's weight — so a mid-year mix change is
   * reflected correctly instead of being applied retroactively to the whole year.
   */
  blendYTD: number | null;
}

/** The weight in effect for `month`: the latest one set at or before it, else the default. */
function weightForMonth(weightsByMonth: Record<string, number>, month: string): number {
  let best: string | null = null;
  for (const m of Object.keys(weightsByMonth)) {
    if (m <= month && (best === null || m > best)) best = m;
  }
  return best !== null ? weightsByMonth[best] : DEFAULT_MSCI_WEIGHT_PCT;
}

/** `weightsByMonth`: month ("YYYY-MM") -> MSCI World share (0-100) in effect from that month on. */
export function computeBenchmarkReturns(
  benchmarkLevels: Record<string, BenchmarkLevel>,
  weightsByMonth: Record<string, number> = {},
): BenchmarkReturns | null {
  const months = Object.keys(benchmarkLevels).sort();
  if (!months.length) return null;
  const latest = months[months.length - 1];
  const prevMonth = prevMonthKey(latest);
  const year = latest.split("-")[0];
  const decMonth = parseInt(year, 10) - 1 + "-12";

  function periodReturn(key: keyof BenchmarkLevel, from: string, to: string): number | null {
    const cur = benchmarkLevels[to] ? benchmarkLevels[to][key] : null;
    const prev = benchmarkLevels[from] ? benchmarkLevels[from][key] : null;
    return cur != null && prev != null && prev !== 0 ? ((cur - prev) / prev) * 100 : null;
  }

  const msciMTD = periodReturn("msci", prevMonth, latest);
  const aggMTD = periodReturn("agg", prevMonth, latest);
  const msciYTD = periodReturn("msci", decMonth, latest);
  const aggYTD = periodReturn("agg", decMonth, latest);

  const mtdWeight = weightForMonth(weightsByMonth, latest) / 100;
  const blendMTD = msciMTD != null && aggMTD != null ? mtdWeight * msciMTD + (1 - mtdWeight) * aggMTD : null;

  let blendYTD: number | null = null;
  if (benchmarkLevels[decMonth]) {
    // Chains through whichever months actually have a recorded level between decMonth
    // and latest (not every calendar month) — a gap just means that stretch compounds
    // in one step, same tolerance the original single-blend calc had.
    const chainMonths = months.filter((m) => m >= decMonth && m <= latest);
    let idx = 1;
    let ok = true;
    for (let i = 1; i < chainMonths.length; i++) {
      const mMsci = periodReturn("msci", chainMonths[i - 1], chainMonths[i]);
      const mAgg = periodReturn("agg", chainMonths[i - 1], chainMonths[i]);
      if (mMsci == null || mAgg == null) {
        ok = false;
        break;
      }
      const w = weightForMonth(weightsByMonth, chainMonths[i]) / 100;
      idx *= 1 + (w * mMsci + (1 - w) * mAgg) / 100;
    }
    if (ok) blendYTD = (idx - 1) * 100;
  }

  return {
    latestMonth: latest,
    msciMTD,
    msciYTD,
    aggMTD,
    aggYTD,
    blendMTD,
    blendYTD,
  };
}
