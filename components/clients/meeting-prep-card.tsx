"use client";

import { useState, useTransition } from "react";
import { refreshMeetingPrep } from "@/lib/actions/recommendations";
import { fmtDateTime } from "@/lib/format";

/** One-page AI briefing before a client meeting — generated only on click, since each run costs API credits. */
export function MeetingPrepCard({
  clientId,
  text,
  generatedAt,
}: {
  clientId: string;
  text: string | null;
  generatedAt: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4 rounded-[10px] border border-(--line) bg-(--panel) p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-base font-semibold text-(--paper)">
          Preparar reunión{" "}
          {generatedAt && <span className="text-[11px] font-normal text-(--muted)">generado el {fmtDateTime(generatedAt)}</span>}
        </h3>
        <div className="flex gap-1.5">
          {text && (
            <button type="button" className="secondary" onClick={() => setOpen((o) => !o)}>
              {open ? "Ocultar" : "Ver resumen"}
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const res = await refreshMeetingPrep(clientId);
                setError(res.error);
                if (!res.error) setOpen(true);
              })
            }
          >
            {pending ? "Preparando… (puede tardar ~1 min)" : text ? "Regenerar" : "Preparar reunión"}
          </button>
        </div>
      </div>
      {error && <div className="mt-2 text-[12px] font-semibold text-(--brick)">{error}</div>}
      {!text ? (
        <p className="mt-2 text-[12.5px] text-(--muted)">
          Genera con IA un resumen de 1 página: estado de la cartera, puntos de atención, pendientes (tareas, documentos,
          notas), contexto de mercado y preguntas sugeridas. Se genera solo cuando hacés clic (usa créditos de IA).
        </p>
      ) : (
        open && <div className="mt-3 whitespace-pre-wrap text-[12.5px] leading-relaxed text-(--paper-dim)">{text}</div>
      )}
    </div>
  );
}
