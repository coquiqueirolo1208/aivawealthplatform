import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAdvisorClientsWithSnapshots } from "@/lib/queries/portfolio";
import { getPendingTasksForAdvisor } from "@/lib/queries/tasks";
import { loadRadarData } from "@/lib/queries/radar";
import { RadarPanel } from "@/components/office/radar-panel";
import { clientTrailing12m } from "@/lib/finance";
import { ASSET_TYPES, type AssetType } from "@/lib/constants";
import { fmtPct, fmtUSD, pctClass } from "@/lib/format";
import { saveAdvisorMetrics } from "@/lib/actions/advisor";
import { markTaskDone } from "@/lib/actions/tasks";

export default async function OficinaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: metricsRow } = await supabase
    .from("advisor_metrics")
    .select("*")
    .eq("advisor_id", user.id)
    .maybeSingle();
  const aum = (metricsRow?.aum as Partial<Record<AssetType, number>>) ?? {};
  const aumTotal = ASSET_TYPES.reduce((s, t) => s + (aum[t] ?? 0), 0);
  const aumInicioAno = metricsRow?.aum_inicio_ano ?? null;
  const aumGrowth = aumInicioAno ? ((aumTotal - aumInicioAno) / aumInicioAno) * 100 : null;
  const entradasNuevos = metricsRow?.entradas_nuevos_clientes ?? 0;
  const entradasExistentes = metricsRow?.entradas_clientes_existentes ?? 0;
  const salidas = metricsRow?.salidas ?? 0;
  const entradasTotal = entradasNuevos + entradasExistentes;
  const flujoNeto = entradasTotal - salidas;

  const clients = await getAdvisorClientsWithSnapshots(supabase, user.id);
  const performers = clients
    .map((c) => ({ id: c.id, name: c.name, ...clientTrailing12m(c.accounts) }))
    .filter((p) => p.perf12m != null)
    .sort((a, b) => b.perf12m! - a.perf12m!);
  const best5 = performers.slice(0, 5);
  const worst5 = performers.slice(-5).reverse();

  const tasks = await getPendingTasksForAdvisor(supabase, user.id);
  const radarData = await loadRadarData(supabase, user.id);

  return (
    <div>
      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(155px,1fr))] gap-3">
        <Kpi label="AUM total" value={fmtUSD(aumTotal)} />
        <Kpi label="Crecimiento AUM (vs. inicio de año)" value={fmtPct(aumGrowth)} cls={pctClass(aumGrowth)} />
        <Kpi label="Comisiones del trimestre" value={fmtUSD(metricsRow?.comisiones_q ?? null)} />
        <Kpi label="Flujo neto" value={fmtUSD(flujoNeto)} cls={flujoNeto >= 0 ? "pos" : "neg"} />
        <Kpi label="Clientes" value={String(metricsRow?.n_clientes ?? clients.length)} />
      </div>

      <div className="mb-4">
        <h3 className="mb-2 font-heading text-base font-semibold text-(--paper)">Radar</h3>
        <RadarPanel data={radarData} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PerformersCard title="🏆 Mejores 5 clientes (12 meses)" list={best5} />
        <PerformersCard title="⚠ Peores 5 clientes (12 meses)" list={worst5} />
      </div>

      <div className="mt-4 rounded-[10px] border border-(--line) bg-(--panel) p-5">
        <h3 className="mb-3 font-heading text-base font-semibold text-(--paper)">
          Tareas pendientes de todos los clientes
        </h3>
        {tasks.length === 0 ? (
          <div className="p-6 text-center text-[13px] text-(--muted)">No hay tareas pendientes.</div>
        ) : (
          tasks.map((t) => (
            <div
              key={t.id}
              className="mb-2 flex items-center justify-between rounded-lg px-3.5 py-2.5 text-[12.5px]"
              style={{
                background: "var(--panel-2)",
                border: `1px solid ${t.due && t.due < new Date().toISOString().slice(0, 10) ? "var(--brick)" : "var(--line)"}`,
              }}
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

      <form action={saveAdvisorMetrics} className="mt-4 rounded-[10px] border border-(--line) bg-(--panel) p-5">
        <h3 className="mb-3 font-heading text-base font-semibold text-(--paper)">Métricas de la oficina</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {ASSET_TYPES.map((t) => (
            <MetricField key={t} label={`AUM — ${t}`} name={`aum_${t}`} defaultValue={aum[t]} />
          ))}
          <MetricField label="AUM inicio de año" name="aumInicioAno" defaultValue={aumInicioAno} />
          <MetricField label="Comisiones del trimestre" name="comisionesQ" defaultValue={metricsRow?.comisiones_q} />
          <MetricField
            label="Entradas — clientes nuevos"
            name="entradasNuevosClientes"
            defaultValue={metricsRow?.entradas_nuevos_clientes}
          />
          <MetricField
            label="Entradas — clientes existentes"
            name="entradasClientesExistentes"
            defaultValue={metricsRow?.entradas_clientes_existentes}
          />
          <MetricField label="Salidas" name="salidas" defaultValue={metricsRow?.salidas} />
          <MetricField label="N° de clientes" name="nClientes" defaultValue={metricsRow?.n_clientes} />
        </div>
        <button type="submit" className="mt-3.5">
          Guardar
        </button>
      </form>
    </div>
  );
}

function Kpi({ label, value, cls }: { label: string; value: string; cls?: string }) {
  const color = cls === "pos" ? "var(--teal)" : cls === "neg" ? "var(--brick)" : "var(--paper)";
  return (
    <div className="rounded-[10px] border border-(--line) bg-(--panel-2) px-4 py-3.5">
      <div className="mb-1.5 text-[11px] tracking-[0.6px] text-(--muted) uppercase">{label}</div>
      <div className="font-mono text-xl font-semibold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function PerformersCard({
  title,
  list,
}: {
  title: string;
  list: Array<{ id: string; name: string; aum: number | null; perf12m: number | null }>;
}) {
  return (
    <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
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
            className="mb-1.5 flex items-center justify-between rounded-lg px-3.5 py-2.5 text-[12.5px]"
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

function MetricField({ label, name, defaultValue }: { label: string; name: string; defaultValue?: number | null }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-(--muted)">{label}</span>
      <input type="number" step="any" name={name} defaultValue={defaultValue ?? ""} className="w-full" />
    </label>
  );
}
