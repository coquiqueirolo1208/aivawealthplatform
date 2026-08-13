"use client";

import "@/lib/chart-setup";
import { Doughnut } from "react-chartjs-2";
import { ASSET_COLORS, type AssetType } from "@/lib/constants";

export function AllocationDoughnut({ totals }: { totals: Partial<Record<AssetType | string, number>> }) {
  const labels = Object.keys(totals).filter((k) => (totals[k] ?? 0) > 0);
  if (!labels.length) return <div className="empty p-10 text-center text-[13.5px] text-(--muted)">Sin datos.</div>;
  return (
    <div className="relative h-[220px]">
      <Doughnut
        data={{
          labels,
          datasets: [
            {
              data: labels.map((l) => totals[l] ?? 0),
              backgroundColor: labels.map((l) => ASSET_COLORS[l as AssetType] ?? "#4a5b7c"),
              borderWidth: 2,
            },
          ],
        }}
        options={{
          plugins: { legend: { position: "bottom", labels: { boxWidth: 10 } } },
          cutout: "58%",
          maintainAspectRatio: false,
        }}
      />
    </div>
  );
}
