import { requireUser } from "@/lib/supabase/server";
import { getAdvisorClientsWithLatestSnapshot } from "@/lib/queries/portfolio";
import { loadRadarData } from "@/lib/queries/radar";
import { countRadarAlertsByClient, latestMonth, toUsdValue } from "@/lib/finance";
import { ClientList, type ClientRow } from "@/components/clients/client-list";

export default async function ClientesPage() {
  const { supabase, user } = await requireUser();

  // The list only shows each client's current AUM, so it reads just the latest
  // statement per account rather than every month of history. The Radar is memoized
  // per request and already computed for the nav badge, so the per-client alert
  // counts cost nothing extra.
  const [clients, radar] = await Promise.all([
    getAdvisorClientsWithLatestSnapshot(supabase, user.id),
    loadRadarData(supabase, user.id),
  ]);
  const alertsByClient = countRadarAlertsByClient(radar);

  const rows: ClientRow[] = clients.map((c) => {
    let aum = 0;
    let any = false;
    let lastStatement: string | null = null;
    for (const acc of c.accounts) {
      const lm = latestMonth(acc.snapshots);
      if (lm && (!lastStatement || lm > lastStatement)) lastStatement = lm;
      const s = lm ? acc.snapshots[lm] : null;
      const v = s ? toUsdValue(s.valorActual, s.moneda, s.tipoCambio) : null;
      if (v != null) {
        aum += v;
        any = true;
      }
    }
    return {
      id: c.id,
      name: c.name,
      aum: any ? aum : null,
      nCuentas: c.accounts.length,
      householdLabel: c.householdLabel,
      lastStatement,
      alerts: alertsByClient.get(c.id) ?? 0,
    };
  });

  return (
    <div>
      <ClientList clients={rows} />
    </div>
  );
}
