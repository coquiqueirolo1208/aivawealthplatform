// Ported verbatim from dashboard_patrimonial_13.html (lines ~930-1108, 3330-3369).
// Do not "fix" or simplify these — they encode specific, deliberate business rules
// (e.g. what counts as an external flow vs. internal trading activity) that were
// worked out against real custodian statements. Change behavior only with sign-off.

import { ASSET_TYPES, type AssetType } from "@/lib/constants";
import type { Account, Snapshot, SnapshotsByMonth } from "./types";

export function latestMonth(snapMap: SnapshotsByMonth | undefined | null): string | null {
  const months = Object.keys(snapMap || {}).sort();
  return months.length ? months[months.length - 1] : null;
}

export function prevMonthKey(m: string): string {
  const parts = m.split("-").map(Number);
  let py = parts[0];
  let pmo = parts[1] - 1;
  if (pmo === 0) {
    pmo = 12;
    py = py - 1;
  }
  return py + "-" + String(pmo).padStart(2, "0");
}

export function monthDiff(a: string, b: string): number {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}

/** Fuzzy fund-name key: uppercases, strips share-class/currency/ISIN noise. */
export function normalizeName(s: string | null | undefined): string {
  let t = (s || "").toUpperCase();
  t = t.replace(/\([^)]*\)/g, " ");
  t = t.replace(/\b(CLASS|CL)\s*[A-Z0-9]{1,4}\b/g, " ");
  t = t.replace(/\bISIN\b.*$/, "");
  t = t.replace(/\b(FUND|ACC|INC|USD|EUR|GBP|CHF|PLC|SICAV|LUX|LTD|DAC)\b/g, " ");
  t = t.replace(/[^A-Z0-9 ]/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

export interface MetricResult {
  value: number | null;
  method: "informado" | "estimado" | "calculado" | "no_disponible";
  label: string;
}

/** MTD return: prefers the custodian-reported figure, else derives from (final - initial - flows) / initial. */
export function computeMTD(targetSnap: Snapshot | null | undefined): MetricResult {
  if (!targetSnap) return { value: null, method: "no_disponible", label: "" };
  if (targetSnap.rentMTD !== null && targetSnap.rentMTD !== undefined) {
    return {
      value: targetSnap.rentMTD,
      method: (targetSnap.rentMTDMetodo as MetricResult["method"]) || "informado",
      label: "",
    };
  }
  const vi = targetSnap.valorInicial;
  if (typeof vi === "number" && vi !== 0) {
    const flows = typeof targetSnap.flujosNetos === "number" ? targetSnap.flujosNetos : 0;
    const mtd = ((targetSnap.valorActual! - vi - flows) / vi) * 100;
    return { value: mtd, method: "calculado", label: "desde valor inicial del mes" };
  }
  return { value: null, method: "no_disponible", label: "" };
}

/** YTD return: anchors to the prior December snapshot; falls back to the statement's own YTD figure. */
export function computeYTD(
  accountSnapshots: SnapshotsByMonth,
  targetMonth: string | null,
  targetSnap: Snapshot | null | undefined,
): MetricResult {
  if (!targetMonth || !targetSnap) return { value: null, method: "no_disponible", label: "" };
  const year = targetMonth.split("-")[0];
  const baselineMonth = parseInt(year, 10) - 1 + "-12";
  const baseline = accountSnapshots[baselineMonth];
  if (baseline && typeof baseline.valorActual === "number" && baseline.valorActual !== 0) {
    const flowsYTD = typeof targetSnap.flujosNetosYTD === "number" ? targetSnap.flujosNetosYTD : 0;
    const ytd = ((targetSnap.valorActual! - baseline.valorActual - flowsYTD) / baseline.valorActual) * 100;
    return { value: ytd, method: "calculado", label: "base dic-" + (parseInt(year, 10) - 1) };
  }
  if (targetSnap.rentYTD !== null && targetSnap.rentYTD !== undefined) {
    return {
      value: targetSnap.rentYTD,
      method: (targetSnap.rentYTDMetodo as MetricResult["method"]) || "estimado",
      label: "",
    };
  }
  return { value: null, method: "no_disponible", label: "" };
}

/**
 * Costs YTD are summed in-app (each month's costosMes) rather than trusting the
 * custodian's own YTD column, which tends to mix real fees with internal transfers.
 * `complete` is false if any month in [Jan..targetMonth] is missing costosMes.
 */
export function computeCostsYTD(
  accountSnapshots: SnapshotsByMonth,
  targetMonth: string | null,
): { value: number | null; complete: boolean } {
  if (!targetMonth) return { value: null, complete: false };
  const year = targetMonth.split("-")[0];
  const targetMonthNum = parseInt(targetMonth.split("-")[1], 10);
  let sum = 0;
  let anyFound = false;
  let complete = true;
  for (let m = 1; m <= targetMonthNum; m++) {
    const key = year + "-" + String(m).padStart(2, "0");
    const snap = accountSnapshots[key];
    if (snap && typeof snap.costosMes === "number") {
      sum += snap.costosMes;
      anyFound = true;
    } else {
      complete = false;
    }
  }
  if (!anyFound) return { value: null, complete: false };
  return { value: sum, complete };
}

export function aggregateAllocation(list: Snapshot[]): Record<AssetType, number> {
  const totals = Object.fromEntries(ASSET_TYPES.map((t) => [t, 0])) as Record<AssetType, number>;
  list.forEach((snap) => {
    (snap.asignacion || []).forEach((a) => {
      const t = (ASSET_TYPES as readonly string[]).includes(a.tipo) ? (a.tipo as AssetType) : "Otros";
      totals[t] = (totals[t] || 0) + (Number(a.valor) || 0);
    });
  });
  return totals;
}

/**
 * Per-holding YTD approximation: compares each position's value against the same
 * normalized-name position in the prior December's snapshot. Does not adjust for
 * partial buys/sells during the year.
 */
export function computeHoldingsWithYTD(
  accountSnapshots: SnapshotsByMonth,
  snap: Snapshot,
  selMonth: string | null,
): Array<{ nombre: string; valor: number; retornoPct: number | null; ytd: number | null; usSitus?: boolean | null }> {
  const year = parseInt((selMonth || "").split("-")[0], 10);
  const baseSnap = accountSnapshots[year - 1 + "-12"];
  return (snap.holdings || []).map((h) => {
    let ytd: number | null = null;
    if (baseSnap) {
      const key = normalizeName(h.nombre);
      const m = (baseSnap.holdings || []).find((x) => normalizeName(x.nombre) === key);
      if (m && m.valor) ytd = ((h.valor - m.valor) / m.valor) * 100;
    }
    return { nombre: h.nombre, valor: h.valor, retornoPct: h.retornoPct, ytd, usSitus: h.usSitus };
  });
}

export interface AssetTableRow {
  name: string;
  total: number;
  nAccounts: number;
  mtd: number | null;
  ytd: number | null;
}

/** Consolidated positions across accounts, matched by normalized name, with MTD/YTD vs. prior month/December. */
export function buildAssetTable(accs: Array<{ account: Account; snapshots: SnapshotsByMonth }>): AssetTableRow[] {
  const rows: Record<
    string,
    { name: string; total: number; prevTotal: number; prevFound: boolean; baseTotal: number; baseFound: boolean; accounts: Set<string> }
  > = {};
  accs.forEach(({ account: a, snapshots: snaps }) => {
    const months = Object.keys(snaps).sort();
    if (!months.length) return;
    const latest = months[months.length - 1];
    const snap = snaps[latest];
    const year = latest.split("-")[0];
    const baseSnap = snaps[parseInt(year, 10) - 1 + "-12"];
    const prevSnap = snaps[prevMonthKey(latest)];
    (snap.holdings || []).forEach((h) => {
      const key = normalizeName(h.nombre);
      if (!key) return;
      if (!rows[key]) {
        rows[key] = { name: h.nombre, total: 0, prevTotal: 0, prevFound: false, baseTotal: 0, baseFound: false, accounts: new Set() };
      }
      rows[key].total += Number(h.valor) || 0;
      rows[key].accounts.add(a.label);
      if (prevSnap) {
        const m = (prevSnap.holdings || []).find((x) => normalizeName(x.nombre) === key);
        if (m) {
          rows[key].prevTotal += Number(m.valor) || 0;
          rows[key].prevFound = true;
        }
      }
      if (baseSnap) {
        const m = (baseSnap.holdings || []).find((x) => normalizeName(x.nombre) === key);
        if (m) {
          rows[key].baseTotal += Number(m.valor) || 0;
          rows[key].baseFound = true;
        }
      }
    });
  });
  return Object.values(rows)
    .map((r) => ({
      name: r.name,
      total: r.total,
      nAccounts: r.accounts.size,
      mtd: r.prevFound && r.prevTotal ? ((r.total - r.prevTotal) / r.prevTotal) * 100 : null,
      ytd: r.baseFound && r.baseTotal ? ((r.total - r.baseTotal) / r.baseTotal) * 100 : null,
    }))
    .sort((a, b) => b.total - a.total);
}

export interface PositionChange {
  account: string;
  nombre: string;
  valor: number;
  mes: string;
}

/**
 * Detects fully-new and fully-closed positions (latest month vs. prior month, by
 * normalized name). Does not detect partial buys/sells of an existing position.
 */
export function buildPositionChanges(
  accs: Array<{ account: Account; snapshots: SnapshotsByMonth }>,
): { compras: PositionChange[]; ventas: PositionChange[] } {
  const compras: PositionChange[] = [];
  const ventas: PositionChange[] = [];
  accs.forEach(({ account: a, snapshots: snaps }) => {
    const months = Object.keys(snaps).sort();
    if (months.length < 2) return;
    const latest = months[months.length - 1];
    const prevMonth = prevMonthKey(latest);
    const prevSnap = snaps[prevMonth];
    if (!prevSnap) return;
    const snap = snaps[latest];
    const curKeys = (snap.holdings || []).map((h) => normalizeName(h.nombre));
    const prevKeys = (prevSnap.holdings || []).map((h) => normalizeName(h.nombre));
    (snap.holdings || []).forEach((h) => {
      const key = normalizeName(h.nombre);
      if (key && !prevKeys.includes(key)) compras.push({ account: a.label, nombre: h.nombre, valor: h.valor, mes: latest });
    });
    (prevSnap.holdings || []).forEach((h) => {
      const key = normalizeName(h.nombre);
      if (key && !curKeys.includes(key)) ventas.push({ account: a.label, nombre: h.nombre, valor: h.valor, mes: latest });
    });
  });
  compras.sort((a, b) => b.valor - a.valor);
  ventas.sort((a, b) => b.valor - a.valor);
  return { compras, ventas };
}

export interface Trailing12mResult {
  value: number;
  weight: number;
}

/**
 * Trailing-12-month return for one account: (V_latest - V_baseline - Σflows) / V_baseline * 100,
 * baseline = snapshot exactly 12 months before latest (or the earliest snapshot if it's
 * ≥11 months old and no exact 12-month baseline exists). A Modified-Dietz-style
 * approximation, not a true time-weighted return.
 */
export function accountTrailing12m(sparseSnaps: SnapshotsByMonth, latestMonthKey: string | null): Trailing12mResult | null {
  const months = Object.keys(sparseSnaps).sort();
  if (!months.length || !latestMonthKey || !sparseSnaps[latestMonthKey]) return null;
  const latestSnap = sparseSnaps[latestMonthKey];
  if (typeof latestSnap.valorActual !== "number") return null;
  const parts = latestMonthKey.split("-").map(Number);
  let y = parts[0];
  let m = parts[1] - 12;
  while (m <= 0) {
    m += 12;
    y--;
  }
  const baselineMonth = y + "-" + String(m).padStart(2, "0");
  let baseline = sparseSnaps[baselineMonth];
  let baselineKey = baselineMonth;
  if (!baseline) {
    const earliest = months[0];
    if (earliest !== latestMonthKey && monthDiff(earliest, latestMonthKey) >= 11) {
      baseline = sparseSnaps[earliest];
      baselineKey = earliest;
    }
  }
  if (!baseline || typeof baseline.valorActual !== "number" || baseline.valorActual === 0) return null;
  let flowSum = 0;
  months.forEach((mo) => {
    if (mo > baselineKey && mo <= latestMonthKey) flowSum += Number(sparseSnaps[mo].flujosNetos) || 0;
  });
  const value = ((latestSnap.valorActual - baseline.valorActual - flowSum) / baseline.valorActual) * 100;
  return { value, weight: latestSnap.valorActual };
}

/** AUM-weighted blend of accountTrailing12m across every account of a client. */
export function clientTrailing12m(
  accountSnapshots: Array<{ snapshots: SnapshotsByMonth }>,
): { aum: number | null; perf12m: number | null } {
  let aum = 0;
  let anyAum = false;
  const parts: Trailing12mResult[] = [];
  accountSnapshots.forEach(({ snapshots: snaps }) => {
    const months = Object.keys(snaps).sort();
    if (months.length) {
      const latest = months[months.length - 1];
      aum += Number(snaps[latest].valorActual) || 0;
      anyAum = true;
      const r = accountTrailing12m(snaps, latest);
      if (r && r.value != null && !isNaN(r.value)) parts.push(r);
    }
  });
  const perf = parts.length
    ? parts.reduce((s, p) => s + p.value * p.weight, 0) / parts.reduce((s, p) => s + p.weight, 0)
    : null;
  return { aum: anyAum ? aum : null, perf12m: perf };
}
