// Converts a snapshot recorded in a local currency into its USD equivalent, using the
// exchange rate captured on that snapshot at entry time (tipoCambio, "units of moneda
// per 1 USD"). Pure/no I/O — the actual rate lookup lives in lib/fx.ts. Kept separate
// from lib/finance/core.ts because this is a currency concern, not a returns-math one.
import type { Snapshot, SnapshotsByMonth } from "./types";

export function toUsdValue(value: number | null | undefined, moneda: string | null | undefined, tipoCambio: number | null | undefined): number | null {
  if (value == null) return null;
  if (!moneda || moneda === "USD" || !tipoCambio) return value;
  return value / tipoCambio;
}

/** Converts every dollar-denominated field of a snapshot to USD; leaves percentages (rentMTD/rentYTD) untouched — a return computed from same-currency values is already currency-invariant. */
export function toUsdSnapshot(snap: Snapshot): Snapshot {
  const { moneda, tipoCambio } = snap;
  if (!moneda || moneda === "USD" || !tipoCambio) return snap;
  const conv = (v: number | null | undefined) => toUsdValue(v, moneda, tipoCambio);
  return {
    ...snap,
    valorActual: conv(snap.valorActual),
    valorInicial: conv(snap.valorInicial),
    valorActivos: conv(snap.valorActivos),
    valorPasivos: conv(snap.valorPasivos),
    flujosNetos: conv(snap.flujosNetos),
    flujosNetosYTD: conv(snap.flujosNetosYTD),
    costosMes: conv(snap.costosMes),
    asignacion: snap.asignacion.map((a) => ({ ...a, valor: conv(a.valor) ?? 0 })),
    holdings: snap.holdings.map((h) => ({ ...h, valor: conv(h.valor) ?? 0 })),
    moneda: "USD",
    tipoCambio: null,
  };
}

export function toUsdSnapshotsByMonth(snaps: SnapshotsByMonth): SnapshotsByMonth {
  const hasForeignCurrency = Object.values(snaps).some((s) => s.moneda && s.moneda !== "USD");
  if (!hasForeignCurrency) return snaps;
  return Object.fromEntries(Object.entries(snaps).map(([month, s]) => [month, toUsdSnapshot(s)]));
}
