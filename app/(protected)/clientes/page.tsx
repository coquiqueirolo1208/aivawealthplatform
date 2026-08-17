import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdvisorClientsWithSnapshots } from "@/lib/queries/portfolio";
import { latestMonth } from "@/lib/finance";
import { ClientList, type ClientRow } from "@/components/clients/client-list";
import { AdvisorLogoCard } from "@/components/office/advisor-logo-card";
import { getAdvisorLogoUrl } from "@/lib/queries/advisor";

export default async function ClientesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const clients = await getAdvisorClientsWithSnapshots(supabase, user.id);
  const rows: ClientRow[] = clients.map((c) => {
    let aum = 0;
    let any = false;
    for (const acc of c.accounts) {
      const lm = latestMonth(acc.snapshots);
      const v = lm ? acc.snapshots[lm].valorActual : null;
      if (v != null) {
        aum += v;
        any = true;
      }
    }
    return { id: c.id, name: c.name, aum: any ? aum : null, nCustodios: c.accounts.length };
  });

  const logoUrl = await getAdvisorLogoUrl(supabase, user.id);

  return (
    <div>
      <div className="mb-4">
        <AdvisorLogoCard logoUrl={logoUrl} />
      </div>
      <ClientList clients={rows} />
    </div>
  );
}
