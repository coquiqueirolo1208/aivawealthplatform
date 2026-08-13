// Ported verbatim from dashboard_patrimonial_13.html (fmtUSD/fmtPct/pctClass).

export function fmtUSD(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
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
