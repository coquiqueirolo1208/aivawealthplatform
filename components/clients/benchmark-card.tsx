"use client";

import { useState } from "react";
import { computeBenchmarkReturns, DEFAULT_MSCI_WEIGHT_PCT, type BenchmarkLevel } from "@/lib/finance/benchmark";
import { fmtPct, pctClass } from "@/lib/format";
import { saveBenchmarkLevel, deleteBenchmarkLevel, saveClientBenchmarkWeight, deleteClientBenchmarkWeight } from "@/lib/actions/benchmark";

export function BenchmarkCard({
  clientId,
  portfolioMTD,
  portfolioYTD,
  benchmarkLevels,
  weightsByMonth,
}: {
  clientId: string;
  portfolioMTD: number | null;
  portfolioYTD: number | null;
  benchmarkLevels: Record<string, BenchmarkLevel>;
  weightsByMonth: Record<string, number>;
}) {
  const [showLevels, setShowLevels] = useState(false);
  const [showWeights, setShowWeights] = useState(false);
  const [msciInput, setMsciInput] = useState("");

  const bench = computeBenchmarkReturns(benchmarkLevels, weightsByMonth);
  const levelMonths = Object.keys(benchmarkLevels).sort();
  const weightMonths = Object.keys(weightsByMonth).sort();
  const latestWeightPct = weightMonths.length ? weightsByMonth[weightMonths[weightMonths.length - 1]] : DEFAULT_MSCI_WEIGHT_PCT;

  const msciPreview = msciInput === "" ? null : Math.min(100, Math.max(0, Math.round(Number(msciInput) || 0)));

  return (
    <div className="mt-4 rounded-[10px] border border-(--line) bg-(--panel) p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-base font-semibold text-(--paper)">
          Benchmark{" "}
          <span className="text-[11px] font-normal text-(--muted)">
            {latestWeightPct}% MSCI World / {100 - latestWeightPct}% Bloomberg Global Agg
            {weightMonths.length > 0 && ` (vigente desde ${weightMonths[weightMonths.length - 1]})`}
          </span>
        </h3>
        <div className="flex gap-1.5">
          <button type="button" className="secondary px-2.5 py-1 text-[11px]" onClick={() => setShowWeights((s) => !s)}>
            {showWeights ? "Cerrar" : "Ajustar mezcla"}
          </button>
          <button type="button" className="secondary px-2.5 py-1 text-[11px]" onClick={() => setShowLevels((s) => !s)}>
            {showLevels ? "Cerrar" : "Cargar niveles"}
          </button>
        </div>
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
              <td className="py-2 text-(--paper)">Benchmark</td>
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

      {showWeights && (
        <div className="mt-4 border-t border-(--line) pt-3.5">
          <p className="mb-2 text-[11px] text-(--muted)">
            El % de MSCI World que cargues rige desde ese mes en adelante (hasta el próximo cambio) — el YTD combina
            el mix vigente en cada mes en vez de aplicar el actual a todo el año.
          </p>
          {weightMonths.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {weightMonths.map((m) => (
                <span
                  key={m}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px]"
                  style={{ background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--paper-dim)" }}
                >
                  {m}: {weightsByMonth[m]}% MSCI / {100 - weightsByMonth[m]}% Agg
                  <button
                    type="button"
                    className="bg-transparent p-0 text-(--brick)"
                    onClick={() => deleteClientBenchmarkWeight(clientId, m)}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
          <form
            action={async (fd) => {
              await saveClientBenchmarkWeight(clientId, fd);
              setMsciInput("");
            }}
            className="flex flex-wrap items-end gap-2"
          >
            <label className="block">
              <span className="mb-1 block text-[11px] text-(--muted)">Vigente desde</span>
              <input type="month" name="month" required />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-(--muted)">% MSCI World</span>
              <input
                type="number"
                name="msciPct"
                min={0}
                max={100}
                value={msciInput}
                onChange={(e) => setMsciInput(e.target.value)}
                required
                className="w-20"
              />
            </label>
            <div className="pb-2 text-[11px] text-(--muted)">
              % Bloomberg Agg:{" "}
              <span className="font-mono text-(--paper)">{msciPreview == null ? "—" : `${100 - msciPreview}%`}</span>
            </div>
            <button type="submit">Guardar</button>
          </form>
        </div>
      )}

      {showLevels && (
        <div className="mt-4 border-t border-(--line) pt-3.5">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {levelMonths.map((m) => (
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
