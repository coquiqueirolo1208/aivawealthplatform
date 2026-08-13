// Domain types for the ported business logic (lib/finance, lib/risk, lib/investec).
// These use the original app's field names/shapes (camelCase, Spanish) so the ported
// formulas read identically to dashboard_patrimonial_13.html. The Supabase data-access
// layer maps snake_case DB rows into these at the boundary.

export interface AssetAllocationEntry {
  tipo: string;
  valor: number;
}

export interface Holding {
  nombre: string;
  valor: number;
  retornoPct: number | null;
}

export interface Snapshot {
  valorActual: number | null;
  valorInicial: number | null;
  valorActivos?: number | null;
  valorPasivos?: number | null;
  flujosNetos: number | null;
  flujosNetosYTD: number | null;
  costosMes?: number | null;
  rentMTD?: number | null;
  rentMTDMetodo?: string | null;
  rentYTD?: number | null;
  rentYTDMetodo?: string | null;
  asignacion: AssetAllocationEntry[];
  holdings: Holding[];
  highlights?: string[];
  movimientos?: string[];
}

/** Sparse map of "YYYY-MM" -> snapshot for a single account. */
export type SnapshotsByMonth = Record<string, Snapshot>;

export interface Account {
  id: string;
  label: string;
  custodian?: string | null;
}

export interface FundRow {
  isin: string;
  name: string;
  cat?: string | null;
  sub?: string | null;
  rt?: number | null;
  d1?: number | null;
  w1?: number | null;
  m1?: number | null;
  qtd?: number | null;
  ytd?: number | null;
  y1?: number | null;
  y3?: number | null;
  y5?: number | null;
  si?: number | null;
  y2021?: number | null;
  y2022?: number | null;
  y2023?: number | null;
  y2024?: number | null;
  y2025?: number | null;
  sh3?: number | null;
  sh5?: number | null;
  aum?: number | null;
}

export interface ModelPortfolioHolding {
  isin?: string | null;
  name: string;
  sector?: string | null;
  section: string;
  weight: number;
}

export interface ModelPortfolio {
  key: string;
  label: string;
  cash: number;
  holdings: ModelPortfolioHolding[];
}

export interface InvestecFundAllocationRow {
  fondo: string;
  peso: number;
  clase?: string | null;
  estilo?: string | null;
  varMensual?: number | string | null;
  varYTD?: number | string | null;
}

export interface InvestecFundInfo {
  name: string | null;
  manager: string | null;
  assetClass?: string | null;
  isin?: string | null;
}
