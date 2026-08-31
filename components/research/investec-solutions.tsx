"use client";

import { useState } from "react";
import { investecBuildManagerOverlap, investecPortfolioMetricsFull, matchInvestecFundPerf } from "@/lib/finance";
import type { FundRow } from "@/lib/finance/types";
import type { InvestecClassRow, InvestecDataBlob, InvestecSolution } from "@/lib/queries/investec";
import { fmtDate, fmtPct, pctClass } from "@/lib/format";

type ModalKind = "composicion" | "performance" | "clases" | "yd" | "evolucion" | "overlap" | "top10" | "regional";

export function InvestecSolutions({
  solutions,
  classes,
  investecData,
  fondosDb,
}: {
  solutions: InvestecSolution[];
  classes: InvestecClassRow[];
  investecData: InvestecDataBlob | null;
  fondosDb: FundRow[];
}) {
  const [modal, setModal] = useState<{ kind: ModalKind; solId?: string } | null>(null);

  if (!investecData) {
    return <div className="rounded-[10px] border border-(--line) bg-(--panel) p-8 text-center text-[13px] text-(--muted)">Sin datos de Investec cargados.</div>;
  }

  return (
    <div>
      <div className="mb-4 rounded-[10px] border border-(--line) bg-(--panel) p-5">
        <h3 className="mb-1 font-heading text-base font-semibold text-(--paper)">Soluciones Investec — One Stop Solution</h3>
        <p className="mb-3 text-[12.5px] text-(--muted)">
          Datos al {fmtDate(new Date().toISOString())} · comparativas cruzadas entre las 5 soluciones.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="secondary px-3 py-1.5 text-[12px]" onClick={() => setModal({ kind: "overlap" })}>
            Overlap de gestores
          </button>
          <button type="button" className="secondary px-3 py-1.5 text-[12px]" onClick={() => setModal({ kind: "top10" })}>
            Top 10 posiciones
          </button>
          <button type="button" className="secondary px-3 py-1.5 text-[12px]" onClick={() => setModal({ kind: "regional" })}>
            Exposición regional
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {solutions.map((s) => {
          const rows = (investecData.fundAllocation[s.allocKey ?? ""] ?? []).slice().sort((a, b) => b.peso - a.peso).slice(0, 4);
          return (
            <div key={s.id} className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
              <div className="mb-1 flex items-center justify-between">
                <h4 className="m-0 font-heading text-[14px] font-semibold text-(--paper)">{s.name}</h4>
                {s.badge && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "var(--brass)", color: "var(--ink)" }}>{s.badge}</span>}
              </div>
              <div className="mb-2 text-[11px] text-(--muted)">
                {s.risk} · Equity {s.equityRange}
              </div>
              <table className="mb-3 w-full text-[11.5px]">
                <tbody>
                  {rows.map((r, i) => {
                    const fund = matchInvestecFundPerf(r.fondo, fondosDb);
                    return (
                      <tr key={i} className="border-t border-(--line)">
                        <td className="py-1 text-(--paper-dim)">{r.fondo}</td>
                        <td className="text-right font-mono text-(--muted)">{r.peso.toFixed(1)}%</td>
                        <td className="text-right font-mono" style={{ color: fund && pctClass(fund.ytd) === "pos" ? "var(--teal)" : "var(--brick)" }}>
                          {fund ? fmtPct(fund.ytd) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex flex-wrap gap-1.5">
                {(["composicion", "performance", "clases", "yd", "evolucion"] as const).map((kind) => (
                  <button key={kind} type="button" className="secondary px-2.5 py-1 text-[11px]" onClick={() => setModal({ kind, solId: s.id })}>
                    {{ composicion: "Composición", performance: "Performance", clases: "Clases", yd: "Yield & Duration", evolucion: "Evolución" }[kind]}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <InvestecModal
          modal={modal}
          onClose={() => setModal(null)}
          solutions={solutions}
          classes={classes}
          investecData={investecData}
          fondosDb={fondosDb}
        />
      )}
    </div>
  );
}

function InvestecModal({
  modal,
  onClose,
  solutions,
  classes,
  investecData,
  fondosDb,
}: {
  modal: { kind: ModalKind; solId?: string };
  onClose: () => void;
  solutions: InvestecSolution[];
  classes: InvestecClassRow[];
  investecData: InvestecDataBlob;
  fondosDb: FundRow[];
}) {
  const sol = solutions.find((s) => s.id === modal.solId);

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center p-5" style={{ background: "rgba(19,31,56,0.65)" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-[10px] p-5.5" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="m-0 font-heading text-base font-semibold text-(--paper)">
            {sol ? sol.name : "Todas las soluciones"} — {modalTitle(modal.kind)}
          </h3>
          <button type="button" className="secondary px-2.5 py-1 text-[11px]" onClick={onClose}>
            Cerrar
          </button>
        </div>

        {modal.kind === "composicion" && sol && (
          <SimpleTable
            headers={["Fondo", "Clase", "Estilo", "Peso", "Var. mensual", "Var. YTD"]}
            rows={(investecData.fundAllocation[sol.allocKey ?? ""] ?? [])
              .slice()
              .sort((a, b) => b.peso - a.peso)
              .map((r) => [r.fondo, r.clase ?? "—", r.estilo ?? "—", r.peso.toFixed(2) + "%", varLabel(r.varMensual), varLabel(r.varYTD)])}
          />
        )}

        {modal.kind === "performance" && sol && (
          <PerformanceModal sol={sol} investecData={investecData} fondosDb={fondosDb} />
        )}

        {modal.kind === "clases" && sol && (
          <SimpleTable
            headers={["Clase", "ISIN Acc.", "ISIN Dist.", "Fee gestión (bps)", "TER %", "All-in %"]}
            rows={classes
              .filter((c) => c.solutionId === sol.id)
              .map((c) => [c.className, c.isinAcc ?? "—", c.isinDist ?? "—", c.managementFeeBps?.toFixed(2) ?? "—", c.terPct?.toFixed(2) ?? "—", c.allInPct?.toFixed(2) ?? "—"])}
          />
        )}

        {modal.kind === "yd" && sol && (() => {
          const yd = investecData.yd[sol.ydKey ?? ""];
          if (!yd) return <div className="text-[13px] text-(--muted)">Sin datos de yield & duration.</div>;
          return (
            <>
              <div className="mb-3 flex gap-4">
                <Kpi label="Yield" value={yd.yield.toFixed(2) + "%"} />
                <Kpi label="Duration" value={yd.duration.toFixed(2) + " años"} />
              </div>
              <SimpleTable headers={["Fondo", "Peso", "Yield", "Duration"]} rows={yd.funds.slice().sort((a, b) => b.peso - a.peso).map((f) => [f.fondo, f.peso.toFixed(1) + "%", f.yield.toFixed(2) + "%", f.duration.toFixed(2)])} />
            </>
          );
        })()}

        {modal.kind === "evolucion" && sol && (() => {
          const rows = investecData.aaTiempo[sol.evoKey ?? ""] ?? [];
          if (!rows.length) return <div className="text-[13px] text-(--muted)">Sin datos de evolución.</div>;
          const cats = Object.keys(rows[0]).filter((k) => k !== "fecha");
          return <SimpleTable headers={["Fecha", ...cats]} rows={rows.map((r) => [String(r.fecha), ...cats.map((c) => (r[c] != null ? Number(r[c]).toFixed(1) + "%" : "—"))])} />;
        })()}

        {modal.kind === "overlap" && (
          <SimpleTable
            headers={["Gestora", "# Soluciones", "Peso total"]}
            rows={investecBuildManagerOverlap(
              solutions.map((s) => ({ id: s.id, allocKey: s.allocKey ?? "" })),
              investecData.fundAllocation,
              investecData.fundInfo,
            ).map((m) => [m.manager, String(m.nSolutions), m.total.toFixed(1) + "%"])}
          />
        )}

        {modal.kind === "top10" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-1.5 text-[12.5px] font-semibold text-(--paper)">Renta Fija</h4>
              <ol className="list-decimal pl-5 text-[12.5px] text-(--paper-dim)">
                {investecData.top10.fixedIncome.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ol>
            </div>
            <div>
              <h4 className="mb-1.5 text-[12.5px] font-semibold text-(--paper)">Renta Variable</h4>
              <ol className="list-decimal pl-5 text-[12.5px] text-(--paper-dim)">
                {investecData.top10.equity.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {modal.kind === "regional" && <RegionalModal investecData={investecData} />}
      </div>
    </div>
  );
}

function PerformanceModal({ sol, investecData, fondosDb }: { sol: InvestecSolution; investecData: InvestecDataBlob; fondosDb: FundRow[] }) {
  const rows = investecData.fundAllocation[sol.allocKey ?? ""] ?? [];
  const metrics = investecPortfolioMetricsFull(rows, fondosDb);
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-3">
        {(["ytd", "y1", "y3", "y5"] as const).map((p) => (
          <Kpi key={p} label={p.toUpperCase()} value={fmtPct(metrics[p])} cls={pctClass(metrics[p])} />
        ))}
      </div>
      <p className="mb-2 text-[11px] text-(--muted)">Retorno ponderado por peso, buscando cada fondo en la watchlist AIVA. No hay dato de 2 años en la base.</p>
      <SimpleTable
        headers={["Fondo", "Peso", "YTD", "1a", "3a", "5a"]}
        rows={rows
          .slice()
          .sort((a, b) => b.peso - a.peso)
          .map((r) => {
            const f = matchInvestecFundPerf(r.fondo, fondosDb);
            return [r.fondo, r.peso.toFixed(1) + "%", f ? fmtPct(f.ytd) : "—", f ? fmtPct(f.y1) : "—", f ? fmtPct(f.y3) : "—", f ? fmtPct(f.y5) : "—"];
          })}
      />
    </>
  );
}

function RegionalModal({ investecData }: { investecData: InvestecDataBlob }) {
  const [tab, setTab] = useState<"equity" | "bond" | "currency">("equity");
  const source = tab === "equity" ? investecData.regional.equityRegions : tab === "bond" ? investecData.regional.bondRegions : investecData.regional.currencies;
  const solutionNames = Object.keys(source);
  const rowKeys = Array.from(new Set(solutionNames.flatMap((s) => Object.keys(source[s] ?? {}))));

  return (
    <div>
      <div className="mb-3 flex gap-1.5">
        {(["equity", "bond", "currency"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className="rounded-full px-3 py-1 text-[11.5px]" style={{ background: tab === t ? "transparent" : "var(--panel-2)", border: `1px solid ${tab === t ? "var(--brass)" : "var(--line)"}`, color: tab === t ? "var(--brass)" : "var(--paper-dim)" }}>
            {t === "equity" ? "Acciones" : t === "bond" ? "Bonos" : "Monedas"}
          </button>
        ))}
      </div>
      <SimpleTable
        headers={["Región/Moneda", ...solutionNames]}
        rows={rowKeys.map((k) => [k, ...solutionNames.map((s) => (source[s]?.[k] != null ? source[s][k].toFixed(1) + "%" : "—"))])}
      />
    </div>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-(--muted)">
            {headers.map((h, i) => (
              <th key={i} className={i === 0 ? "text-left" : "text-right"}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-(--line)">
              {r.map((c, j) => (
                <td key={j} className={`py-1.5 ${j === 0 ? "text-(--paper)" : "text-right font-mono text-(--paper-dim)"}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div className="p-6 text-center text-[13px] text-(--muted)">Sin datos.</div>}
    </div>
  );
}

function Kpi({ label, value, cls }: { label: string; value: string; cls?: string }) {
  const color = cls === "pos" ? "var(--teal)" : cls === "neg" ? "var(--brick)" : "var(--paper)";
  return (
    <div className="rounded-[10px] border border-(--line) bg-(--panel-2) px-3.5 py-3">
      <div className="mb-1 text-[10.5px] tracking-[0.6px] text-(--muted) uppercase">{label}</div>
      <div className="font-mono text-base font-semibold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function varLabel(v: number | string | null | undefined): string {
  if (v === "Nuevo") return "Nuevo";
  if (v == null) return "—";
  const n = Number(v);
  return isNaN(n) ? "—" : (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}

function modalTitle(kind: ModalKind): string {
  return {
    composicion: "Composición",
    performance: "Performance",
    clases: "Clases",
    yd: "Yield & Duration",
    evolucion: "Evolución",
    overlap: "Overlap de gestores",
    top10: "Top 10 posiciones",
    regional: "Exposición regional",
  }[kind];
}
