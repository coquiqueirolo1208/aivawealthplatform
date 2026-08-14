import { describe, expect, it } from "vitest";
import { toUsdSnapshot, toUsdSnapshotsByMonth, toUsdValue } from "./currency";
import type { Snapshot } from "./types";

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

describe("toUsdValue", () => {
  it("passes USD (or currency-less) values through unchanged", () => {
    expect(toUsdValue(1000, "USD", null)).toBe(1000);
    expect(toUsdValue(1000, null, null)).toBe(1000);
  });
  it("divides by the exchange rate for a foreign currency", () => {
    expect(toUsdValue(900000, "ARS", 900)).toBe(1000);
  });
  it("passes through if tipoCambio is missing even for a foreign currency", () => {
    expect(toUsdValue(900000, "ARS", null)).toBe(900000);
  });
  it("returns null for a null value", () => {
    expect(toUsdValue(null, "ARS", 900)).toBeNull();
  });
});

describe("toUsdSnapshot", () => {
  it("converts every dollar field using the snapshot's own rate", () => {
    const s = snap({
      valorActual: 900000,
      valorInicial: 850000,
      flujosNetos: 9000,
      flujosNetosYTD: 18000,
      costosMes: 900,
      asignacion: [{ tipo: "Renta Fija", valor: 450000 }],
      holdings: [{ nombre: "Bono soberano", valor: 450000, retornoPct: 3 }],
      moneda: "ARS",
      tipoCambio: 900,
      rentMTD: 5, // percentages are currency-invariant, left untouched
    });
    const usd = toUsdSnapshot(s);
    expect(usd.valorActual).toBe(1000);
    expect(usd.valorInicial).toBeCloseTo(944.44, 2);
    expect(usd.flujosNetos).toBe(10);
    expect(usd.flujosNetosYTD).toBe(20);
    expect(usd.costosMes).toBe(1);
    expect(usd.asignacion[0].valor).toBe(500);
    expect(usd.holdings[0].valor).toBe(500);
    expect(usd.rentMTD).toBe(5);
    expect(usd.moneda).toBe("USD");
    expect(usd.tipoCambio).toBeNull();
  });

  it("returns the same snapshot (by value) when already USD", () => {
    const s = snap({ valorActual: 1000, moneda: "USD" });
    expect(toUsdSnapshot(s)).toEqual(s);
  });

  it("returns the snapshot unchanged when moneda is foreign but no rate was captured", () => {
    const s = snap({ valorActual: 900000, moneda: "ARS", tipoCambio: null });
    expect(toUsdSnapshot(s)).toEqual(s);
  });
});

describe("toUsdSnapshotsByMonth", () => {
  it("leaves an all-USD map untouched and converts only foreign-currency months", () => {
    const map = {
      "2024-05": snap({ valorActual: 1000, moneda: "USD" }),
      "2024-06": snap({ valorActual: 900000, moneda: "ARS", tipoCambio: 900 }),
    };
    const usd = toUsdSnapshotsByMonth(map);
    expect(usd["2024-05"].valorActual).toBe(1000);
    expect(usd["2024-06"].valorActual).toBe(1000);
    expect(usd["2024-06"].moneda).toBe("USD");
  });
});
