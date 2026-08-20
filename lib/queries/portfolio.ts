import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { rowToSnapshot } from "@/lib/supabase/mappers";
import type { SnapshotsByMonth } from "@/lib/finance/types";

export interface AccountWithSnapshots {
  id: string;
  label: string;
  custodian: string | null;
  accountNumber: string | null;
  comentario: string | null;
  titularidad: string | null;
  todCompletado: boolean;
  todFecha: string | null;
  snapshots: SnapshotsByMonth;
}

export interface ClientWithAccounts {
  id: string;
  name: string;
  isDemo: boolean;
  householdLabel: string | null;
  createdAt: string;
  /** Share (0-100) of this client's benchmark allocated to MSCI World — null means use the platform default. */
  benchmarkMsciPct: number | null;
  accounts: AccountWithSnapshots[];
}

/**
 * Fetches every client owned by this advisor, plus every shared demo client
 * (is_demo = true, regardless of owner), together with each account's full
 * snapshot history, in 3 flat queries (clients -> accounts -> snapshots) rather
 * than the original app's N+1 KV scan. Feeds both the Mis Clientes list
 * (latest-month AUM) and Mi Oficina's trailing-12m performers (needs full history).
 */
export async function getAdvisorClientsWithSnapshots(
  supabase: SupabaseClient<Database>,
  advisorId: string,
): Promise<ClientWithAccounts[]> {
  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("id, name, is_demo, household_label, created_at, benchmark_msci_pct")
    .or(`advisor_id.eq.${advisorId},is_demo.eq.true`)
    .order("name");
  if (clientsError) throw clientsError;
  if (!clients?.length) return [];

  const clientIds = clients.map((c) => c.id);
  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select("id, client_id, label, custodian, account_number, comentario, titularidad, tod_completado, tod_fecha")
    .in("client_id", clientIds);
  if (accountsError) throw accountsError;

  const accountIds = (accounts ?? []).map((a) => a.id);
  const { data: snaps, error: snapsError } =
    accountIds.length > 0
      ? await supabase.from("snapshots").select("*").in("account_id", accountIds)
      : { data: [], error: null };
  if (snapsError) throw snapsError;

  const snapsByAccount = new Map<string, SnapshotsByMonth>();
  for (const row of snaps ?? []) {
    if (!snapsByAccount.has(row.account_id)) snapsByAccount.set(row.account_id, {});
    snapsByAccount.get(row.account_id)![row.month] = rowToSnapshot(row);
  }

  const accountsByClient = new Map<string, AccountWithSnapshots[]>();
  for (const a of accounts ?? []) {
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
      snapshots: snapsByAccount.get(a.id) ?? {},
    });
  }

  return clients.map((c) => ({
    id: c.id,
    name: c.name,
    isDemo: c.is_demo,
    householdLabel: c.household_label,
    benchmarkMsciPct: c.benchmark_msci_pct,
    createdAt: c.created_at,
    accounts: accountsByClient.get(c.id) ?? [],
  }));
}
