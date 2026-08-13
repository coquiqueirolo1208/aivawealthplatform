// Converts snake_case DB rows into the camelCase domain shapes lib/finance expects.
import type { Tables } from "./database.types";
import type { AssetAllocationEntry, Holding, Snapshot } from "@/lib/finance/types";

export function rowToSnapshot(row: Tables<"snapshots">): Snapshot {
  return {
    valorActual: row.valor_actual,
    valorInicial: row.valor_inicial,
    valorActivos: row.valor_activos,
    valorPasivos: row.valor_pasivos,
    flujosNetos: row.flujos_netos,
    flujosNetosYTD: row.flujos_netos_ytd,
    costosMes: row.costos_mes,
    rentMTD: row.rent_mtd,
    rentMTDMetodo: row.rent_mtd_metodo,
    rentYTD: row.rent_ytd,
    rentYTDMetodo: row.rent_ytd_metodo,
    asignacion: (row.asignacion as unknown as AssetAllocationEntry[]) ?? [],
    holdings: (row.holdings as unknown as Holding[]) ?? [],
    highlights: row.highlights ?? [],
    movimientos: row.movimientos ?? [],
  };
}
