import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProspectsForAdvisor } from "@/lib/queries/prospects";
import { ProspectsKanban } from "@/components/clients/prospects-kanban";
import { ProspectsStatTiles } from "@/components/clients/prospects-stat-tiles";
import { ExportExcelButton } from "@/components/clients/export-excel-button";
import { ONBOARDING_FORM_URL } from "@/lib/constants";

export default async function ProspectosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const prospects = await getProspectsForAdvisor(supabase, user.id);
  // Server Component, rendered fresh per request (no `use cache` / Cache Components
  // opted in here) — safe to read the real clock, unlike in a cacheable component.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <h2 className="m-0 font-heading text-xl font-semibold text-(--paper)">Prospectos</h2>
          <p className="mt-1 text-[12.5px] text-(--muted)">Pipeline de prospección y alta de nuevos clientes.</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportExcelButton prospects={prospects} filename="prospectos" />
          <a href={ONBOARDING_FORM_URL} target="_blank" rel="noopener" className="secondary inline-block px-3.5 py-1.5 text-[12px]">
            Cargar cliente nuevo ↗
          </a>
        </div>
      </div>

      <ProspectsStatTiles prospects={prospects} nowMs={nowMs} />

      <ProspectsKanban prospects={prospects} nowMs={nowMs} />
    </div>
  );
}
