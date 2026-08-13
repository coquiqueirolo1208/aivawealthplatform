// Ported from dashboard_patrimonial_13.html buildOfficeAUMSeries (line ~3201).
// The original fetches per-account snapshots with an N+1 loop over the KV store;
// in Supabase that fetch becomes a single query (done by the caller). This module
// keeps only the pure aggregation math so it can be unit tested without a DB.

export const QUARTER_END_MONTHS = ["03", "06", "09", "12"] as const;

export function monthsInRange(fromYM: string, toYM: string): string[] {
  const out: string[] = [];
  let [y, m] = fromYM.split("-").map(Number);
  const [ty, tm] = toYM.split("-").map(Number);
  let guard = 0;
  while ((y < ty || (y === ty && m <= tm)) && guard < 600) {
    out.push(y + "-" + String(m).padStart(2, "0"));
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
    guard++;
  }
  return out;
}

export interface OfficeAumPoint {
  x: string;
  y: number | null;
}

/**
 * `perAccountSparse`: one sparse {month: valorActual} map per account (already
 * fetched from the DB by the caller). Carries the last known value of each account
 * forward to fill months without a statement, sums across accounts (null if no
 * account has any data yet that month), optionally keeps only quarter-end months
 * (+ the last month), and trims leading months before the first real data point.
 */
export function computeOfficeAumSeries(
  perAccountSparse: Array<Record<string, number>>,
  months: string[],
  granularity: "monthly" | "quarterly",
): OfficeAumPoint[] {
  if (!months.length) return [];

  function valueAtOrBefore(sparse: Record<string, number>, month: string): number | null {
    let best: string | null = null;
    Object.keys(sparse).forEach((m) => {
      if (m <= month && (best === null || m > best)) best = m;
    });
    return best !== null ? sparse[best] : null;
  }

  const totalsByMonth: Record<string, number | null> = {};
  months.forEach((month) => {
    let sum = 0;
    let any = false;
    perAccountSparse.forEach((sparse) => {
      const v = valueAtOrBefore(sparse, month);
      if (v !== null) {
        sum += v;
        any = true;
      }
    });
    totalsByMonth[month] = any ? sum : null;
  });

  let result: OfficeAumPoint[];
  if (granularity === "quarterly") {
    const lastMonth = months[months.length - 1];
    result = months
      .filter((m) => (QUARTER_END_MONTHS as readonly string[]).includes(m.split("-")[1]) || m === lastMonth)
      .map((m) => ({ x: m, y: totalsByMonth[m] }));
  } else {
    result = months.map((m) => ({ x: m, y: totalsByMonth[m] }));
  }

  const firstIdx = result.findIndex((p) => p.y != null);
  return firstIdx > 0 ? result.slice(firstIdx) : result;
}
