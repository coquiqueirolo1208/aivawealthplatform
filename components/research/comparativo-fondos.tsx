"use client";

import { useMemo, useState } from "react";
import "@/lib/chart-setup";
import { Line, Bar, Scatter } from "react-chartjs-2";
import { computeFundRisk } from "@/lib/finance";
import type { FundRow } from "@/lib/finance/types";
import { fmtPct } from "@/lib/format";
import { useChartTheme, chartChrome } from "@/lib/chart-theme";

const COMPARE_COLORS = ["#28466F", "#1F8F6B", "#B15A48", "#6B5C99"];
const YEAR_LABELS = ["2020", "2021", "2022", "2023", "2024", "2025"] as const;
const YEAR_KEYS = ["y2021", "y2022", "y2023", "y2024", "y2025"] as const;

function indexPoints(f: FundRow): Array<number | null> {
  let idx = 100;
  const points: Array<number | null> = [100];
  YEAR_KEYS.forEach((k) => {
    const v = f[k];
    if (v == null || isNaN(Number(v))) {
      points.push(null);
      return;
    }
    idx = idx * (1 + Number(v) / 100);
    points.push(idx);
  });
  return points;
}

export function ComparativoFondos({ funds }: { funds: FundRow[] }) {
  const theme = useChartTheme();
  const chrome = chartChrome(theme);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const candidates = useMemo(() => {
    const s = search.trim().toUpperCase();
    if (!s) return [];
    return funds.filter((f) => !selected.includes(f.isin) && (f.name.toUpperCase().includes(s) || f.isin.toUpperCase().includes(s))).slice(0, 8);
  }, [funds, search, selected]);

  const selectedFunds = selected.map((isin) => funds.find((f) => f.isin === isin)).filter(Boolean) as FundRow[];

  return (
    <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
      <h3 className="mb-3 font-heading text-base font-semibold text-(--paper)">
        Comparativo de Fondos <span className="text-[11px] font-normal text-(--muted)">hasta 4 fondos</span>
      </h3>
      {selected.length < 4 && (
        <div className="relative mb-3.5">
          <input type="text" placeholder="Buscar fondo para agregar…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full" />
          {candidates.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
              {candidates.map((f) => (
                <div
                  key={f.isin}
                  className="cursor-pointer px-3 py-2 text-[12.5px] text-(--paper) hover:bg-(--panel-2)"
                  onClick={() => {
                    setSelected((s) => [...s, f.isin]);
                    setSearch("");
                  }}
                >
                  {f.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1.5">
        {selectedFunds.map((f, i) => (
          <span key={f.isin} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px]" style={{ background: "var(--panel-2)", border: `1px solid ${COMPARE_COLORS[i]}`, color: COMPARE_COLORS[i] }}>
            {f.name}
            <button type="button" className="bg-transparent p-0 text-(--muted)" onClick={() => setSelected((s) => s.filter((x) => x !== f.isin))}>
              ✕
            </button>
          </span>
        ))}
      </div>

      {selectedFunds.length === 0 ? (
        <div className="p-8 text-center text-[13px] text-(--muted)">Buscá y agregá al menos 2 fondos para comparar.</div>
      ) : (
        <>
          <div className="mb-5 overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-(--muted)">
                  <th className="text-left">Fondo</th>
                  <th className="text-right">YTD</th>
                  <th className="text-right">1a</th>
                  <th className="text-right">3a</th>
                  <th className="text-right">5a</th>
                  <th className="text-right">Riesgo</th>
                </tr>
              </thead>
              <tbody>
                {selectedFunds.map((f) => (
                  <tr key={f.isin} className="border-t border-(--line)">
                    <td className="py-1.5 text-(--paper)">{f.name}</td>
                    <td className="text-right font-mono text-(--paper-dim)">{fmtPct(f.ytd)}</td>
                    <td className="text-right font-mono text-(--paper-dim)">{fmtPct(f.y1)}</td>
                    <td className="text-right font-mono text-(--paper-dim)">{fmtPct(f.y3)}</td>
                    <td className="text-right font-mono text-(--paper-dim)">{fmtPct(f.y5)}</td>
                    <td className="text-right font-mono text-(--paper-dim)">
                      {(() => {
                        const r = computeFundRisk(f);
                        return r != null ? r.toFixed(2) + "%" : "—";
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedFunds.length >= 2 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <h4 className="mb-2 text-[12.5px] font-semibold text-(--paper)">Evolución (índice base 100)</h4>
                <div className="relative h-[220px]">
                  <Line
                    data={{
                      labels: [...YEAR_LABELS],
                      datasets: selectedFunds.map((f, i) => ({
                        label: f.name,
                        data: indexPoints(f),
                        borderColor: COMPARE_COLORS[i],
                        backgroundColor: COMPARE_COLORS[i] + "33",
                        spanGaps: true,
                        tension: 0.2,
                      })),
                    }}
                    options={{
                      plugins: { legend: { display: false }, tooltip: chrome.tooltip },
                      scales: { x: { grid: chrome.scaleGrid, ticks: chrome.scaleTicks }, y: { grid: chrome.scaleGrid, ticks: chrome.scaleTicks } },
                      maintainAspectRatio: false,
                    }}
                  />
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-[12.5px] font-semibold text-(--paper)">Comparación YTD</h4>
                <div className="relative h-[220px]">
                  <Bar
                    data={{
                      labels: selectedFunds.map((f) => f.name),
                      datasets: [{ data: selectedFunds.map((f) => f.ytd ?? 0), backgroundColor: COMPARE_COLORS }],
                    }}
                    options={{
                      plugins: { legend: { display: false }, tooltip: chrome.tooltip },
                      scales: { x: { grid: chrome.scaleGrid, ticks: chrome.scaleTicks }, y: { grid: chrome.scaleGrid, ticks: chrome.scaleTicks } },
                      maintainAspectRatio: false,
                    }}
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <h4 className="mb-2 text-[12.5px] font-semibold text-(--paper)">Riesgo (desvío anual) vs. Retorno YTD</h4>
                <div className="relative h-[220px]">
                  <Scatter
                    data={{
                      datasets: selectedFunds.map((f, i) => ({
                        label: f.name,
                        data: [{ x: computeFundRisk(f) ?? 0, y: f.ytd ?? 0 }],
                        backgroundColor: COMPARE_COLORS[i],
                        pointRadius: 6,
                      })),
                    }}
                    options={{
                      maintainAspectRatio: false,
                      plugins: { legend: { position: "bottom", labels: chrome.legendLabels }, tooltip: chrome.tooltip },
                      scales: { x: { grid: chrome.scaleGrid, ticks: chrome.scaleTicks }, y: { grid: chrome.scaleGrid, ticks: chrome.scaleTicks } },
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
