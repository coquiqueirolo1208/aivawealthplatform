import { describe, expect, it } from "vitest";
import type { Snapshot } from "@/lib/finance/types";
import { buildClientReportData, reportableMonths, type ReportAccountInput } from "./client-report";

function snap(valorActual: number, extra: Partial<Snapshot> = {}): Snapshot {
  return {
    valorActual,
    valorInicial: null,
    flujosNetos: null,
    flujosNetosYTD: null,
    asignacion: [],
    holdings: [],
    ...extra,
  };
}

const accounts: ReportAccountInput[] = [
  {
    id: "a",
    label: "Cuenta A",
    custodian: "Pershing",
    snapshots: {
      "2025-12": snap(1000),
      "2026-05": snap(1100),
      "2026-06": snap(1150, { valorInicial: 1100, flujosNetos: 0, flujosNetosYTD: 50, holdings: [{ nombre: "Fondo X", valor: 1150, retornoPct: null }] }),
      "2026-07": snap(9999), // after the cut-off: must be ignored
    },
  },
  {
    id: "b",
    label: "Cuenta B",
    custodian: "UBS",
    snapshots: {
      "2025-12": snap(500),
      "2026-06": snap(520, { flujosNetosYTD: 0 }),
    },
  },
];

describe("buildClientReportData", () => {
  it("reports as of the chosen month, ignoring later statements", () => {
    const r = buildClientReportData("Cliente", accounts, "2026-06");
    expect(r.total).toBe(1150 + 520);
    expect(r.accounts.map((a) => a.month)).toEqual(["2026-06", "2026-06"]);
  });

  it("computes the year's result net of contributions", () => {
    const r = buildClientReportData("Cliente", accounts, "2026-06");
    // A: 1150 - 1000 - 50 = 100; B: 520 - 500 - 0 = 20
    expect(r.resultadoYTD).toBe(120);
    expect(r.flujosYTD).toBe(50);
  });

  it("leaves the year's result empty when an account has no December baseline", () => {
    const withNew = [...accounts, { id: "c", label: "Nueva", custodian: null, snapshots: { "2026-06": snap(300) } }];
    expect(buildClientReportData("Cliente", withNew, "2026-06").resultadoYTD).toBeNull();
  });

  it("only plots months where every open account has a statement", () => {
    const r = buildClientReportData("Cliente", accounts, "2026-06");
    // 2026-05: B is open (Dec..Jun) but has no May statement -> skipped instead of dipping.
    expect(r.evolution.map((p) => p.month)).toEqual(["2025-12", "2026-06"]);
    expect(r.evolution[1].value).toBe(1670);
  });

  it("lists available months newest first", () => {
    expect(reportableMonths(accounts)).toEqual(["2026-07", "2026-06", "2026-05", "2025-12"]);
  });
});
