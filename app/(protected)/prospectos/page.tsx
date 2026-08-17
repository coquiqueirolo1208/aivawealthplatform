import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProspectsForAdvisor } from "@/lib/queries/prospects";
import { ProspectsKanban } from "@/components/clients/prospects-kanban";
import { ONBOARDING_FORM_URL } from "@/lib/constants";
import { fmtUSD } from "@/lib/format";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

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

  const nuevos30d = prospects.filter((p) => nowMs - new Date(p.createdAt).getTime() <= THIRTY_DAYS_MS).length;
  const nuevos1y = prospects.filter((p) => nowMs - new Date(p.createdAt).getTime() <= ONE_YEAR_MS).length;
  const aumPotencialTotal = prospects.reduce((s, p) => s + (p.aumEstimado ?? 0), 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <h2 className="m-0 font-heading text-xl font-semibold text-(--paper)">Prospectos</h2>
          <p className="mt-1 text-[12.5px] text-(--muted)">Pipeline de prospección y alta de nuevos clientes.</p>
        </div>
        <a href={ONBOARDING_FORM_URL} target="_blank" rel="noopener" className="secondary inline-block px-3.5 py-1.5 text-[12px]">
          Cargar cliente nuevo ↗
        </a>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Prospectos totales" value={String(prospects.length)} />
        <StatTile label="Nuevos últimos 30 días" value={String(nuevos30d)} />
        <StatTile label="Nuevos último año" value={String(nuevos1y)} />
        <StatTile label="AUM potencial total" value={fmtUSD(aumPotencialTotal)} />
      </div>

      <ProspectsKanban prospects={prospects} nowMs={nowMs} />
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] border border-(--line) bg-(--panel) p-4">
      <div className="text-[11px] font-semibold tracking-[0.04em] text-(--muted) uppercase">{label}</div>
      <div className="mt-1.5 font-mono text-[20px] font-semibold text-(--paper)">{value}</div>
    </div>
  );
}
