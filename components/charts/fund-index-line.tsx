"use client";

import "@/lib/chart-setup";
import { Line } from "react-chartjs-2";
import { useChartTheme, chartChrome } from "@/lib/chart-theme";

export function FundIndexLine({ labels, points }: { labels: string[]; points: number[] }) {
  const theme = useChartTheme();
  const chrome = chartChrome(theme);
  return (
    <div className="relative h-[220px]">
      <Line
        data={{
          labels,
          datasets: [
            {
              label: "Índice (base 100)",
              data: points,
              borderColor: theme.accent,
              backgroundColor: theme.accent + "33",
              borderWidth: 2,
              tension: 0.2,
              pointRadius: 2,
            },
          ],
        }}
        options={{
          plugins: { legend: { display: false }, tooltip: chrome.tooltip },
          scales: {
            x: { grid: chrome.scaleGrid, ticks: chrome.scaleTicks },
            y: { grid: chrome.scaleGrid, ticks: chrome.scaleTicks },
          },
          maintainAspectRatio: false,
        }}
      />
    </div>
  );
}
