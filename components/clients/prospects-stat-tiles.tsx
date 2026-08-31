"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtUSD } from "@/lib/format";
import type { Prospect } from "@/lib/queries/prospects";
import { ProspectStageModal } from "./prospects-kanban";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

type FilterKey = "todos" | "nuevos30d" | "nuevos1y" | "aum";

const FILTER_LABELS: Record<FilterKey, string> = {
  todos: "Todos los prospectos",
  nuevos30d: "Nuevos — últimos 30 días",
  nuevos1y: "Nuevos — último año",
  aum: "AUM potencial total",
};

/** The 4 stat tiles on the Prospectos page, each clickable to drill into the prospects behind the number. */
export function ProspectsStatTiles({ prospects, nowMs }: { prospects: Prospect[]; nowMs: number }) {
  const router = useRouter();
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);

  const nuevos30d = prospects.filter((p) => nowMs - new Date(p.createdAt).getTime() <= THIRTY_DAYS_MS);
  const nuevos1y = prospects.filter((p) => nowMs - new Date(p.createdAt).getTime() <= ONE_YEAR_MS);
  const aumPotencialTotal = prospects.reduce((s, p) => s + (p.aumEstimado ?? 0), 0);

  const listByFilter: Record<FilterKey, Prospect[]> = {
    todos: prospects,
    nuevos30d,
    nuevos1y,
    aum: [...prospects].sort((a, b) => (b.aumEstimado ?? 0) - (a.aumEstimado ?? 0)),
  };

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Prospectos totales" value={String(prospects.length)} onClick={() => setOpenFilter("todos")} />
        <StatTile label="Nuevos últimos 30 días" value={String(nuevos30d.length)} onClick={() => setOpenFilter("nuevos30d")} />
        <StatTile label="Nuevos último año" value={String(nuevos1y.length)} onClick={() => setOpenFilter("nuevos1y")} />
        <StatTile label="AUM potencial total" value={fmtUSD(aumPotencialTotal)} onClick={() => setOpenFilter("aum")} />
      </div>

      {openFilter && (
        <ProspectStageModal
          stageId=""
          stageLabel={FILTER_LABELS[openFilter]}
          prospects={listByFilter[openFilter]}
          onClose={() => setOpenFilter(null)}
          onConverted={(clientId) => router.push(`/clientes/${clientId}`)}
          nowMs={nowMs}
        />
      )}
    </>
  );
}

function StatTile({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="row-hover rounded-[10px] border border-(--line) bg-(--panel) p-4 text-left">
      <div className="text-[11px] font-semibold tracking-[0.04em] text-(--muted) uppercase">{label}</div>
      <div className="mt-1.5 font-mono text-[20px] font-semibold text-(--paper)">{value}</div>
    </button>
  );
}
