// Quarterly advisory fees: annual % on AUM, billed per calendar quarter on the
// average of the quarter's month-end values, with an optional annual minimum.

/** "YYYY-Qn" for the quarter containing a "YYYY-MM" month. */
export function quarterOf(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${y}-Q${Math.ceil(m / 3)}`;
}

export function quarterMonths(quarter: string): string[] {
  const [y, q] = quarter.split("-Q").map(Number);
  return [1, 2, 3].map((i) => `${y}-${String((q - 1) * 3 + i).padStart(2, "0")}`);
}

export function shiftQuarter(quarter: string, delta: number): string {
  const [y, q] = quarter.split("-Q").map(Number);
  const idx = y * 4 + (q - 1) + delta;
  return `${Math.floor(idx / 4)}-Q${(idx % 4) + 1}`;
}

/** The most recent quarter that has fully ended as of `todayIso` (YYYY-MM-DD). */
export function lastClosedQuarter(todayIso: string): string {
  return shiftQuarter(quarterOf(todayIso.slice(0, 7)), -1);
}

export function quarterLabel(quarter: string): string {
  const [y, q] = quarter.split("-Q");
  return `T${q} ${y}`;
}

export interface QuarterFee {
  /** Average of the quarter's available month-end values; null when none are loaded. */
  baseAum: number | null;
  monthsUsed: number;
  fee: number | null;
  minimumApplied: boolean;
}

export function computeQuarterFee(
  monthlyValues: Record<string, number>,
  quarter: string,
  feePct: number | null,
  minAnnual: number | null,
): QuarterFee {
  const vals = quarterMonths(quarter)
    .map((m) => monthlyValues[m])
    .filter((v): v is number => typeof v === "number");
  const baseAum = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  if (baseAum == null || feePct == null) return { baseAum, monthsUsed: vals.length, fee: null, minimumApplied: false };
  const byPct = (baseAum * feePct) / 100 / 4;
  const minQ = minAnnual ? minAnnual / 4 : 0;
  return { baseAum, monthsUsed: vals.length, fee: Math.max(byPct, minQ), minimumApplied: minQ > byPct };
}
