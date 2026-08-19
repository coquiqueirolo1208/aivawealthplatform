import type { Holding } from "./types";

export const US_SITUS_THRESHOLD_USD = 60000;

// Name-based heuristic only — a starting suggestion, never authoritative. Matches
// common US-domiciled ETF tickers/names and well-known individual US stocks; misses
// anything else, and can false-positive on similarly-named non-US share classes
// (e.g. an Irish-domiciled UCITS "S&P 500" tracker isn't US situs). Since this feeds
// a tax-relevant compliance flag, the advisor must confirm/override per holding —
// see Holding.usSitus.
const US_ETF_HINTS = [
  /\bSPY\b/, /\bVOO\b/, /\bIVV\b/, /\bQQQ\b/, /\bVTI\b/, /\bIWM\b/, /\bDIA\b/,
  /\bVUG\b/, /\bVTV\b/, /\bXLK\b/, /\bXLF\b/,
  /\bS&P\s*500\b/i, /\bvanguard\b.*\betf\b/i,
] as const;

const US_STOCK_HINTS = [
  /\bapple\b/i, /\bmicrosoft\b/i, /\bamazon\b/i, /\balphabet\b/i, /\bgoogle\b/i,
  /\bmeta platforms\b/i, /\btesla\b/i, /\bnvidia\b/i, /\bnetflix\b/i, /\bberkshire\b/i,
  /\bjpmorgan\b/i, /\bexxon\b/i, /\bwalmart\b/i, /\bvisa\b/i, /\bmastercard\b/i,
  /\bcoca-cola\b/i, /\bpepsico\b/i, /\bjohnson\s*&\s*johnson\b/i, /\bprocter\s*&\s*gamble\b/i,
] as const;

export function guessUsSitus(nombre: string): boolean {
  return US_ETF_HINTS.some((re) => re.test(nombre)) || US_STOCK_HINTS.some((re) => re.test(nombre));
}

/** Whichever the advisor set explicitly takes precedence; otherwise falls back to the name heuristic. */
export function isUsSitusHolding(h: Pick<Holding, "nombre" | "usSitus">): boolean {
  return h.usSitus ?? guessUsSitus(h.nombre);
}

export interface UsSitusAccountInput {
  titularidad: string | null;
  holdings: Holding[];
}

/**
 * Sums US-situs holdings across every account NOT held by a legal entity (personal
 * or not-yet-classified titularidad) — a persona jurídica account doesn't carry the
 * individual non-resident US estate/state-tax exposure this threshold is about, so
 * it's excluded; anything not yet classified is included on purpose (safer to flag
 * and let the advisor rule it out than to silently miss it).
 */
export function computeUsSitusExposure(
  accounts: UsSitusAccountInput[],
  threshold: number = US_SITUS_THRESHOLD_USD,
): { total: number; overThreshold: boolean } {
  const total = accounts
    .filter((a) => a.titularidad !== "juridica")
    .reduce((sum, a) => sum + a.holdings.filter(isUsSitusHolding).reduce((s, h) => s + (h.valor || 0), 0), 0);
  return { total, overThreshold: total > threshold };
}

export interface TodAccountInput {
  accountId: string;
  accountLabel: string;
  titularidad: string | null;
  todCompletado: boolean;
}

/** Accounts still needing a Transfer on Death designation — same "unclassified counts as pending" rule as above. */
export function computeTodPendienteAccounts<T extends TodAccountInput>(accounts: T[]): T[] {
  return accounts.filter((a) => a.titularidad !== "juridica" && !a.todCompletado);
}
