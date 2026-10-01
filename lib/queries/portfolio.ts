import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { rowToSnapshot } from "@/lib/supabase/mappers";
import type { SnapshotsByMonth } from "@/lib/finance/types";

type DB = SupabaseClient<Database>;
type SnapshotRow = Database["public"]["Tables"]["snapshots"]["Row"];

export interface AccountWithSnapshots {
  id: string;
  label: string;
  custodian: string | null;
  accountNumber: string | null;
  comentario: string | null;
  titularidad: string | null;
  todCompletado: boolean;
  todFecha: string | null;
  montoPendienteTransferir: number | null;
  snapshots: SnapshotsByMonth;
}

export interface ClientWithAccounts {
  id: string;
  name: string;
  isDemo: boolean;
  householdLabel: string | null;
  createdAt: string;
  accounts: AccountWithSnapshots[];
}

// Supabase stops every response at 1,000 rows without an error (config.toml max_rows),
// so an advisor with ~45 accounts × 24 months silently lost random months of history.
const PAGE_SIZE = 1000;
// Long `in (...)` id lists end up in the request URL; split them.
const ID_CHUNK = 100;

type PageResult<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

/** Reads every page of a query. Callers must order the query so pages are stable. */
export async function fetchAllPages<T>(page: (from: number, to: number) => PageResult<T>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return out;
  }
}

/** fetchAllPages for an `.in(column, ids)` filter: chunks the ids and pages each chunk. */
export async function fetchAllIn<T>(ids: string[], page: (chunk: string[], from: number, to: number) => PageResult<T>): Promise<T[]> {
  if (!ids.length) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += ID_CHUNK) chunks.push(ids.slice(i, i + ID_CHUNK));
  const results = await Promise.all(chunks.map((chunk) => fetchAllPages<T>((from, to) => page(chunk, from, to))));
  return results.flat();
}

const CLIENT_COLUMNS = "id, name, is_demo, household_label, created_at";
const ACCOUNT_COLUMNS =
  "id, client_id, label, custodian, account_number, comentario, titularidad, tod_completado, tod_fecha, monto_pendiente_transferir";

type ClientRow = Pick<Database["public"]["Tables"]["clients"]["Row"], "id" | "name" | "is_demo" | "household_label" | "created_at">;

/**
 * Attaches accounts and their snapshots to already-fetched clients, in flat queries
 * (accounts, then snapshots) rather than the original app's N+1 KV scan.
 * `latestOnly` reads the latest_snapshots view (one row per account) for screens
 * that only need each account's current position.
 */
async function withAccountsAndSnapshots(supabase: DB, clients: ClientRow[], latestOnly: boolean): Promise<ClientWithAccounts[]> {
  if (!clients.length) return [];
  const accounts = await fetchAllIn(
    clients.map((c) => c.id),
    (chunk, from, to) => supabase.from("accounts").select(ACCOUNT_COLUMNS).in("client_id", chunk).order("id").range(from, to),
  );

  const snaps: SnapshotRow[] = await fetchAllIn(
    accounts.map((a) => a.id),
    (chunk, from, to) =>
      (latestOnly ? supabase.from("latest_snapshots") : supabase.from("snapshots"))
        .select("*")
        .in("account_id", chunk)
        .order("account_id")
        .order("month")
        .range(from, to),
  );

  const snapsByAccount = new Map<string, SnapshotsByMonth>();
  for (const row of snaps) {
    if (!snapsByAccount.has(row.account_id)) snapsByAccount.set(row.account_id, {});
    snapsByAccount.get(row.account_id)![row.month] = rowToSnapshot(row);
  }

  const accountsByClient = new Map<string, AccountWithSnapshots[]>();
  for (const a of accounts) {
    if (!accountsByClient.has(a.client_id)) accountsByClient.set(a.client_id, []);
    accountsByClient.get(a.client_id)!.push({
      id: a.id,
      label: a.label,
      custodian: a.custodian,
      accountNumber: a.account_number,
      comentario: a.comentario,
      titularidad: a.titularidad,
      todCompletado: a.tod_completado,
      todFecha: a.tod_fecha,
      montoPendienteTransferir: a.monto_pendiente_transferir,
      snapshots: snapsByAccount.get(a.id) ?? {},
    });
  }

  return clients.map((c) => ({
    id: c.id,
    name: c.name,
    isDemo: c.is_demo,
    householdLabel: c.household_label,
    createdAt: c.created_at,
    accounts: accountsByClient.get(c.id) ?? [],
  }));
}

/** Every client owned by this advisor plus every shared demo client (is_demo = true). */
function fetchAdvisorClients(supabase: DB, advisorId: string): Promise<ClientRow[]> {
  return fetchAllPages((from, to) =>
    supabase.from("clients").select(CLIENT_COLUMNS).or(`advisor_id.eq.${advisorId},is_demo.eq.true`).order("name").order("id").range(from, to),
  );
}

/**
 * All of this advisor's clients with each account's full snapshot history. Needed
 * where history matters (Mi Oficina's AUM series and 12-month performers); prefer
 * getAdvisorClientsWithLatestSnapshot otherwise. Memoized per request.
 */
export const getAdvisorClientsWithSnapshots = cache(async (supabase: DB, advisorId: string) =>
  withAccountsAndSnapshots(supabase, await fetchAdvisorClients(supabase, advisorId), false),
);

/** Same clients, but each account carries only its latest snapshot. Memoized per request. */
export const getAdvisorClientsWithLatestSnapshot = cache(async (supabase: DB, advisorId: string) =>
  withAccountsAndSnapshots(supabase, await fetchAdvisorClients(supabase, advisorId), true),
);

/** One client with full snapshot history, or null if it doesn't exist / isn't visible to this advisor. */
export const getClientWithSnapshots = cache(async (supabase: DB, clientId: string): Promise<ClientWithAccounts | null> => {
  const { data, error } = await supabase.from("clients").select(CLIENT_COLUMNS).eq("id", clientId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [client] = await withAccountsAndSnapshots(supabase, [data], false);
  return client;
});
