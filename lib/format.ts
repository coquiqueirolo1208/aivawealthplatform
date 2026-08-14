// Ported verbatim from dashboard_patrimonial_13.html (fmtUSD/fmtPct/pctClass).

export function fmtUSD(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/** Same as fmtUSD when currency is null/"USD"; otherwise formats in that local currency
 * with its ISO code shown explicitly (not a "$" symbol, which several Latin American
 * currencies share with USD and would otherwise read as ambiguous). */
export function fmtCurrency(n: number | null | undefined, currency?: string | null): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  if (!currency || currency === "USD") return fmtUSD(n);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "code",
      maximumFractionDigits: 0,
    }).format(Number(n));
  } catch {
    return fmtUSD(n);
  }
}

export function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  const s = n >= 0 ? "+" : "";
  return s + Number(n).toFixed(2) + "%";
}

export function pctClass(n: number | null | undefined): "pos" | "neg" | "" {
  if (n === null || n === undefined || isNaN(n)) return "";
  return n >= 0 ? "pos" : "neg";
}

export function pctColor(n: number | null | undefined): string {
  const cls = pctClass(n);
  if (cls === "pos") return "var(--teal)";
  if (cls === "neg") return "var(--brick)";
  return "var(--paper-dim)";
}
