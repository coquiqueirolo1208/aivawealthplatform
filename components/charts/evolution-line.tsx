"use client";

import "@/lib/chart-setup";
import { Line } from "react-chartjs-2";
import { useChartTheme, chartChrome } from "@/lib/chart-theme";

export interface EvolutionSeries {
  label: string;
  color: string;
  bold?: boolean;
  points: Array<{ x: string; y: number | null }>;
}

function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  const names = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return names[parseInt(mo, 10) - 1] + " " + y;
}

export function EvolutionLine({ series }: { series: EvolutionSeries[] }) {
  const theme = useChartTheme();
  const chrome = chartChrome(theme);
  const allMonths = Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.x)))).sort();
  if (!allMonths.length) return <div className="empty p-10 text-center text-[13.5px] text-(--muted)">Sin datos.</div>;
  return (
    <div className="relative h-[220px]">
      <Line
        data={{
          labels: allMonths.map(monthLabel),
          datasets: series.map((s) => ({
            label: s.label,
            data: allMonths.map((m) => s.points.find((p) => p.x === m)?.y ?? null),
            borderColor: s.color,
            backgroundColor: s.color + "33",
            borderWidth: s.bold ? 3 : 1.5,
            borderDash: s.bold ? [] : [5, 3],
            tension: 0.3,
            spanGaps: true,
            pointRadius: s.bold ? 4 : 2.5,
          })),
        }}
        options={{
          plugins: {
            legend: { display: series.length > 1, position: "bottom", labels: chrome.legendLabels },
            tooltip: chrome.tooltip,
          },
          scales: {
            x: { grid: chrome.scaleGrid, ticks: chrome.scaleTicks },
            y: { grid: chrome.scaleGrid, ticks: { ...chrome.scaleTicks, callback: (v) => "$" + (Number(v) / 1000).toFixed(0) + "k" } },
          },
          maintainAspectRatio: false,
        }}
      />
    </div>
  );
}
