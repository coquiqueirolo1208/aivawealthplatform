export interface UpcomingBirthday {
  clientId: string;
  clientName: string;
  fechaNacimiento: string;
  /** Next occurrence of this birthday's month/day, as YYYY-MM-DD (this year or next). */
  nextOccurrence: string;
  daysUntil: number;
}

/**
 * Finds each client's next birthday occurrence (month/day only — the stored year of
 * birth doesn't matter here) relative to `todayIso`, sorts soonest-first, and returns
 * the `limit` closest. A birthday that falls today counts as 0 days away, not 365.
 */
export function computeUpcomingBirthdays(
  clients: Array<{ id: string; name: string; fechaNacimiento: string | null }>,
  todayIso: string,
  limit: number,
): UpcomingBirthday[] {
  const [ty, tm, td] = todayIso.split("-").map(Number);
  const todayUtc = Date.UTC(ty, tm - 1, td);

  const results = clients
    .filter((c) => !!c.fechaNacimiento)
    .map((c) => {
      const fechaNacimiento = c.fechaNacimiento!;
      const [, bm, bd] = fechaNacimiento.split("-").map(Number);
      let year = ty;
      let occurrence = Date.UTC(year, bm - 1, bd);
      if (occurrence < todayUtc) {
        year += 1;
        occurrence = Date.UTC(year, bm - 1, bd);
      }
      const daysUntil = Math.round((occurrence - todayUtc) / 86400000);
      const nextOccurrence = `${year}-${String(bm).padStart(2, "0")}-${String(bd).padStart(2, "0")}`;
      return { clientId: c.id, clientName: c.name, fechaNacimiento, nextOccurrence, daysUntil };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return results.slice(0, limit);
}
