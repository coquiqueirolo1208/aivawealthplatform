// Ported verbatim from dashboard_patrimonial_13.html (lines 1834-1850, 1981-1988).
import type { FundRow } from "./types";

export interface FundIndexSeries {
  labels: string[];
  points: number[];
}

/**
 * Reconstructs a base-100 growth index from a fund's calendar-year returns
 * (2021-2025) plus YTD. A year with a null/NaN return is skipped entirely (not
 * zero-filled), so gaps compress the timeline rather than inserting flat segments.
 */
export function buildFundIndexSeries(f: FundRow): FundIndexSeries {
  const years: Array<[string, number | null | undefined]> = [
    ["2021", f.y2021],
    ["2022", f.y2022],
    ["2023", f.y2023],
    ["2024", f.y2024],
    ["2025", f.y2025],
  ];
  let idx = 100;
  const points = [idx];
  const labels = ["2020"];
  years.forEach(([label, ret]) => {
    const n = typeof ret === "number" ? ret : parseFloat(ret as unknown as string);
    if (ret == null || isNaN(n)) return;
    idx = idx * (1 + n / 100);
    points.push(idx);
    labels.push(label);
  });
  const ytdN = typeof f.ytd === "number" ? f.ytd : parseFloat(f.ytd as unknown as string);
  if (f.ytd != null && !isNaN(ytdN)) {
    idx = idx * (1 + ytdN / 100);
    points.push(idx);
    labels.push("YTD " + ytdN.toFixed(1) + "%");
  }
  return { labels, points };
}

/** Sample standard deviation (n-1) of the fund's 5 calendar-year returns, as a volatility proxy. Needs ≥2 valid years. */
export function computeFundRisk(f: FundRow): number | null {
  const vals = [f.y2021, f.y2022, f.y2023, f.y2024, f.y2025]
    .map((v) => (typeof v === "number" ? v : parseFloat(v as unknown as string)))
    .filter((v) => !isNaN(v));
  if (vals.length < 2) return null;
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  const variance = vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (vals.length - 1);
  return Math.sqrt(variance);
}
