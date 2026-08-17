import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAdvisorClientsWithSnapshots } from "@/lib/queries/portfolio";
import { getPendingTasksForAdvisor } from "@/lib/queries/tasks";
import { loadRadarData } from "@/lib/queries/radar";
import { RadarPanel } from "@/components/office/radar-panel";
import {
  aggregateAllocation,
  aggregateTopHoldings,
  clientTrailing12m,
  computeOfficeAumSeries,
  latestMonth,
  monthsInRange,
  toUsdSnapshotsByMonth,
} from "@/lib/finance";
import { fmtPct, fmtUSD, pctClass } from "@/lib/format";
import { markTaskDone } from "@/lib/actions/tasks";
import { AllocationDoughnut } from "@/components/charts/allocation-doughnut";
import { EvolutionLine } from "@/components/charts/evolution-line";

export default async function OficinaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const clientsRaw = await getAdvisorClientsWithSnapshots(supabase, user.id);
  // Every office-wide figure (AUM, growth, flows, performers) is USD — convert each
  // account's snapshots using their own month's rate before any of it is summed.
  const clients = clientsRaw.map((c) => ({
    ...c,
    accounts: c.accounts.map((a) => ({ ...a, snapshots: toUsdSnapshotsByMonth(a.snapshots) })),
  }));

  // AUM, growth and net flow are all summed straight from client account
  // snapshots (no more manually-entered office metrics to keep in sync).
  const aumTotal = clients.reduce((s, c) => s + (clientTrailing12m(c.accounts).aum ?? 0), 0);

  const baselineMonth = new Date().getFullYear() - 1 + "-12";
  let aumInicioAno = 0;
  let hasBaseline = false;
  let flujoNeto = 0;
  let hasFlujo = false;
  clients.forEach((c) =>
    c.accounts.forEach((a) => {
      const baseSnap = a.snapshots[baselineMonth];
      if (baseSnap && typeof baseSnap.valorActual === "number") {
        aumInicioAno += baseSnap.valorActual;
        hasBaseline = true;
      }
      const lm = latestMonth(a.snapshots);
      const flujosYTD = lm ? a.snapshots[lm].flujosNetosYTD : null;
      if (typeof flujosYTD === "number") {
        flujoNeto += flujosYTD;
        hasFlujo = true;
      }
    }),
  );
  const aumGrowth = hasBaseline && aumInicioAno !== 0 ? ((aumTotal - aumInicioAno) / aumInicioAno) * 100 : null;
  const flujoNetoValue = hasFlujo ? flujoNeto : null;

  // Office-wide holdings/allocation come from each account's own latest snapshot —
  // same "latest per account" basis as aumTotal above, just not yet summed.
  const latestSnapshots = clients.flatMap((c) =>
    c.accounts.map((a) => {
      const lm = latestMonth(a.snapshots);
      return lm ? a.snapshots[lm] : null;
    }),
  ).filter((s) => s !== null);
  const allocationTotals = aggregateAllocation(latestSnapshots);
  const topHoldings = aggregateTopHoldings(
    latestSnapshots.map((s) => s.holdings),
    5,
  );

  const currentYYYYMM = new Date().toISOString().slice(0, 7);
  const perAccountSparse = clients.flatMap((c) =>
    c.accounts.map((a) => {
      const sparse: Record<string, number> = {};
      Object.entries(a.snapshots).forEach(([m, s]) => {
        if (typeof s.valorActual === "number") sparse[m] = s.valorActual;
      });
      return sparse;
    }),
  );
  const aumSeries = computeOfficeAumSeries(
    perAccountSparse,
    monthsInRange(new Date().getFullYear() + "-01", currentYYYYMM),
    "monthly",
  );

  // Comisiones del trimestre isn't derivable from client/account data at all —
  // shown as a fixed reference figure from the seeded demo dataset, not editable.
  const { data: demoMetrics } = await supabase
    .from("advisor_metrics")
    .select("comisiones_q")
    .eq("is_demo", true)
    .maybeSingle();

  const performers = clients
    .map((c) => ({ id: c.id, name: c.name, ...clientTrailing12m(c.accounts) }))
    .filter((p) => p.perf12m != null)
    .sort((a, b) => b.perf12m! - a.perf12m!);
  const best5 = performers.slice(0, 5);
  const worst5 = performers.slice(-5).reverse();

  // Overdue tasks are already covered by Radar's "Tareas vencidas" — this list only
  // needs the ones still ahead, so the two sections don't repeat the same items.
  const todayIso = new Date().toISOString().slice(0, 10);
  const upcomingTasks = (await getPendingTasksForAdvisor(supabase, user.id)).filter((t) => !t.due || t.due >= todayIso);
  const radarData = await loadRadarData(supabase, user.id);

  const growthCls = pctClass(aumGrowth);
  const growthColor = growthCls === "pos" ? "var(--teal)" : growthCls === "neg" ? "var(--brick)" : "var(--paper-dim)";
  const flujoCls = flujoNetoValue == null ? undefined : flujoNetoValue >= 0 ? "pos" : "neg";

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1.3fr_1fr]">
        <div className="card-primary p-6">
          <div className="hero-label">AUM total</div>
          <div className="hero-number mt-1.5 text-(--paper)">{fmtUSD(aumTotal)}</div>
          <div className="mt-2.5 font-mono text-[13px] font-semibold" style={{ color: growthColor }}>
            {fmtPct(aumGrowth)} <span className="font-sans text-[12px] font-normal text-(--muted)">vs. inicio de año</span>
          </div>
          <div className="mt-4">
            <EvolutionLine series={[{ label: "AUM total", color: "#B9975B", bold: true, points: aumSeries }]} />
          </div>
        </div>
        <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
          <MetricRow label="Comisiones del trimestre" value={fmtUSD(demoMetrics?.comisiones_q ?? null)} />
          <MetricRow label="Flujo neto" value={fmtUSD(flujoNetoValue)} cls={flujoCls} />
          <MetricRow label="Clientes" value={String(clients.length)} />
        </div>
      </div>

      <div className="mb-4">
        <h3 className="mb-2 font-heading text-base font-semibold text-(--paper)">Radar</h3>
        <RadarPanel data={radarData} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
          <h3 className="mb-3 font-heading text-base font-semibold text-(--paper)">
            Top 5 holdings (todos los clientes)
          </h3>
          {topHoldings.length === 0 ? (
            <div className="p-6 text-center text-[13px] text-(--muted)">Sin datos de holdings todavía.</div>
          ) : (
            topHoldings.map((h) => (
              <div
                key={h.name}
                className="row-hover mb-1.5 flex items-center justify-between rounded-lg px-3.5 py-2.5 text-[12.5px]"
                style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}
              >
                <span className="text-(--paper)">{h.name}</span>
                <span className="font-mono text-(--muted)">{fmtUSD(h.total)}</span>
              </div>
            ))
          )}
        </div>
        <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
          <h3 className="mb-3 font-heading text-base font-semibold text-(--paper)">
            Asignación de activos (todos los clientes)
          </h3>
          <AllocationDoughnut totals={allocationTotals} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PerformersCard title="Mejores 5 clientes (12 meses)" accent="pos" list={best5} />
        <PerformersCard title="Peores 5 clientes (12 meses)" accent="neg" list={worst5} />
      </div>

      <div className="mt-4 rounded-[10px] border border-(--line) bg-(--panel) p-5">
        <h3 className="mb-3 font-heading text-base font-semibold text-(--paper)">Tareas Pendientes No Vencidas</h3>
        {upcomingTasks.length === 0 ? (
          <div className="p-6 text-center text-[13px] text-(--muted)">No hay tareas pendientes.</div>
        ) : (
          upcomingTasks.map((t) => (
            <div
              key={t.id}
              className="row-hover mb-2 flex items-center justify-between rounded-lg px-3.5 py-2.5 text-[12.5px]"
              style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}
            >
              <span>
                <Link href={`/clientes/${t.clientId}`} className="font-semibold text-(--brass) underline">
                  {t.clientName}
                </Link>{" "}
                — {t.title} {t.due && <span className="font-mono text-(--muted)">(vence {t.due})</span>}
              </span>
              <form action={markTaskDone.bind(null, t.id)}>
                <button type="submit" className="secondary px-2.5 py-1 text-[11px]">
                  Marcar hecha
                </button>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MetricRow({ label, value, cls }: { label: string; value: string; cls?: string }) {
  const color = cls === "pos" ? "var(--teal)" : cls === "neg" ? "var(--brick)" : "var(--paper)";
  return (
    <div className="row-hover flex items-center justify-between border-t border-(--line) py-2.5 first:border-t-0 first:pt-0">
      <span className="text-[12px] text-(--muted)">{label}</span>
      <span className="font-mono text-[14px] font-semibold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function PerformersCard({
  title,
  list,
  accent,
}: {
  title: string;
  list: Array<{ id: string; name: string; aum: number | null; perf12m: number | null }>;
  accent: "pos" | "neg";
}) {
  const accentColor = accent === "pos" ? "var(--teal)" : "var(--brick)";
  return (
    <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5" style={{ borderTop: `2px solid ${accentColor}` }}>
      <h3 className="mb-3 font-heading text-base font-semibold text-(--paper)">{title}</h3>
      {list.length === 0 ? (
        <div className="p-6 text-center text-[13px] text-(--muted)">
          Todavía no hay suficiente historial (se necesitan ~12 meses de estados de cuenta).
        </div>
      ) : (
        list.map((p) => (
          <Link
            key={p.id}
            href={`/clientes/${p.id}`}
            className="row-hover mb-1.5 flex items-center justify-between rounded-lg px-3.5 py-2.5 text-[12.5px]"
            style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}
          >
            <span className="text-(--paper)">{p.name}</span>
            <span className="font-mono" style={{ color: pctClass(p.perf12m) === "pos" ? "var(--teal)" : "var(--brick)" }}>
              {fmtPct(p.perf12m)}
            </span>
          </Link>
        ))
      )}
    </div>
  );
}
