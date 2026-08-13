"use client";

import { useState } from "react";
import { publishDailyReport } from "@/lib/actions/daily-reports";
import type { DailyReport } from "@/lib/queries/daily-reports";

function fmtReportDate(ymd: string) {
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${months[m - 1]} ${y}`;
}

export function DailyReports({ reports }: { reports: DailyReport[] }) {
  const [viewingId, setViewingId] = useState(reports[0]?.id ?? null);
  const [showForm, setShowForm] = useState(reports.length === 0);
  const viewing = reports.find((r) => r.id === viewingId) ?? reports[0] ?? null;

  return (
    <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="m-0 font-heading text-base font-semibold text-(--paper)">Informe Diario</h3>
        <button type="button" className="secondary px-2.5 py-1.5 text-[12px]" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cerrar" : "+ Publicar informe"}
        </button>
      </div>

      {showForm && (
        <form
          action={async (fd) => {
            await publishDailyReport(fd);
            setShowForm(false);
          }}
          className="mb-4 flex flex-col gap-2 rounded-lg p-3.5"
          style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}
        >
          <div className="flex flex-wrap gap-2">
            <input type="date" name="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            <input type="text" name="title" placeholder="Título (opcional)" className="flex-1" />
          </div>
          <input type="file" name="file" accept="application/pdf" />
          <textarea name="content" placeholder="O pegá el texto del informe acá…" rows={4} />
          <button type="submit">Publicar</button>
        </form>
      )}

      {!viewing ? (
        <div className="p-8 text-center text-[13px] text-(--muted)">Todavía no se publicó ningún informe.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_200px]">
          <div>
            <h4 className="mb-2 text-[13px] font-semibold text-(--paper)">
              {viewing.title || "Informe diario"} <span className="font-mono text-[11px] text-(--muted)">— {fmtReportDate(viewing.date)}</span>
            </h4>
            {viewing.fileUrl ? (
              <embed src={viewing.fileUrl} type="application/pdf" width="100%" height="500" />
            ) : (
              <div className="whitespace-pre-wrap rounded-lg p-3.5 text-[12.5px] text-(--paper-dim)" style={{ background: "var(--panel-2)" }}>
                {viewing.content}
              </div>
            )}
          </div>
          <div>
            <h4 className="mb-2 text-[11px] text-(--muted) uppercase">Informes anteriores</h4>
            {reports.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setViewingId(r.id)}
                className="mb-1.5 block w-full rounded-lg px-2.5 py-2 text-left text-[11.5px]"
                style={{ background: r.id === viewing.id ? "var(--panel-2)" : "transparent", border: `1px solid ${r.id === viewing.id ? "var(--brass)" : "var(--line)"}`, color: "var(--paper-dim)" }}
              >
                {fmtReportDate(r.date)}
                {r.title ? ` — ${r.title}` : ""}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
