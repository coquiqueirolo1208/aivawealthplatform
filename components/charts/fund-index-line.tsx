"use client";

import "@/lib/chart-setup";
import { Line } from "react-chartjs-2";

export function FundIndexLine({ labels, points }: { labels: string[]; points: number[] }) {
  return (
    <div className="relative h-[220px]">
      <Line
        data={{
          labels,
          datasets: [
            {
              label: "Índice (base 100)",
              data: points,
              borderColor: "#28466F",
              backgroundColor: "#28466F33",
              borderWidth: 2,
              tension: 0.2,
              pointRadius: 2,
            },
          ],
        }}
        options={{ plugins: { legend: { display: false } }, maintainAspectRatio: false }}
      />
    </div>
  );
}
