"use client";

import { useState } from "react";
import { computeBenchmarkReturns, type BenchmarkLevel } from "@/lib/finance/benchmark";
import { fmtPct, pctClass } from "@/lib/format";
import { saveBenchmarkLevel, deleteBenchmarkLevel } from "@/lib/actions/benchmark";

export function BenchmarkCard({
  portfolioMTD,
  portfolioYTD,
  benchmarkLevels,
}: {
  portfolioMTD: number | null;
  portfolioYTD: number | null;
  benchmarkLevels: Record<string, BenchmarkLevel>;
}) {
  const [showForm, setShowForm] = useState(false);
  const bench = computeBenchmarkReturns(benchmarkLevels);
  const months = Object.keys(benchmarkLevels).sort();

  return (
    <div className="mt-4 rounded-[10px] border border-(--line) bg-(--panel) p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-base font-semibold text-(--paper)">
          Benchmark <span className="text-[11px] font-normal text-(--muted)">70% MSCI World / 30% Bloomberg Global Agg</span>
        </h3>
        <button type="button" className="secondary px-2.5 py-1 text-[11px]" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cerrar" : "Cargar niveles"}
        </button>
      </div>

      {!bench ? (
        <div className="mt-3 p-4 text-center text-[13px] text-(--muted)">
          Todavía no hay niveles de índice cargados — cargá al menos dos meses (MSCI World y Bloomberg Agg) para
          comparar.
        </div>
      ) : (
        <table className="mt-3 w-full text-[13px]">
          <thead>
            <tr className="text-(--muted)">
              <th className="text-left"></th>
              <th className="text-right">MTD</th>
              <th className="text-right">YTD</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-(--line)">
              <td className="py-2 text-(--paper)">Tu cartera</td>
              <td className="text-right font-mono" style={{ color: pctClass(portfolioMTD) === "pos" ? "var(--teal)" : "var(--brick)" }}>
                {fmtPct(portfolioMTD)}
              </td>
              <td className="text-right font-mono" style={{ color: pctClass(portfolioYTD) === "pos" ? "var(--teal)" : "var(--brick)" }}>
                {fmtPct(portfolioYTD)}
              </td>
            </tr>
            <tr className="border-t border-(--line)">
              <td className="py-2 text-(--paper)">Benchmark 70/30</td>
              <td className="text-right font-mono text-(--paper-dim)">{fmtPct(bench.blendMTD)}</td>
              <td className="text-right font-mono text-(--paper-dim)">{fmtPct(bench.blendYTD)}</td>
            </tr>
            <tr className="border-t border-(--line)">
              <td className="py-2 text-(--paper)">Diferencia</td>
              <td className="text-right font-mono text-(--paper-dim)">
                {portfolioMTD != null && bench.blendMTD != null ? fmtPct(portfolioMTD - bench.blendMTD) : "—"}
              </td>
              <td className="text-right font-mono text-(--paper-dim)">
                {portfolioYTD != null && bench.blendYTD != null ? fmtPct(portfolioYTD - bench.blendYTD) : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {showForm && (
        <div className="mt-4 border-t border-(--line) pt-3.5">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {months.map((m) => (
              <span
                key={m}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px]"
                style={{ background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--paper-dim)" }}
              >
                {m}: MSCI {benchmarkLevels[m].msci ?? "—"} / Agg {benchmarkLevels[m].agg ?? "—"}
                <button type="button" className="bg-transparent p-0 text-(--brick)" onClick={() => deleteBenchmarkLevel(m)}>
                  ✕
                </button>
              </span>
            ))}
          </div>
          <form action={saveBenchmarkLevel} className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="mb-1 block text-[11px] text-(--muted)">Mes</span>
              <input type="month" name="month" required />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-(--muted)">Nivel MSCI World</span>
              <input type="number" step="any" name="msci" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-(--muted)">Nivel Bloomberg Agg</span>
              <input type="number" step="any" name="agg" />
            </label>
            <button type="submit">Guardar</button>
          </form>
        </div>
      )}
    </div>
  );
}
