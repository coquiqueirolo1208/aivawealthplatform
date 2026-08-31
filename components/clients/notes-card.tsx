"use client";

import { useState } from "react";
import { addNote, deleteNote } from "@/lib/actions/notes";
import type { ClientNote } from "@/lib/queries/notes";
import { fmtDateTime } from "@/lib/format";

export function NotesCard({ clientId, notes }: { clientId: string; notes: ClientNote[] }) {
  const [adding, setAdding] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  return (
    <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="m-0 font-heading text-base font-semibold text-(--paper)">Bitácora — llamadas y reuniones</h3>
        <button type="button" className="secondary px-2.5 py-1.5 text-[12px]" onClick={() => setAdding((a) => !a)}>
          {adding ? "Cerrar" : "+ agregar"}
        </button>
      </div>

      {adding && (
        <form
          action={async (fd) => {
            await addNote(clientId, fd);
            setAdding(false);
          }}
          className="mb-3 flex flex-col gap-2"
        >
          <textarea name="texto" placeholder="¿Qué se habló / acordó?" required autoFocus rows={2} />
          <button type="submit" className="self-start px-3.5 py-1.5 text-[12px]">
            Guardar
          </button>
        </form>
      )}

      {notes.length === 0 ? (
        <div className="p-4 text-center text-[13px] text-(--muted)">Sin notas cargadas todavía.</div>
      ) : (
        notes.map((n) => (
          <div
            key={n.id}
            className="mb-1.5 rounded-lg px-3.5 py-2.5 text-[12.5px]"
            style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[11px] text-(--muted)">
                {fmtDateTime(n.createdAt)}
              </span>
              {confirmingId === n.id ? (
                <button type="button" className="bg-(--brick) px-2 py-0.5 text-[10px]" onClick={() => deleteNote(clientId, n.id)}>
                  ¿Confirmar?
                </button>
              ) : (
                <button type="button" className="bg-transparent p-0 text-[11px] text-(--muted)" onClick={() => setConfirmingId(n.id)}>
                  ✕
                </button>
              )}
            </div>
            <div className="text-(--paper)">{n.texto}</div>
          </div>
        ))
      )}
    </div>
  );
}
