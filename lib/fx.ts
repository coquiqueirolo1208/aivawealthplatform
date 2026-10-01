// Historical USD exchange rates from fawazahmed0/currency-api (free, no API key,
// mirrored on two independent CDNs). Rates are "units of the target currency per 1
// USD" — the same convention snapshots.tipo_cambio uses. Server-only (called from
// Server Actions when a non-USD snapshot is saved).
import { todayIso } from "@/lib/dates";

/** `version` is a YYYY-MM-DD date or "latest" — both CDNs accept either. */
function sourceUrls(version: string): string[] {
  return [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${version}/v1/currencies/usd.json`,
    `https://${version}.currency-api.pages.dev/v1/currencies/usd.json`,
  ];
}

/** Last calendar day of "YYYY-MM", as "YYYY-MM-DD" — the conventional valuation date for a monthly statement. */
export function lastDayOfMonth(monthYYYYMM: string): string {
  const [y, m] = monthYYYYMM.split("-").map(Number);
  const d = new Date(Date.UTC(y, m, 0));
  return d.toISOString().slice(0, 10);
}

/**
 * Fetches how many units of `currencyCode` equal 1 USD on the given date, or null if unavailable.
 * A statement for the current month is valued at a month-end that hasn't happened yet,
 * which the API has no data for — fall back to the latest published rate then.
 */
export async function fetchUsdExchangeRate(currencyCode: string, dateYYYYMMDD: string): Promise<number | null> {
  const code = currencyCode.toLowerCase();
  const date = dateYYYYMMDD > todayIso() ? "latest" : dateYYYYMMDD;
  for (const url of sourceUrls(date)) {
    try {
      const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 }, signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const data = await res.json();
      const rate = data?.usd?.[code];
      if (typeof rate === "number" && rate > 0) return rate;
    } catch {
      // try the next mirror
    }
  }
  return null;
}
