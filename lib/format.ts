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

/**
 * Formats a date-only or datetime ISO string as dd/mm/yyyy. Pulls the leading
 * YYYY-MM-DD via regex rather than `new Date(iso)` — a date-only string parses
 * as UTC midnight, which can shift a day when read back in a behind-UTC local
 * time zone.
 */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
}

/** Formats a full ISO timestamp as dd/mm/yyyy, HH:mm in the viewer's local time zone. */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  const dd = String(date.getDate()).padStart(2, "0");
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mo}/${date.getFullYear()}, ${hh}:${mm}`;
}
