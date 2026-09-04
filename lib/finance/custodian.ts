// Matches an AI-extracted statement to an existing account across separate,
// independent extractions of the same real custodian. Two real statements from
// the same institution (e.g. two different months) often get worded differently
// by the model — "Pershing LLC (clearing) / Pro Capital (introducing firm)" vs.
// "Pro Capital (clearing through Pershing LLC)" — so a plain substring check
// misses real matches. Account number is the reliable identifier when present;
// custodian-name token overlap is the fallback for accounts created before a
// number was captured, or statements where the model didn't find one.

const CUSTODIAN_STOPWORDS = new Set([
  "LLC", "INC", "SA", "LTD", "PLC", "CORP", "CO", "THE", "AND", "OF", "FOR",
  "BANK", "BANCO", "FINANCIAL", "SERVICES", "GROUP", "HOLDINGS",
  "INTL", "INTERNATIONAL", "PRIVATE", "BANKING",
  "CLEARING", "THROUGH", "FIRM", "INTRODUCING", "IBD",
]);

/** Uppercases, strips punctuation, drops generic/legal-entity noise words. */
export function custodianTokens(name: string | null | undefined): string[] {
  if (!name) return [];
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !CUSTODIAN_STOPWORDS.has(t));
}

/** Symmetric token-overlap score (Dice coefficient) between two custodian name strings, 0-1. */
export function custodianNameScore(a: string | null | undefined, b: string | null | undefined): number {
  const tokensA = custodianTokens(a);
  const tokensB = custodianTokens(b);
  if (!tokensA.length || !tokensB.length) return 0;
  const setB = new Set(tokensB);
  const shared = tokensA.filter((t) => setB.has(t)).length;
  return (2 * shared) / (tokensA.length + tokensB.length);
}

const CUSTODIAN_NAME_MATCH_THRESHOLD = 0.5;

export function custodianNamesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  return custodianNameScore(a, b) >= CUSTODIAN_NAME_MATCH_THRESHOLD;
}

/** Uppercases and strips everything but letters/digits, so "JXD-042568" and "jxd 042568" compare equal. */
export function normalizeAccountNumber(n: string | null | undefined): string {
  return (n || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export interface CustodianMatchAccount {
  id: string;
  label: string;
  custodian: string | null;
  accountNumber: string | null;
}

/**
 * Best existing account for a freshly extracted statement: an exact account-number
 * match wins outright when both sides have one; otherwise falls back to the
 * highest-scoring custodian-name match above threshold. Returns null (meaning:
 * offer to create a new account) when neither signal is confident enough.
 */
export function matchAccountByCustodian(
  extracted: { numeroCuenta?: string | null; custodioDetectado?: string | null },
  accounts: CustodianMatchAccount[],
): string | null {
  const extractedNumber = normalizeAccountNumber(extracted.numeroCuenta);
  if (extractedNumber) {
    const byNumber = accounts.find((a) => a.accountNumber && normalizeAccountNumber(a.accountNumber) === extractedNumber);
    if (byNumber) return byNumber.id;
  }

  if (!extracted.custodioDetectado) return null;
  let best: CustodianMatchAccount | null = null;
  let bestScore = 0;
  for (const a of accounts) {
    const score = Math.max(custodianNameScore(extracted.custodioDetectado, a.label), custodianNameScore(extracted.custodioDetectado, a.custodian));
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return bestScore >= CUSTODIAN_NAME_MATCH_THRESHOLD ? best!.id : null;
}
