import { describe, expect, it } from "vitest";
import {
  classifyByCat,
  classifyHoldingByFundDb,
  computePMTargetWeights,
  expandFundTokens,
  investecBuildManagerOverlap,
  investecPortfolioMetricsFull,
  matchInvestecFundPerf,
  matchPMHolding,
  pmPortfolioMetrics,
  pmPortfolioMetricsFull,
  refineAssetAllocation,
} from "./investec";
import type { FundRow, ModelPortfolio, Snapshot } from "./types";

function fund(overrides: Partial<FundRow> = {}): FundRow {
  return { isin: "ISIN0", name: "Fund", ...overrides };
}
function snap(overrides: Partial<Snapshot> = {}): Snapshot {
  return { valorActual: null, valorInicial: null, flujosNetos: null, flujosNetosYTD: null, asignacion: [], holdings: [], ...overrides };
}

describe("expandFundTokens", () => {
  it("normalizes and expands known abbreviations", () => {
    expect(expandFundTokens("Global HY Bd")).toEqual(["GLOBAL", "HIGHYIELD", "BOND"]);
  });
});

describe("matchInvestecFundPerf", () => {
  const db: FundRow[] = [
    fund({ isin: "A1", name: "PIMCO Global High Yield Bond", ytd: 4 }),
    fund({ isin: "A2", name: "Totally Unrelated Equity Fund", ytd: 9 }),
  ];

  it("matches on token overlap score >= 0.6", () => {
    const m = matchInvestecFundPerf("PIMCO Global HY Bd", db);
    expect(m?.isin).toBe("A1");
  });

  it("returns null below the 0.6 threshold", () => {
    const m = matchInvestecFundPerf("Something Else Entirely Different Strategy", db);
    expect(m).toBeNull();
  });

  it("returns null for an empty name", () => {
    expect(matchInvestecFundPerf("", db)).toBeNull();
  });
});

describe("investecPortfolioMetricsFull", () => {
  it("renormalizes the weighted average over matched funds only", () => {
    const db: FundRow[] = [fund({ isin: "A1", name: "PIMCO Global Income Fund", ytd: 10, y1: 5, y3: 6, y5: 7 })];
    const rows = [
      { fondo: "PIMCO Global Income", peso: 60 },
      { fondo: "Unmatched Fund XYZ", peso: 40 },
    ];
    const m = investecPortfolioMetricsFull(rows, db);
    // Only the matched 60-weight fund counts, renormalized: 10*60/60 = 10 (not 10*60/100=6)
    expect(m.ytd).toBeCloseTo(10);
  });

  it("is null for a period with no matches", () => {
    const m = investecPortfolioMetricsFull([{ fondo: "Nothing Matches This", peso: 100 }], []);
    expect(m.ytd).toBeNull();
  });
});

describe("investecBuildManagerOverlap", () => {
  it("keeps only managers appearing in >= 2 solutions, sorted by #solutions then weight", () => {
    const overlap = investecBuildManagerOverlap(
      [
        { id: "cautious", allocKey: "Cautious" },
        { id: "balanced", allocKey: "Balanced" },
        { id: "dynamic", allocKey: "Dynamic" },
      ],
      {
        Cautious: [{ fondo: "Fund X", peso: 10 }],
        Balanced: [{ fondo: "Fund X", peso: 20 }],
        Dynamic: [{ fondo: "Solo Fund", peso: 5 }],
      },
      [
        { name: "Fund X", manager: "Manager A" },
        { name: "Solo Fund", manager: "Manager B" },
      ],
    );
    expect(overlap).toHaveLength(1);
    expect(overlap[0].manager).toBe("Manager A");
    expect(overlap[0].nSolutions).toBe(2);
    expect(overlap[0].total).toBe(30);
  });
});

describe("matchPMHolding / pmPortfolioMetrics / pmPortfolioMetricsFull", () => {
  const db: FundRow[] = [fund({ isin: "LU123", name: "Some Fund", ytd: 8, y1: 4, y3: 3, y5: 2 })];
  const pf: ModelPortfolio = {
    key: "balanceado",
    label: "Moderado",
    cash: 2,
    holdings: [
      { isin: "LU123", name: "Some Fund", section: "Renta Fija", weight: 60 },
      { isin: "UNKNOWN", name: "No Match Fund", section: "Renta Variable", weight: 40 },
    ],
  };

  it("matches by ISIN and returns proxy:false", () => {
    const m = matchPMHolding(pf.holdings[0], db);
    expect(m.fund?.isin).toBe("LU123");
    expect(m.proxy).toBe(false);
  });

  it("pmPortfolioMetrics divides flat by 100 without renormalizing unmatched holdings", () => {
    const m = pmPortfolioMetrics(pf, db);
    // Only the 60-weight fund matched: wYtd = 8*60=480, wSum=60 -> value present but divided by 100 flat
    expect(m.ytd).toBeCloseTo(4.8); // 480/100, not 480/60
  });

  it("pmPortfolioMetricsFull applies the same flat-100 divisor across periods", () => {
    const m = pmPortfolioMetricsFull(pf, db);
    expect(m.ytd).toBeCloseTo(4.8);
    expect(m.y1).toBeCloseTo(2.4); // 4*60/100
  });
});

describe("computePMTargetWeights", () => {
  it("aggregates per-fund weights into per-section targets plus cash", () => {
    const pf: ModelPortfolio = {
      key: "conservador",
      label: "Conservador",
      cash: 2,
      holdings: [
        { name: "A", section: "Renta Fija", weight: 50 },
        { name: "B", section: "Renta Fija", weight: 30 },
        { name: "C", section: "Renta Variable", weight: 18 },
      ],
    };
    expect(computePMTargetWeights(pf)).toEqual({ "Renta Fija": 80, "Renta Variable": 18, Efectivo: 2 });
  });

  it("is null without a portfolio", () => {
    expect(computePMTargetWeights(null)).toBeNull();
  });
});

describe("classifyByCat / classifyHoldingByFundDb", () => {
  it("buckets by category keyword", () => {
    expect(classifyByCat({ cat: "Renta Fija Corto Plazo" })).toBe("Renta Fija");
    expect(classifyByCat({ cat: "Acciones Globales" })).toBe("Renta Variable");
    expect(classifyByCat({ cat: "Balanced Fund" })).toBe("Multi Activo");
    expect(classifyByCat({ cat: "Alternativos" })).toBeNull();
  });

  it("matches a holding name against the fund DB then classifies it", () => {
    const db = [fund({ name: "Some Bond Fund", cat: "Renta Fija" })];
    expect(classifyHoldingByFundDb("Some Bond Fund", db)).toBe("Renta Fija");
    expect(classifyHoldingByFundDb("Completely Unrelated", db)).toBeNull();
  });
});

describe("refineAssetAllocation", () => {
  it("reclassifies Fondos Mutuos proportionally, scaling down (never up)", () => {
    const db: FundRow[] = [
      fund({ name: "Equity Fund A", cat: "Acciones" }),
      fund({ name: "Bond Fund B", cat: "Renta Fija" }),
    ];
    const snaps = [
      snap({
        asignacion: [{ tipo: "Fondos Mutuos", valor: 100 }],
        holdings: [
          { nombre: "Equity Fund A", valor: 60, retornoPct: null },
          { nombre: "Bond Fund B", valor: 60, retornoPct: null },
        ],
      }),
    ];
    // classifiedSum = 120 > fondosMutuosTotal = 100 -> scale = 100/120
    const r = refineAssetAllocation(snaps, db);
    expect(r.fondosMutuosTotal).toBe(100);
    expect(r.refined["Renta Variable"]).toBeCloseTo(50); // 60 * (100/120)
    expect(r.refined["Renta Fija"]).toBeCloseTo(50);
    expect(r.refined["Fondos Mutuos"]).toBeCloseTo(0);
    expect(r.coveragePct).toBeCloseTo(100);
  });

  it("leaves an unclassified remainder when coverage is partial", () => {
    const db: FundRow[] = [fund({ name: "Equity Fund A", cat: "Acciones" })];
    const snaps = [
      snap({
        asignacion: [{ tipo: "Fondos Mutuos", valor: 100 }],
        holdings: [{ nombre: "Equity Fund A", valor: 40, retornoPct: null }],
      }),
    ];
    const r = refineAssetAllocation(snaps, db);
    expect(r.refined["Renta Variable"]).toBeCloseTo(40);
    expect(r.leftoverFM).toBeCloseTo(60);
    expect(r.coveragePct).toBeCloseTo(40);
  });
});
