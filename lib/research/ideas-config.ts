// Ported verbatim from dashboard_patrimonial_13.html IDEAS_CONFIG (line 2223) —
// column key names match the camelCase shape lib/queries/ideas.ts maps DB rows into.
export type IdeasColumnType = "str" | "pctv" | "pctf" | "num" | "money";

export interface IdeasColumn {
  key: string;
  label: string;
  type: IdeasColumnType;
  min?: string;
}

export interface IdeasAssetConfig {
  label: string;
  searchFields: string[];
  columns: IdeasColumn[];
  defaultSort: { key: string; dir: "asc" | "desc" };
}

export const IDEAS_CONFIG: Record<"fondos" | "etfs" | "bonos" | "acciones", IdeasAssetConfig> = {
  fondos: {
    label: "Fondos",
    searchFields: ["name", "isinAcc", "ticker"],
    columns: [
      { key: "name", label: "FONDO", type: "str", min: "210px" },
      { key: "sector", label: "SECTOR", type: "str" },
      { key: "subsector", label: "CATEGORÍA", type: "str" },
      { key: "currency", label: "MON.", type: "str" },
      { key: "ytd", label: "YTD", type: "pctv" },
      { key: "ret1y", label: "1A", type: "pctv" },
      { key: "ret3y", label: "3A anual.", type: "pctv" },
      { key: "ret5y", label: "5A anual.", type: "pctv" },
      { key: "vol3y", label: "Vol. 3A", type: "pctf" },
      { key: "sharpe3y", label: "Sharpe 3A", type: "num" },
      { key: "expenseRatio", label: "TER %", type: "num" },
      { key: "dvdYield", label: "Div. Yield", type: "pctf" },
      { key: "minInvest", label: "Inv. mínima", type: "money" },
    ],
    defaultSort: { key: "ytd", dir: "desc" },
  },
  etfs: {
    label: "ETFs",
    searchFields: ["name", "tickerAcc", "tickerDist", "isinAcc"],
    columns: [
      { key: "name", label: "ETF", type: "str", min: "210px" },
      { key: "sector", label: "SECTOR", type: "str" },
      { key: "subsector", label: "CATEGORÍA", type: "str" },
      { key: "tickerAcc", label: "TICKER", type: "str" },
      { key: "manager", label: "GESTORA", type: "str" },
      { key: "strategy", label: "ESTRATEGIA", type: "str" },
      { key: "totalAssetsM", label: "AUM (USD M)", type: "num" },
      { key: "price", label: "PRECIO", type: "num" },
      { key: "ytd", label: "YTD", type: "pctf" },
      { key: "ret1y", label: "1A", type: "pctf" },
      { key: "ret3y", label: "3A anual.", type: "pctf" },
      { key: "dvdYield", label: "Div. Yield", type: "pctf" },
      { key: "cost", label: "Costo %", type: "pctf" },
    ],
    defaultSort: { key: "ytd", dir: "desc" },
  },
  bonos: {
    label: "Bonos",
    searchFields: ["issuer", "isin"],
    columns: [
      { key: "issuer", label: "EMISOR", type: "str", min: "210px" },
      { key: "sector", label: "SECTOR", type: "str" },
      { key: "subsector", label: "PAÍS/GRUPO", type: "str" },
      { key: "country", label: "PAÍS EMISIÓN", type: "str" },
      { key: "maturity", label: "VTO.", type: "str" },
      { key: "coupon", label: "CUPÓN %", type: "num" },
      { key: "price", label: "PRECIO", type: "num" },
      { key: "ytm", label: "YTM %", type: "num" },
      { key: "duration", label: "DURATION", type: "num" },
      { key: "ratingSP", label: "RATING S&P", type: "str" },
      { key: "ratingMoody", label: "RATING MOODY'S", type: "str" },
      { key: "callable", label: "CALLABLE", type: "str" },
      { key: "minPiece", label: "MONTO MÍN.", type: "money" },
    ],
    defaultSort: { key: "ytm", dir: "desc" },
  },
  acciones: {
    label: "Acciones",
    searchFields: ["name", "ticker", "isin"],
    columns: [
      { key: "name", label: "ACCIÓN", type: "str", min: "190px" },
      { key: "sector", label: "SECTOR", type: "str" },
      { key: "industry", label: "INDUSTRIA", type: "str" },
      { key: "ticker", label: "TICKER", type: "str" },
      { key: "country", label: "PAÍS", type: "str" },
      { key: "price", label: "PRECIO", type: "num" },
      { key: "targetMedian", label: "TARGET", type: "num" },
      { key: "expGrowth", label: "POTENCIAL", type: "pctf" },
      { key: "dvdYield", label: "DIV. YIELD", type: "pctf" },
      { key: "ytd", label: "YTD", type: "pctf" },
      { key: "ret1y", label: "1A", type: "pctf" },
      { key: "ret3y", label: "3A anual.", type: "pctf" },
      { key: "ret5y", label: "5A anual.", type: "pctf" },
      { key: "vol6m", label: "VOL. 6M", type: "pctf" },
      { key: "mktCapB", label: "CAP. (USD Bn)", type: "num" },
    ],
    defaultSort: { key: "ytd", dir: "desc" },
  },
};

/** Ported verbatim from ideasFormatVal. */
export function ideasFormatVal(v: unknown, type: IdeasColumnType): string {
  if (v === null || v === undefined || v === "" || v === "#N/A" || (typeof v === "number" && isNaN(v))) return "—";
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (type === "pctf") return isNaN(n) ? "—" : (n * 100 >= 0 ? "+" : "") + (n * 100).toFixed(2) + "%";
  if (type === "pctv") return isNaN(n) ? "—" : (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
  if (type === "money") return isNaN(n) ? "—" : n.toLocaleString("en-US");
  if (type === "num") return isNaN(n) ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return String(v);
}

/** Ported verbatim from ideasSortVal. */
export function ideasSortVal(v: unknown, type: IdeasColumnType): string | number | null {
  if (v === null || v === undefined || v === "" || v === "#N/A") return null;
  if (type === "str") return String(v).toUpperCase();
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return isNaN(n) ? null : n;
}
