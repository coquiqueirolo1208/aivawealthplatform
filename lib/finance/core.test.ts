import { describe, expect, it } from "vitest";
import {
  accountTrailing12m,
  aggregateAllocation,
  buildAssetTable,
  buildPositionChanges,
  clientTrailing12m,
  computeCostsYTD,
  computeHoldingsWithYTD,
  computeMTD,
  computeYTD,
  monthDiff,
  normalizeName,
  prevMonthKey,
} from "./core";
import type { Snapshot, SnapshotsByMonth } from "./types";

function snap(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    valorActual: null,
    valorInicial: null,
    flujosNetos: null,
    flujosNetosYTD: null,
    asignacion: [],
    holdings: [],
    ...overrides,
  };
}

describe("prevMonthKey / monthDiff", () => {
  it("rolls back across a year boundary", () => {
    expect(prevMonthKey("2026-01")).toBe("2025-12");
    expect(prevMonthKey("2026-07")).toBe("2026-06");
  });
  it("computes month distance", () => {
    expect(monthDiff("2025-01", "2026-01")).toBe(12);
    expect(monthDiff("2026-03", "2026-01")).toBe(-2);
  });
});

describe("normalizeName", () => {
  it("strips share-class/currency/ISIN noise and uppercases", () => {
    expect(normalizeName("Investec Global Select Equity Fund Class I (ACC)(USD)")).toBe(
      "INVESTEC GLOBAL SELECT EQUITY",
    );
  });
});

describe("computeMTD", () => {
  it("prefers the informed figure", () => {
    const r = computeMTD(snap({ rentMTD: 3.5, rentMTDMetodo: "informado" }));
    expect(r).toEqual({ value: 3.5, method: "informado", label: "" });
  });
  it("calculates from (final - initial - flows) / initial when not informed", () => {
    const r = computeMTD(snap({ valorActual: 110000, valorInicial: 100000, flujosNetos: 5000 }));
    // (110000 - 100000 - 5000) / 100000 * 100 = 5
    expect(r.value).toBeCloseTo(5);
    expect(r.method).toBe("calculado");
  });
  it("is no_disponible without a snapshot or valid valorInicial", () => {
    expect(computeMTD(null).method).toBe("no_disponible");
    expect(computeMTD(snap({ valorActual: 100 })).method).toBe("no_disponible");
    expect(computeMTD(snap({ valorActual: 100, valorInicial: 0 })).method).toBe("no_disponible");
  });
});

describe("computeYTD", () => {
  it("anchors to prior December and subtracts YTD flows", () => {
    const snaps: SnapshotsByMonth = { "2025-12": snap({ valorActual: 100000 }) };
    const target = snap({ valorActual: 112000, flujosNetosYTD: 4000 });
    const r = computeYTD(snaps, "2026-06", target);
    // (112000 - 100000 - 4000) / 100000 * 100 = 8
    expect(r.value).toBeCloseTo(8);
    expect(r.method).toBe("calculado");
    expect(r.label).toContain("2025");
  });
  it("falls back to the statement's own YTD when no December baseline exists", () => {
    const r = computeYTD({}, "2026-06", snap({ valorActual: 100, rentYTD: 7.2, rentYTDMetodo: "estimado" }));
    expect(r).toEqual({ value: 7.2, method: "estimado", label: "" });
  });
  it("is no_disponible with nothing to go on", () => {
    expect(computeYTD({}, null, snap()).method).toBe("no_disponible");
    expect(computeYTD({}, "2026-06", null).method).toBe("no_disponible");
  });
});

describe("computeCostsYTD", () => {
  it("sums costosMes across Jan..targetMonth and flags incompleteness", () => {
    const snaps: SnapshotsByMonth = {
      "2026-01": snap({ costosMes: 10 }),
      "2026-03": snap({ costosMes: 20 }),
    };
    const r = computeCostsYTD(snaps, "2026-03");
    expect(r.value).toBe(30);
    expect(r.complete).toBe(false); // Feb is missing
  });
  it("is complete when every month is present", () => {
    const snaps: SnapshotsByMonth = { "2026-01": snap({ costosMes: 10 }), "2026-02": snap({ costosMes: 5 }) };
    expect(computeCostsYTD(snaps, "2026-02")).toEqual({ value: 15, complete: true });
  });
  it("returns null value when nothing found", () => {
    expect(computeCostsYTD({}, "2026-02")).toEqual({ value: null, complete: false });
  });
});

describe("aggregateAllocation", () => {
  it("sums by asset type and buckets unknown types into Otros", () => {
    const totals = aggregateAllocation([
      snap({ asignacion: [{ tipo: "Renta Fija", valor: 100 }, { tipo: "Weird Bucket", valor: 50 }] }),
      snap({ asignacion: [{ tipo: "Renta Fija", valor: 25 }] }),
    ]);
    expect(totals["Renta Fija"]).toBe(125);
    expect(totals["Otros"]).toBe(50);
    expect(totals["Efectivo"]).toBe(0);
  });
});

describe("computeHoldingsWithYTD", () => {
  it("computes YTD per holding vs the prior December snapshot", () => {
    const snaps: SnapshotsByMonth = {
      "2025-12": snap({ holdings: [{ nombre: "Fund A", valor: 100, retornoPct: null }] }),
    };
    const current = snap({ holdings: [{ nombre: "Fund A", valor: 120, retornoPct: 5 }] });
    const result = computeHoldingsWithYTD(snaps, current, "2026-06");
    expect(result[0].ytd).toBeCloseTo(20);
  });
  it("is null when no baseline holding matches", () => {
    const current = snap({ holdings: [{ nombre: "New Fund", valor: 100, retornoPct: null }] });
    const result = computeHoldingsWithYTD({}, current, "2026-06");
    expect(result[0].ytd).toBeNull();
  });
});

describe("buildAssetTable", () => {
  it("consolidates the same fund across accounts and computes MTD/YTD", () => {
    const accs = [
      {
        account: { id: "a1", label: "StoneX" },
        snapshots: {
          "2025-12": snap({ holdings: [{ nombre: "Fund A", valor: 100, retornoPct: null }] }),
          "2026-05": snap({ holdings: [{ nombre: "Fund A", valor: 110, retornoPct: null }] }),
          "2026-06": snap({ holdings: [{ nombre: "Fund A", valor: 121, retornoPct: null }] }),
        },
      },
    ];
    const rows = buildAssetTable(accs);
    expect(rows).toHaveLength(1);
    expect(rows[0].total).toBe(121);
    expect(rows[0].mtd).toBeCloseTo(10); // vs 110 in May
    expect(rows[0].ytd).toBeCloseTo(21); // vs 100 in Dec
    expect(rows[0].nAccounts).toBe(1);
  });
});

describe("buildPositionChanges", () => {
  it("flags new and closed positions between the last two months", () => {
    const accs = [
      {
        account: { id: "a1", label: "StoneX" },
        snapshots: {
          "2026-05": snap({ holdings: [{ nombre: "Old Fund", valor: 50, retornoPct: null }] }),
          "2026-06": snap({ holdings: [{ nombre: "New Fund", valor: 80, retornoPct: null }] }),
        },
      },
    ];
    const { compras, ventas } = buildPositionChanges(accs);
    expect(compras).toEqual([{ account: "StoneX", nombre: "New Fund", valor: 80, mes: "2026-06" }]);
    // Ported as-is: the original stamps `mes` with the *latest* month for both
    // compras and ventas (i.e. "as of latest month, this holding is gone").
    expect(ventas).toEqual([{ account: "StoneX", nombre: "Old Fund", valor: 50, mes: "2026-06" }]);
  });
});

describe("accountTrailing12m", () => {
  it("uses the snapshot exactly 12 months back as baseline", () => {
    const snaps: SnapshotsByMonth = {
      "2025-06": snap({ valorActual: 100000 }),
      "2026-06": snap({ valorActual: 112000, flujosNetos: 2000 }),
    };
    const r = accountTrailing12m(snaps, "2026-06");
    // (112000 - 100000 - 2000) / 100000 * 100 = 10
    expect(r?.value).toBeCloseTo(10);
    expect(r?.weight).toBe(112000);
  });

  it("sums flows across all months after the baseline", () => {
    const snaps: SnapshotsByMonth = {
      "2025-06": snap({ valorActual: 100000 }),
      "2025-09": snap({ valorActual: 105000, flujosNetos: 3000 }),
      "2026-06": snap({ valorActual: 112000, flujosNetos: 2000 }),
    };
    const r = accountTrailing12m(snaps, "2026-06");
    // (112000 - 100000 - (3000+2000)) / 100000 * 100 = 7
    expect(r?.value).toBeCloseTo(7);
  });

  it("falls back to the earliest snapshot when it's >= 11 months old and no exact 12m baseline exists", () => {
    const snaps: SnapshotsByMonth = {
      "2025-07": snap({ valorActual: 100000 }), // 11 months before 2026-06
      "2026-06": snap({ valorActual: 110000 }),
    };
    const r = accountTrailing12m(snaps, "2026-06");
    expect(r?.value).toBeCloseTo(10);
  });

  it("returns null when the earliest snapshot is too recent (<11 months old)", () => {
    const snaps: SnapshotsByMonth = {
      "2026-01": snap({ valorActual: 100000 }),
      "2026-06": snap({ valorActual: 110000 }),
    };
    expect(accountTrailing12m(snaps, "2026-06")).toBeNull();
  });

  it("returns null when the baseline value is 0 or latest month has no numeric value", () => {
    expect(
      accountTrailing12m({ "2025-06": snap({ valorActual: 0 }), "2026-06": snap({ valorActual: 100 }) }, "2026-06"),
    ).toBeNull();
    expect(accountTrailing12m({ "2026-06": snap({ valorActual: null }) }, "2026-06")).toBeNull();
  });
});

describe("clientTrailing12m", () => {
  it("AUM-weights the blend across accounts", () => {
    const accounts = [
      { snapshots: { "2025-06": snap({ valorActual: 100000 }), "2026-06": snap({ valorActual: 110000 }) } }, // +10%, weight 110k
      { snapshots: { "2025-06": snap({ valorActual: 200000 }), "2026-06": snap({ valorActual: 190000 }) } }, // -5%, weight 190k
    ];
    const { aum, perf12m } = clientTrailing12m(accounts);
    expect(aum).toBe(300000);
    // (10*110000 + -5*190000) / 300000 = (1100000 - 950000)/300000 = 0.5
    expect(perf12m).toBeCloseTo(0.5);
  });

  it("is null when no account has trailing data", () => {
    const { perf12m } = clientTrailing12m([{ snapshots: { "2026-06": snap({ valorActual: 100 }) } }]);
    expect(perf12m).toBeNull();
  });
});
