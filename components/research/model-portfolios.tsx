"use client";

import { AllocationDoughnut } from "@/components/charts/allocation-doughnut";
import { fmtPct, pctClass } from "@/lib/format";
import type { ModelPortfolio, PeriodMetrics } from "@/lib/finance";

export interface ModelPortfolioView {
  portfolio: ModelPortfolio;
  metrics: PeriodMetrics;
  sectionWeights: Record<string, number>;
}

export function ModelPortfolios({ views }: { views: ModelPortfolioView[] }) {
  return (
    <div className="flex flex-col gap-4">
      {views.map(({ portfolio, metrics, sectionWeights }) => (
        <div key={portfolio.key} className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
          <h3 className="mb-3 font-heading text-base font-semibold text-(--paper)">{portfolio.label}</h3>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {(["ytd", "y1", "y3", "y5"] as const).map((p) => (
              <div key={p} className="rounded-[10px] border border-(--line) bg-(--panel-2) px-3.5 py-3">
                <div className="mb-1 text-[10.5px] tracking-[0.6px] text-(--muted) uppercase">
                  {p === "ytd" ? "YTD" : p === "y1" ? "1 año" : p === "y3" ? "3 años" : "5 años"}
                </div>
                <div className="font-mono text-base font-semibold" style={{ color: pctClass(metrics[p]) === "pos" ? "var(--teal)" : pctClass(metrics[p]) === "neg" ? "var(--brick)" : "var(--paper)" }}>
                  {fmtPct(metrics[p])}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1.3fr]">
            <div>
              <h4 className="mb-2 text-[12.5px] font-semibold text-(--paper)">Asignación por sección</h4>
              <AllocationDoughnut totals={sectionWeights} />
            </div>
            <div>
              <h4 className="mb-2 text-[12.5px] font-semibold text-(--paper)">Composición</h4>
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="text-(--muted)">
                    <th className="text-left">Fondo</th>
                    <th className="text-left">Sección</th>
                    <th className="text-right">Peso</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.holdings
                    .slice()
                    .sort((a, b) => b.weight - a.weight)
                    .map((h, i) => (
                      <tr key={i} className="border-t border-(--line)">
                        <td className="py-1.5 text-(--paper)">{h.name}</td>
                        <td className="text-(--muted)">{h.section}</td>
                        <td className="text-right font-mono text-(--paper-dim)">{h.weight.toFixed(1)}%</td>
                      </tr>
                    ))}
                  <tr className="border-t border-(--line)">
                    <td className="py-1.5 text-(--paper)">Efectivo</td>
                    <td className="text-(--muted)">Efectivo</td>
                    <td className="text-right font-mono text-(--paper-dim)">{portfolio.cash.toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
