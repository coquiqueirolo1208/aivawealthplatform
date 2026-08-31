import { describe, expect, it } from "vitest";
import { buildRadarData, countRadarAlerts, type RadarClientInput } from "./radar";
import type { ModelPortfolio, Snapshot } from "./types";
import type { AccountWithSnapshots } from "@/lib/queries/portfolio";

function snap(overrides: Partial<Snapshot> = {}): Snapshot {
  return { valorActual: null, valorInicial: null, flujosNetos: null, flujosNetosYTD: null, asignacion: [], holdings: [], ...overrides };
}

function acc(overrides: Partial<AccountWithSnapshots> & Pick<AccountWithSnapshots, "id" | "label">): AccountWithSnapshots {
  return {
    custodian: null,
    accountNumber: null,
    comentario: null,
    titularidad: null,
    todCompletado: false,
    todFecha: null,
    montoPendienteTransferir: null,
    snapshots: {},
    ...overrides,
  };
}

function baseClient(overrides: Partial<RadarClientInput> = {}): RadarClientInput {
  return {
    id: "c1",
    name: "Client One",
    // Defaults to "created today" with no notes yet, so tests that don't care about
    // contactoPendiente aren't accidentally flagged by it.
    createdAt: "2026-06-01T00:00:00.000Z",
    lastNoteAt: null,
    accounts: [],
    documents: [],
    riskProfile: null,
    tasks: [],
    ...overrides,
  };
}

describe("buildRadarData", () => {
  it("flags overdue tasks", () => {
    const client = baseClient({ tasks: [{ title: "Renovar KYC", due: "2026-01-01", done: false }, { title: "Done already", due: "2026-01-01", done: true }] });
    const data = buildRadarData([client], new Map(), "2026-06-01");
    expect(data.tareas).toEqual([
      { clientId: "c1", clientName: "Client One", prospectId: null, prospectName: null, title: "Renovar KYC", due: "2026-01-01" },
    ]);
  });

  it("flags overdue prospect tasks alongside client tasks", () => {
    const client = baseClient({ tasks: [{ title: "Renovar KYC", due: "2026-01-01", done: false }] });
    const data = buildRadarData(
      [client],
      new Map(),
      "2026-06-01",
      [
        { id: "p1", name: "Prospect One", tasks: [{ title: "Llamar", due: "2026-02-01", done: false }, { title: "Not due yet", due: "2026-12-01", done: false }, { title: "Done", due: "2026-01-01", done: true }] },
      ],
    );
    expect(data.tareas).toEqual([
      { clientId: "c1", clientName: "Client One", prospectId: null, prospectName: null, title: "Renovar KYC", due: "2026-01-01" },
      { clientId: null, clientName: null, prospectId: "p1", prospectName: "Prospect One", title: "Llamar", due: "2026-02-01" },
    ]);
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
        acc({ id: "a1", label: "No Data" }),
        acc({ id: "a2", label: "Lagging", snapshots: { "2026-03": snap({ valorActual: 100 }) } }),
        acc({ id: "a3", label: "Current", snapshots: { "2026-05": snap({ valorActual: 100 }) } }),
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
        acc({
          id: "a1",
          label: "Acc",
          snapshots: {
            "2026-05": snap({
              valorActual: 1000,
              holdings: [
                { nombre: "Big Fund", valor: 150, retornoPct: null },
                { nombre: "Small Fund", valor: 50, retornoPct: null },
              ],
            }),
          },
        }),
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
        acc({
          id: "a1",
          label: "Acc",
          snapshots: {
            "2026-05": snap({
              valorActual: 1000,
              asignacion: [
                { tipo: "Renta Variable", valor: 400 },
                { tipo: "Renta Fija", valor: 600 },
              ],
            }),
          },
        }),
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
        acc({
          id: "a1",
          label: "Acc",
          snapshots: { "2026-05": snap({ valorActual: 1000, asignacion: [{ tipo: "Renta Variable", valor: 500 }, { tipo: "Renta Fija", valor: 500 }] }) },
        }),
      ],
    });
    const data = buildRadarData([client], new Map([["dinamico", pf]]), "2026-06-01");
    expect(data.riesgo).toHaveLength(0);
  });

  it("returns all-empty with no flags across categories, sorted correctly with multiple clients", () => {
    const empty = buildRadarData([baseClient()], new Map(), "2026-06-01");
    expect(empty).toEqual({
      concentraciones: [],
      atrasos: [],
      riesgo: [],
      tareas: [],
      documentos: [],
      usSitusRiesgo: [],
      todPendiente: [],
      contactoPendiente: [],
      fondeoPendiente: [],
    });
  });

  it("flags a client over the US-situs threshold on a personal account, excludes juridica accounts", () => {
    const client = baseClient({
      accounts: [
        acc({
          id: "a1",
          label: "Personal",
          titularidad: "personal",
          snapshots: { "2026-05": snap({ valorActual: 100000, holdings: [{ nombre: "Apple Inc", valor: 70000, retornoPct: null }] }) },
        }),
        acc({
          id: "a2",
          label: "LLC",
          titularidad: "juridica",
          snapshots: { "2026-05": snap({ valorActual: 200000, holdings: [{ nombre: "Microsoft Corp", valor: 150000, retornoPct: null }] }) },
        }),
      ],
    });
    const data = buildRadarData([client], new Map(), "2026-06-01");
    expect(data.usSitusRiesgo).toEqual([{ clientId: "c1", clientName: "Client One", total: 70000 }]);
  });

  it("flags accounts missing TOD unless held by a legal entity", () => {
    const client = baseClient({
      accounts: [
        acc({ id: "a1", label: "Personal sin TOD", titularidad: "personal", todCompletado: false }),
        acc({ id: "a2", label: "Personal con TOD", titularidad: "personal", todCompletado: true }),
        acc({ id: "a3", label: "LLC sin TOD", titularidad: "juridica", todCompletado: false }),
      ],
    });
    const data = buildRadarData([client], new Map(), "2026-06-01");
    expect(data.todPendiente).toEqual([{ clientId: "c1", clientName: "Client One", accountId: "a1", account: "Personal sin TOD" }]);
  });

  it("flags accounts with a pending transfer amount, sorted by amount descending, ignoring zero/null", () => {
    const client = baseClient({
      accounts: [
        acc({ id: "a1", label: "Small pending", montoPendienteTransferir: 10000 }),
        acc({ id: "a2", label: "Big pending", montoPendienteTransferir: 50000 }),
        acc({ id: "a3", label: "Cleared", montoPendienteTransferir: 0 }),
        acc({ id: "a4", label: "Never set", montoPendienteTransferir: null }),
      ],
    });
    const data = buildRadarData([client], new Map(), "2026-06-01");
    expect(data.fondeoPendiente).toEqual([
      { clientId: "c1", clientName: "Client One", accountId: "a2", account: "Big pending", monto: 50000 },
      { clientId: "c1", clientName: "Client One", accountId: "a1", account: "Small pending", monto: 10000 },
    ]);
  });

  it("flags a client with no recent contact, using the last note when there is one", () => {
    const client = baseClient({ createdAt: "2020-01-01T00:00:00.000Z", lastNoteAt: "2026-01-01T00:00:00.000Z" });
    const data = buildRadarData([client], new Map(), "2026-06-01");
    expect(data.contactoPendiente).toHaveLength(1);
    expect(data.contactoPendiente[0].clientId).toBe("c1");
  });
});

describe("countRadarAlerts", () => {
  it("sums every category", () => {
    const client = baseClient({
      tasks: [{ title: "T", due: "2026-01-01", done: false }],
      documents: [{ tipo: "KYC", estado: "pendiente", vencimiento: null }],
      accounts: [acc({ id: "a1", label: "No Data" })],
    });
    const data = buildRadarData([client], new Map(), "2026-06-01");
    expect(countRadarAlerts(data)).toBe(
      data.tareas.length + data.documentos.length + data.atrasos.length + data.todPendiente.length,
    );
  });

  it("is zero when every category is empty", () => {
    const data = buildRadarData([baseClient()], new Map(), "2026-06-01");
    expect(countRadarAlerts(data)).toBe(0);
  });
});
