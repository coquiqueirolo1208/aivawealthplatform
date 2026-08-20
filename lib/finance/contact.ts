export const CONTACT_STALE_DAYS = 90;

export interface LastContactInput {
  clientId: string;
  clientName: string;
  /** Client's own created_at as a fallback reference point when there's no note on file yet. */
  clientCreatedAt: string;
  /** Most recent client_notes.created_at, or null if none exist. */
  lastNoteAt: string | null;
}

export interface StaleContact {
  clientId: string;
  clientName: string;
  lastContactAt: string;
  daysSince: number;
}

/**
 * Clients with no logged contact (note) in `staleDays` — falls back to the client's own
 * created_at when there isn't a single note yet, so a brand-new client gets a full grace
 * period instead of being flagged on day one.
 */
export function computeStaleContacts(
  clients: LastContactInput[],
  todayIso: string,
  staleDays: number = CONTACT_STALE_DAYS,
): StaleContact[] {
  const todayMs = new Date(todayIso).getTime();
  return clients
    .map((c) => {
      const lastContactAt = c.lastNoteAt ?? c.clientCreatedAt;
      const daysSince = Math.floor((todayMs - new Date(lastContactAt).getTime()) / 86400000);
      return { clientId: c.clientId, clientName: c.clientName, lastContactAt, daysSince };
    })
    .filter((c) => c.daysSince >= staleDays)
    .sort((a, b) => b.daysSince - a.daysSince);
}
