// Figures for the client-facing PDF report, computed "as of" a chosen month so a
// quarter-end report can be produced after later statements have been loaded.
// Pure: takes USD-converted accounts, returns plain data the PDF renderer draws.
import {
  accountTrailing12m,
  aggregateAllocation,
  buildAssetTable,
  buildPositionChanges,
  computeBenchmarkReturns,
  computeCostsYTD,
  computeMTD,
  computeYTD,
  consolidatedMonthlyValues,
  latestMonth,
  type BenchmarkLevel,
} from "@/lib/finance";
import type { Account, SnapshotsByMonth } from "@/lib/finance/types";

export const REPORT_EVOLUTION_MONTHS = 13;
export const REPORT_TOP_POSITIONS = 15;

export interface ReportAccountInput extends Account {
  snapshots: SnapshotsByMonth;
}

export interface ClientReportData {
  clientName: string;
  asOfMonth: string;
  total: number;
  mtd: number | null;
  ytd: number | null;
  y1: number | null;
  /** Year-to-date result in USD (value change net of contributions/withdrawals); null unless every account has a December baseline. */
  resultadoYTD: number | null;
  /** Net contributions (+) / withdrawals (−) so far this year, per the statements. */
  flujosYTD: number | null;
  costosYTD: number | null;
  costosCompletos: boolean;
  evolution: Array<{ month: string; value: number }>;
  allocation: Array<{ tipo: string; valor: number; pct: number }>;
  accounts: Array<{
    label: string;
    custodian: string | null;
    month: string;
    valor: number | null;
    pct: number | null;
    mtd: number | null;
    ytd: number | null;
    y1: number | null;
  }>;
  positions: Array<{ name: string; valor: number; pct: number | null; mtd: number | null; ytd: number | null }>;
  positionsCount: number;
  compras: Array<{ nombre: string; account: string; valor: number }>;
  ventas: Array<{ nombre: string; account: string; valor: number }>;
  benchmark: { month: string; mtd: number | null; ytd: number | null } | null;
}

/** Months available to report on: every month any account has a statement for, newest first. */
export function reportableMonths(accounts: ReportAccountInput[]): string[] {
  return [...new Set(accounts.flatMap((a) => Object.keys(a.snapshots)))].sort().reverse();
}

function truncateTo(snaps: SnapshotsByMonth, asOf: string): SnapshotsByMonth {
  return Object.fromEntries(Object.entries(snaps).filter(([m]) => m <= asOf));
}

function weightedAvg(parts: Array<{ value: number | null; weight: number }>): number | null {
  const ok = parts.filter((p): p is { value: number; weight: number } => p.value != null && Number.isFinite(p.value) && p.weight > 0);
  const w = ok.reduce((s, p) => s + p.weight, 0);
  return w ? ok.reduce((s, p) => s + p.value * p.weight, 0) / w : null;
}

/** Consolidated value per month for the evolution chart (accounts already cut at the report month). */
function buildEvolution(accs: ReportAccountInput[]): Array<{ month: string; value: number }> {
  return Object.entries(consolidatedMonthlyValues(accs))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => ({ month, value }))
    .slice(-REPORT_EVOLUTION_MONTHS);
}

export function buildClientReportData(
  clientName: string,
  accounts: ReportAccountInput[],
  asOfMonth: string,
  benchmark?: { levels: Record<string, BenchmarkLevel>; weightsByMonth: Record<string, number> },
): ClientReportData {
  const accs = accounts.map((a) => ({ ...a, snapshots: truncateTo(a.snapshots, asOfMonth) }));
  const pairs = accs.map((a) => ({ account: a, snapshots: a.snapshots }));

  const latest = accs
    .map((a) => {
      const month = latestMonth(a.snapshots);
      return month ? { a, month, snap: a.snapshots[month] } : null;
    })
    .filter((x) => x != null);
  const total = latest.reduce((s, x) => s + (Number(x.snap.valorActual) || 0), 0);

  const perAccount = latest.map((x) => {
    const valor = typeof x.snap.valorActual === "number" ? x.snap.valorActual : null;
    return {
      label: x.a.label,
      custodian: x.a.custodian ?? null,
      month: x.month,
      valor,
      pct: valor != null && total ? (valor / total) * 100 : null,
      mtd: computeMTD(x.snap).value,
      ytd: computeYTD(x.a.snapshots, x.month, x.snap).value,
      y1: accountTrailing12m(x.a.snapshots, x.month)?.value ?? null,
      weight: valor ?? 0,
    };
  });

  // Year-to-date figures only add up accounts reporting in the report's own year.
  const year = asOfMonth.slice(0, 4);
  const thisYear = latest.filter((x) => x.month.startsWith(year));
  const flows = thisYear.map((x) => x.snap.flujosNetosYTD).filter((f): f is number => typeof f === "number");
  const flujosYTD = flows.length ? flows.reduce((s, f) => s + f, 0) : null;
  let resultadoYTD: number | null = null;
  if (thisYear.length && thisYear.length === latest.length) {
    const decKey = `${Number(year) - 1}-12`;
    let sum = 0;
    let ok = true;
    for (const x of thisYear) {
      const base = x.a.snapshots[decKey]?.valorActual;
      const cur = x.snap.valorActual;
      if (typeof base !== "number" || typeof cur !== "number") {
        ok = false;
        break;
      }
      sum += cur - base - (typeof x.snap.flujosNetosYTD === "number" ? x.snap.flujosNetosYTD : 0);
    }
    if (ok) resultadoYTD = sum;
  }
  const costs = thisYear.map((x) => computeCostsYTD(x.a.snapshots, x.month));
  const withCosts = costs.filter((c) => c.value != null);
  const costosYTD = withCosts.length ? withCosts.reduce((s, c) => s + c.value!, 0) : null;

  const allocTotals = aggregateAllocation(latest.map((x) => x.snap));
  const allocSum = Object.values(allocTotals).reduce((s, v) => s + v, 0);
  const allocation = Object.entries(allocTotals)
    .filter(([, v]) => v > 0)
    .map(([tipo, valor]) => ({ tipo, valor, pct: allocSum ? (valor / allocSum) * 100 : 0 }))
    .sort((a, b) => b.valor - a.valor);

  const assetRows = buildAssetTable(pairs);
  const { compras, ventas } = buildPositionChanges(pairs);
  // Changes are only "of the month" for accounts whose latest statement is the report month.
  const current = new Set(latest.filter((x) => x.month === asOfMonth).map((x) => x.a.label));

  const bench = benchmark ? computeBenchmarkReturns(benchmark.levels, benchmark.weightsByMonth, asOfMonth) : null;

  return {
    clientName,
    asOfMonth,
    total,
    mtd: weightedAvg(perAccount.map((p) => ({ value: p.mtd, weight: p.weight }))),
    ytd: weightedAvg(perAccount.map((p) => ({ value: p.ytd, weight: p.weight }))),
    y1: weightedAvg(
      latest.map((x) => {
        const r = accountTrailing12m(x.a.snapshots, x.month);
        return { value: r?.value ?? null, weight: r?.weight ?? 0 };
      }),
    ),
    resultadoYTD,
    flujosYTD,
    costosYTD,
    costosCompletos: withCosts.length === thisYear.length && withCosts.every((c) => c.complete),
    evolution: buildEvolution(accs),
    allocation,
    accounts: perAccount.map((p) => ({
      label: p.label,
      custodian: p.custodian,
      month: p.month,
      valor: p.valor,
      pct: p.pct,
      mtd: p.mtd,
      ytd: p.ytd,
      y1: p.y1,
    })),
    positions: assetRows.slice(0, REPORT_TOP_POSITIONS).map((r) => ({
      name: r.name,
      valor: r.total,
      pct: total ? (r.total / total) * 100 : null,
      mtd: r.mtd,
      ytd: r.ytd,
    })),
    positionsCount: assetRows.length,
    compras: compras.filter((c) => current.has(c.account)).map(({ nombre, account, valor }) => ({ nombre, account, valor })),
    ventas: ventas.filter((v) => current.has(v.account)).map(({ nombre, account, valor }) => ({ nombre, account, valor })),
    benchmark: bench && bench.latestMonth === asOfMonth ? { month: bench.latestMonth, mtd: bench.blendMTD, ytd: bench.blendYTD } : null,
  };
}
