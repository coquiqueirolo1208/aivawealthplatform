import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdvisorClientsWithSnapshots } from "@/lib/queries/portfolio";
import { computeCostsYTD, computeHoldingsWithYTD, computeMTD, computeYTD, latestMonth } from "@/lib/finance";
import { fmtCurrency, fmtPct, pctClass } from "@/lib/format";
import { AllocationDoughnut } from "@/components/charts/allocation-doughnut";
import { EvolutionLine } from "@/components/charts/evolution-line";
import { SnapshotForm } from "@/components/clients/snapshot-form";

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string; accountId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { clientId, accountId } = await params;
  const { month: monthParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const clients = await getAdvisorClientsWithSnapshots(supabase, user.id);
  const client = clients.find((c) => c.id === clientId);
  const account = client?.accounts.find((a) => a.id === accountId);
  if (!client || !account) redirect(`/clientes/${clientId}`);

  const months = Object.keys(account.snapshots).sort();
  const lm = latestMonth(account.snapshots);
  const selectedMonth = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : (lm ?? "");
  const snap = selectedMonth ? (account.snapshots[selectedMonth] ?? null) : null;

  const mtd = computeMTD(snap);
  const ytd = computeYTD(account.snapshots, selectedMonth || null, snap);
  const costsYtd = computeCostsYTD(account.snapshots, selectedMonth || null);
  const holdings = snap ? computeHoldingsWithYTD(account.snapshots, snap, selectedMonth) : [];

  const hasPasivo = snap && typeof snap.valorPasivos === "number" && snap.valorPasivos !== 0;

  return (
    <div>
      {!months.length ? (
        <div className="mb-4 rounded-[10px] border border-(--line) bg-(--panel) p-10 text-center text-[13.5px] text-(--muted)">
          Todavía no hay ningún estado de cuenta cargado para {account.label}. Cargá el primer mes abajo.
        </div>
      ) : snap ? (
        <>
          <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(155px,1fr))] gap-3">
            <Kpi label={`Valor (${selectedMonth})`} value={fmtCurrency(snap.valorActual, snap.moneda)} />
            <Kpi label="Rent. MTD" value={fmtPct(mtd.value)} cls={pctClass(mtd.value)} />
            <Kpi label="Rent. YTD" value={fmtPct(ytd.value)} cls={pctClass(ytd.value)} />
            <Kpi label="Costos YTD" value={costsYtd.value != null ? fmtCurrency(costsYtd.value, snap.moneda) : "—"} />
          </div>
          {snap.moneda && snap.moneda !== "USD" && (
            <div className="mb-4 rounded-[10px] border border-(--line) bg-(--panel-2) p-3.5 text-[12.5px] text-(--paper-dim)">
              Estado de cuenta en {snap.moneda}
              {snap.tipoCambio
                ? ` — se convierte a USD en el consolidado a ${snap.tipoCambio.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${snap.moneda}/USD (fin de mes).`
                : " — no se pudo obtener el tipo de cambio de ese mes, no se está convirtiendo a USD en el consolidado."}
            </div>
          )}
          {hasPasivo && (
            <div className="mb-4 rounded-[10px] border border-(--brass-dim) bg-(--panel-2) p-3.5 text-[12.5px] text-(--paper-dim)">
              Desglose: activos {fmtCurrency(snap.valorActivos, snap.moneda)} − pasivos (línea de crédito/sobregiro){" "}
              {fmtCurrency(snap.valorPasivos, snap.moneda)} = patrimonio neto {fmtCurrency(snap.valorActual, snap.moneda)}. MTD/YTD se
              calculan sobre el patrimonio neto.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.1fr_1fr]">
            <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
              <h3 className="mb-3 font-heading text-base font-semibold text-(--paper)">Evolución del valor</h3>
              <EvolutionLine
                series={[
                  {
                    label: account.label,
                    color: "#28466F",
                    bold: true,
                    points: Object.entries(account.snapshots).map(([m, s]) => ({ x: m, y: s.valorActual })),
                  },
                ]}
              />
            </div>
            <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
              <h3 className="mb-3 font-heading text-base font-semibold text-(--paper)">Asignación de activos</h3>
              <AllocationDoughnut
                totals={Object.fromEntries(snap.asignacion.map((a) => [a.tipo, a.valor]))}
              />
            </div>
          </div>

          <div className="mt-4 rounded-[10px] border border-(--line) bg-(--panel) p-5">
            <h3 className="mb-3 font-heading text-base font-semibold text-(--paper)">Posiciones</h3>
            {holdings.length === 0 ? (
              <div className="p-6 text-center text-[13px] text-(--muted)">Sin posiciones cargadas este mes.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-(--muted)">
                      <th className="text-left">Activo</th>
                      <th className="text-right">Valor</th>
                      <th className="text-right">Retorno desde compra</th>
                      <th className="text-right">YTD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((h) => (
                      <tr key={h.nombre} className="border-t border-(--line)">
                        <td className="py-2 text-(--paper)">{h.nombre}</td>
                        <td className="text-right font-mono text-(--paper-dim)">{fmtCurrency(h.valor, snap.moneda)}</td>
                        <td className="text-right font-mono text-(--paper-dim)">{fmtPct(h.retornoPct)}</td>
                        <td className="text-right font-mono text-(--paper-dim)">{fmtPct(h.ytd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {(snap.highlights?.length || snap.movimientos?.length) ? (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {!!snap.highlights?.length && (
                <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
                  <h3 className="mb-2 font-heading text-base font-semibold text-(--paper)">Highlights</h3>
                  <ul className="list-disc pl-5 text-[12.5px] text-(--paper-dim)">
                    {snap.highlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}
              {!!snap.movimientos?.length && (
                <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
                  <h3 className="mb-2 font-heading text-base font-semibold text-(--paper)">Movimientos</h3>
                  <ul className="list-disc pl-5 text-[12.5px] text-(--paper-dim)">
                    {snap.movimientos.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </>
      ) : null}

      <div className="mt-4">
        <SnapshotForm
          clientId={clientId}
          accountId={accountId}
          months={months}
          selectedMonth={selectedMonth}
          existing={snap}
        />
      </div>
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
