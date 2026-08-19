import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdvisorClientsWithSnapshots, type AccountWithSnapshots } from "@/lib/queries/portfolio";
import { getFunds, getModelPortfolio } from "@/lib/queries/reference";
import { getBenchmarkLevels } from "@/lib/queries/benchmark";
import { getAdvisorLogoUrl } from "@/lib/queries/advisor";
import {
  aggregateAllocation,
  buildAssetTable,
  buildPositionChanges,
  computeMTD,
  computePMTargetWeights,
  computeTodPendienteAccounts,
  computeUsSitusExposure,
  computeYTD,
  latestMonth,
  refineAssetAllocation,
  toUsdSnapshotsByMonth,
} from "@/lib/finance";
import { ACCOUNT_COLORS } from "@/lib/constants";
import { fmtPct, fmtUSD, pctClass } from "@/lib/format";
import { AllocationDoughnut } from "@/components/charts/allocation-doughnut";
import { EvolutionLine, type EvolutionSeries } from "@/components/charts/evolution-line";
import { DocumentsCard } from "@/components/clients/documents-card";
import { RiskProfileCard } from "@/components/clients/risk-profile-card";
import { TasksCard } from "@/components/clients/tasks-card";
import { BenchmarkCard } from "@/components/clients/benchmark-card";
import { BulkUploadCard } from "@/components/clients/bulk-upload-card";
import { ExportPdfButton } from "@/components/clients/export-pdf-button";
import { getTasksForClient } from "@/lib/queries/tasks";

function buildEvolutionSeries(accounts: AccountWithSnapshots[]): EvolutionSeries[] {
  const allMonths = Array.from(new Set(accounts.flatMap((a) => Object.keys(a.snapshots)))).sort();
  const totalPoints = allMonths.map((m) => {
    let sum = 0;
    let any = false;
    accounts.forEach((a) => {
      const v = a.snapshots[m]?.valorActual;
      if (v != null) {
        sum += v;
        any = true;
      }
    });
    return { x: m, y: any ? sum : null };
  });
  const series: EvolutionSeries[] = [{ label: "Total consolidado", color: "#B9975B", bold: true, points: totalPoints }];
  accounts.forEach((a, i) => {
    series.push({
      label: a.label,
      color: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length],
      points: Object.entries(a.snapshots).map(([m, s]) => ({ x: m, y: s.valorActual })),
    });
  });
  return series;
}

export default async function ConsolidadoPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const clients = await getAdvisorClientsWithSnapshots(supabase, user.id);
  const client = clients.find((c) => c.id === clientId);
  if (!client) redirect("/clientes");

  const logoUrl = await getAdvisorLogoUrl(supabase, user.id);

  // The consolidado view is always USD: each account's own snapshots convert using
  // that month's own rate, so FX movement across the period is captured correctly
  // rather than applying today's rate to every past month.
  const accs = client.accounts.map((a) => ({ ...a, snapshots: toUsdSnapshotsByMonth(a.snapshots) }));
  const latestByAccount = accs.map((a) => {
    const lm = latestMonth(a.snapshots);
    return { account: a, month: lm, snap: lm ? a.snapshots[lm] : null };
  });
  const withData = latestByAccount.filter((x) => x.snap);
  const total = withData.reduce((s, x) => s + (Number(x.snap!.valorActual) || 0), 0);

  const withMtd = withData
    .map((x) => ({ value: Number(x.snap!.valorActual) || 0, mtd: computeMTD(x.snap).value }))
    .filter((o) => o.mtd != null);
  const mtdBlend = withMtd.length
    ? withMtd.reduce((s, o) => s + o.mtd! * o.value, 0) / withMtd.reduce((s, o) => s + o.value, 0)
    : null;
  const withYtd = withData
    .map((x) => ({
      value: Number(x.snap!.valorActual) || 0,
      ytd: computeYTD(x.account.snapshots, x.month, x.snap).value,
    }))
    .filter((o) => o.ytd != null);
  const ytdBlend = withYtd.length
    ? withYtd.reduce((s, o) => s + o.ytd! * o.value, 0) / withYtd.reduce((s, o) => s + o.value, 0)
    : null;

  const totals = aggregateAllocation(withData.map((x) => x.snap!));
  const assetTable = buildAssetTable(accs.map((a) => ({ account: a, snapshots: a.snapshots })));
  const { compras, ventas } = buildPositionChanges(accs.map((a) => ({ account: a, snapshots: a.snapshots })));
  const evolutionSeries = buildEvolutionSeries(accs);

  const usSitus = computeUsSitusExposure(withData.map((x) => ({ titularidad: x.account.titularidad, holdings: x.snap!.holdings })));
  const todPendiente = computeTodPendienteAccounts(
    accs.map((a) => ({ accountId: a.id, accountLabel: a.label, titularidad: a.titularidad, todCompletado: a.todCompletado })),
  );

  const benchmarkLevels = await getBenchmarkLevels(supabase);

  const { data: documents } = await supabase
    .from("client_documents")
    .select("id, tipo, estado, vencimiento, notas")
    .eq("client_id", clientId);
  const tasks = await getTasksForClient(supabase, clientId);
  const { data: riskProfileRow } = await supabase
    .from("risk_profiles")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();

  let riskDeviation: {
    profileLabel: string;
    rvActual: number;
    rvTarget: number;
    dev: number;
    coveragePct: number;
  } | null = null;
  if (riskProfileRow && withData.length) {
    const [fondosDb, modelPortfolio] = await Promise.all([
      getFunds(supabase),
      getModelPortfolio(supabase, riskProfileRow.profile),
    ]);
    const target = computePMTargetWeights(modelPortfolio);
    if (target) {
      const { refined, coveragePct } = refineAssetAllocation(withData.map((x) => x.snap!), fondosDb);
      const totalActual = Object.values(refined).reduce((s, v) => s + v, 0);
      if (totalActual > 0) {
        const rvActual = ((refined["Renta Variable"] || 0) / totalActual) * 100;
        const rvTarget = target["Renta Variable"] || 0;
        riskDeviation = {
          profileLabel: modelPortfolio?.label ?? riskProfileRow.profile,
          rvActual,
          rvTarget,
          dev: rvActual - rvTarget,
          coveragePct,
        };
      }
    }
  }

  return (
    <div>
      <div className="mb-4">
        <BulkUploadCard clientId={clientId} accounts={accs.map((a) => ({ id: a.id, label: a.label, custodian: a.custodian }))} />
      </div>

      {(usSitus.overThreshold || todPendiente.length > 0) && (
        <div className="mb-4 rounded-[10px] border p-4" style={{ borderColor: "var(--brick)", background: "var(--panel)" }}>
          <h3 className="mb-1.5 font-heading text-[13.5px] font-semibold" style={{ color: "var(--brick)" }}>
            ⚠ Alertas de compliance
          </h3>
          {usSitus.overThreshold && (
            <p className="mb-1 text-[12.5px] text-(--paper-dim)">
              Exposición a acciones/ETFs de EEUU de {fmtUSD(usSitus.total)} en cuentas no jurídicas — más de $60.000 puede
              disparar un US state tax si el titular es persona física.
            </p>
          )}
          {todPendiente.length > 0 && (
            <p className="text-[12.5px] text-(--paper-dim)">
              Transfer on Death (TOD) sin completar en:{" "}
              {todPendiente.map((a, i) => (
                <span key={a.accountId}>
                  {i > 0 && ", "}
                  {a.accountLabel}
                </span>
              ))}
              .
            </p>
          )}
        </div>
      )}

      {!withData.length ? (
        <div className="rounded-[10px] border border-(--line) bg-(--panel) p-10 text-center text-[13.5px] text-(--muted)">
          Todavía no hay estados de cuenta cargados para este cliente. Entrá a una cuenta y cargá el primer mes.
        </div>
      ) : (
        <>
          <div className="mb-2 flex justify-end">
            <ExportPdfButton
              data={{
                clientName: client.name,
                total,
                mtdBlend,
                ytdBlend,
                accounts: latestByAccount.map((x) => ({
                  label: x.account.label,
                  month: x.month,
                  valor: x.snap?.valorActual ?? null,
                  mtd: computeMTD(x.snap).value,
                  ytd: computeYTD(x.account.snapshots, x.month, x.snap).value,
                })),
                allocation: Object.entries(totals).map(([tipo, valor]) => ({ tipo, valor })),
                positions: assetTable.map((r) => ({ name: r.name, total: r.total, mtd: r.mtd, ytd: r.ytd })),
                logoUrl,
              }}
            />
          </div>
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1.3fr_1fr]">
            <div className="card-primary p-6">
              <div className="hero-label">Patrimonio consolidado</div>
              <div className="hero-number mt-1.5 text-(--paper)">{fmtUSD(total)}</div>
              <div className="mt-2.5 flex gap-4 font-mono text-[13px] font-semibold">
                <span style={{ color: pctClass(mtdBlend) === "pos" ? "var(--teal)" : pctClass(mtdBlend) === "neg" ? "var(--brick)" : "var(--paper-dim)" }}>
                  {fmtPct(mtdBlend)} <span className="font-sans text-[11.5px] font-normal text-(--muted)">MTD</span>
                </span>
                <span style={{ color: pctClass(ytdBlend) === "pos" ? "var(--teal)" : pctClass(ytdBlend) === "neg" ? "var(--brick)" : "var(--paper-dim)" }}>
                  {fmtPct(ytdBlend)} <span className="font-sans text-[11.5px] font-normal text-(--muted)">YTD</span>
                </span>
              </div>
            </div>
            <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
              <MetricRow label="Rent. MTD ponderada" value={fmtPct(mtdBlend)} cls={pctClass(mtdBlend)} />
              <MetricRow label="Rent. YTD ponderada" value={fmtPct(ytdBlend)} cls={pctClass(ytdBlend)} />
              <MetricRow label="Cuentas" value={String(accs.length)} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.1fr_1fr]">
            <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
              <h3 className="mb-3 font-heading text-base font-semibold text-(--paper)">Evolución del patrimonio</h3>
              <EvolutionLine series={evolutionSeries} />
            </div>
            <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
              <h3 className="mb-3 font-heading text-base font-semibold text-(--paper)">Asignación de activos</h3>
              <AllocationDoughnut totals={totals} />
            </div>
          </div>

          <div className="mt-4 rounded-[10px] border border-(--line) bg-(--panel) p-5">
            <h3 className="mb-3 font-heading text-base font-semibold text-(--paper)">Detalle por cuenta</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-(--muted)">
                    <th className="text-left">Cuenta</th>
                    <th className="text-left">Mes</th>
                    <th className="text-right">Valor</th>
                    <th className="text-right">MTD</th>
                    <th className="text-right">YTD</th>
                  </tr>
                </thead>
                <tbody>
                  {latestByAccount.map((x) => {
                    const mtd = computeMTD(x.snap);
                    const ytd = computeYTD(x.account.snapshots, x.month, x.snap);
                    return (
                      <tr key={x.account.id} className="border-t border-(--line)">
                        <td className="py-2 text-(--paper)">{x.account.label}</td>
                        <td className="font-mono text-(--paper-dim)">{x.month ?? "—"}</td>
                        <td className="text-right font-mono text-(--paper-dim)">
                          {x.snap ? fmtUSD(x.snap.valorActual) : "—"}
                        </td>
                        <td className={`text-right font-mono ${pctClass(mtd.value) === "pos" ? "text-(--teal)" : pctClass(mtd.value) === "neg" ? "text-(--brick)" : "text-(--paper-dim)"}`}>
                          {fmtPct(mtd.value)}
                        </td>
                        <td className={`text-right font-mono ${pctClass(ytd.value) === "pos" ? "text-(--teal)" : pctClass(ytd.value) === "neg" ? "text-(--brick)" : "text-(--paper-dim)"}`}>
                          {fmtPct(ytd.value)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 rounded-[10px] border border-(--line) bg-(--panel) p-5">
            <h3 className="mb-3 font-heading text-base font-semibold text-(--paper)">
              Posiciones consolidadas <span className="text-[11px] font-normal text-(--muted)">ordenado por valor</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-(--muted)">
                    <th className="text-left">Activo</th>
                    <th className="text-right">Valor</th>
                    <th className="text-right">% cartera</th>
                    <th className="text-right">MTD</th>
                    <th className="text-right">YTD</th>
                  </tr>
                </thead>
                <tbody>
                  {assetTable.map((r) => (
                    <tr key={r.name} className="border-t border-(--line)">
                      <td className="py-2 text-(--paper)">{r.name}</td>
                      <td className="text-right font-mono text-(--paper-dim)">{fmtUSD(r.total)}</td>
                      <td className="text-right font-mono text-(--paper-dim)">
                        {total ? ((r.total / total) * 100).toFixed(1) + "%" : "—"}
                      </td>
                      <td className="text-right font-mono text-(--paper-dim)">{fmtPct(r.mtd)}</td>
                      <td className="text-right font-mono text-(--paper-dim)">{fmtPct(r.ytd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {(compras.length > 0 || ventas.length > 0) && (
            <div className="mt-4 rounded-[10px] border border-(--line) bg-(--panel) p-5">
              <h3 className="mb-3 font-heading text-base font-semibold text-(--paper)">Cambios de posiciones — último mes</h3>
              {compras.map((p) => (
                <div key={`c-${p.account}-${p.nombre}`} className="mb-1.5 text-[12.5px] text-(--teal)">
                  + {p.nombre} ({p.account}) — {fmtUSD(p.valor)}
                </div>
              ))}
              {ventas.map((p) => (
                <div key={`v-${p.account}-${p.nombre}`} className="mb-1.5 text-[12.5px] text-(--brick)">
                  − {p.nombre} ({p.account}) — {fmtUSD(p.valor)}
                </div>
              ))}
            </div>
          )}

          <BenchmarkCard portfolioMTD={mtdBlend} portfolioYTD={ytdBlend} benchmarkLevels={benchmarkLevels} />
        </>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <TasksCard clientId={clientId} tasks={tasks} />
        <DocumentsCard clientId={clientId} documents={documents ?? []} />
        <RiskProfileCard
          clientId={clientId}
          existing={
            riskProfileRow
              ? {
                  answers: riskProfileRow.answers as Record<string, number>,
                  score: riskProfileRow.score,
                  profile: riskProfileRow.profile as "conservador" | "balanceado" | "dinamico",
                  completedAt: riskProfileRow.completed_at,
                }
              : null
          }
        />
      </div>

      {riskDeviation && (
        <div className="mt-4 rounded-[10px] border border-(--line) bg-(--panel) p-5">
          <h3 className="mb-1 font-heading text-base font-semibold text-(--paper)">Desvío vs. perfil de riesgo</h3>
          <p className="mb-3 text-[12px] text-(--muted)">
            Compara la asignación real de la cartera (reclasificando &ldquo;Fondos Mutuos&rdquo; contra la watchlist de fondos —{" "}
            {riskDeviation.coveragePct.toFixed(0)}% de cobertura) contra el portafolio modelo de su perfil (
            {riskDeviation.profileLabel}).
          </p>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-(--muted)">
                <th className="text-left"></th>
                <th className="text-right">Actual</th>
                <th className="text-right">Objetivo</th>
                <th className="text-right">Desvío</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-(--line)">
                <td className="py-2 text-(--paper)">Renta Variable</td>
                <td className="text-right font-mono text-(--paper-dim)">{riskDeviation.rvActual.toFixed(1)}%</td>
                <td className="text-right font-mono text-(--paper-dim)">{riskDeviation.rvTarget.toFixed(1)}%</td>
                <td
                  className="text-right font-mono"
                  style={{ color: Math.abs(riskDeviation.dev) > 15 ? "var(--brick)" : "var(--paper-dim)" }}
                >
                  {riskDeviation.dev >= 0 ? "+" : ""}
                  {riskDeviation.dev.toFixed(1)} p.p.
                </td>
              </tr>
            </tbody>
          </table>
          {Math.abs(riskDeviation.dev) > 15 && (
            <div className="mt-3 rounded-lg px-3.5 py-2.5 text-[12.5px]" style={{ background: "var(--panel-2)", border: "1px solid var(--brick)", color: "var(--paper-dim)" }}>
              La exposición a Renta Variable se desvía más de 15 puntos porcentuales del perfil declarado.
            </div>
          )}
        </div>
      )}
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
