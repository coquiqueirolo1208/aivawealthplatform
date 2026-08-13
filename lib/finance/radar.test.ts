import { describe, expect, it } from "vitest";
import { buildRadarData, type RadarClientInput } from "./radar";
import type { ModelPortfolio, Snapshot } from "./types";

function snap(overrides: Partial<Snapshot> = {}): Snapshot {
  return { valorActual: null, valorInicial: null, flujosNetos: null, flujosNetosYTD: null, asignacion: [], holdings: [], ...overrides };
}

function baseClient(overrides: Partial<RadarClientInput> = {}): RadarClientInput {
  return { id: "c1", name: "Client One", accounts: [], documents: [], riskProfile: null, tasks: [], ...overrides };
}

describe("buildRadarData", () => {
  it("flags overdue tasks", () => {
    const client = baseClient({ tasks: [{ title: "Renovar KYC", due: "2026-01-01", done: false }, { title: "Done already", due: "2026-01-01", done: true }] });
    const data = buildRadarData([client], new Map(), "2026-06-01");
    expect(data.tareas).toEqual([{ clientId: "c1", clientName: "Client One", title: "Renovar KYC", due: "2026-01-01" }]);
  });

  it("flags non-vigente documents", () => {
    const client = baseClient({ documents: [{ tipo: "KYC", estado: "pendiente", vencimiento: null }, { tipo: "W-8BEN", estado: "vigente", vencimiento: "2027-01-01" }] });
    const data = buildRadarData([client], new Map(), "2026-06-01");
    expect(data.documentos).toHaveLength(1);
    expect(data.documentos[0].tipo).toBe("KYC");
    expect(data.documentos[0].estado).toBe("Pendiente");
  });

  it("flags an account with no snapshots as sin_datos, and one lagging >=2 months as atrasado", () => {
    const client = baseClient({
      accounts: [
        { id: "a1", label: "No Data", custodian: null, accountNumber: null, comentario: null, snapshots: {} },
        { id: "a2", label: "Lagging", custodian: null, accountNumber: null, comentario: null, snapshots: { "2026-03": snap({ valorActual: 100 }) } },
        { id: "a3", label: "Current", custodian: null, accountNumber: null, comentario: null, snapshots: { "2026-05": snap({ valorActual: 100 }) } },
      ],
    });
    const data = buildRadarData([client], new Map(), "2026-06-01");
    expect(data.atrasos).toHaveLength(2);
    expect(data.atrasos.find((a) => a.account === "No Data")?.situacion).toBe("sin_datos");
    const lagging = data.atrasos.find((a) => a.account === "Lagging");
    expect(lagging?.situacion).toBe("atrasado");
    expect(lagging?.mesesAtraso).toBe(3);
  });

  it("flags a >=12% concentration relative to that client's own total", () => {
    const client = baseClient({
      accounts: [
        {
          id: "a1",
          label: "Acc",
          custodian: null,
          accountNumber: null,
          comentario: null,
          snapshots: {
            "2026-05": snap({
              valorActual: 1000,
              holdings: [
                { nombre: "Big Fund", valor: 150, retornoPct: null },
                { nombre: "Small Fund", valor: 50, retornoPct: null },
              ],
            }),
          },
        },
      ],
    });
    const data = buildRadarData([client], new Map(), "2026-06-01");
    expect(data.concentraciones).toHaveLength(1);
    expect(data.concentraciones[0].activo).toBe("Big Fund");
    expect(data.concentraciones[0].pct).toBeCloseTo(15);
  });

  it("flags a risk-profile deviation >15pp using RAW (unrefined) allocation", () => {
    const pf: ModelPortfolio = {
      key: "dinamico",
      label: "Agresivo",
      cash: 2,
      holdings: [{ name: "X", section: "Renta Variable", weight: 62 }],
    };
    const client = baseClient({
      riskProfile: { profile: "dinamico" },
      accounts: [
        {
          id: "a1",
          label: "Acc",
          custodian: null,
          accountNumber: null,
          comentario: null,
          snapshots: {
            "2026-05": snap({
              valorActual: 1000,
              asignacion: [
                { tipo: "Renta Variable", valor: 400 },
                { tipo: "Renta Fija", valor: 600 },
              ],
            }),
          },
        },
      ],
    });
    const data = buildRadarData([client], new Map([["dinamico", pf]]), "2026-06-01");
    // rvActual = 400/1000*100 = 40%, target = 62%, dev = -22 -> flagged (>15)
    expect(data.riesgo).toHaveLength(1);
    expect(data.riesgo[0].rvActual).toBeCloseTo(40);
    expect(data.riesgo[0].dev).toBeCloseTo(-22);
  });

  it("does not flag a risk deviation within the 15pp threshold", () => {
    const pf: ModelPortfolio = { key: "dinamico", label: "Agresivo", cash: 2, holdings: [{ name: "X", section: "Renta Variable", weight: 62 }] };
    const client = baseClient({
      riskProfile: { profile: "dinamico" },
      accounts: [
        {
          id: "a1",
          label: "Acc",
          custodian: null,
          accountNumber: null,
          comentario: null,
          snapshots: { "2026-05": snap({ valorActual: 1000, asignacion: [{ tipo: "Renta Variable", valor: 500 }, { tipo: "Renta Fija", valor: 500 }] }) },
        },
      ],
    });
    const data = buildRadarData([client], new Map([["dinamico", pf]]), "2026-06-01");
    expect(data.riesgo).toHaveLength(0);
  });

  it("returns all-empty with no flags across categories, sorted correctly with multiple clients", () => {
    const empty = buildRadarData([baseClient()], new Map(), "2026-06-01");
    expect(empty).toEqual({ concentraciones: [], atrasos: [], riesgo: [], tareas: [], documentos: [] });
  });
});
