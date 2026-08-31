"use client";

import { useState } from "react";
import { addDocument, deleteDocument } from "@/lib/actions/documents";
import { docStatusInfo } from "@/lib/documents";
import { fmtDate } from "@/lib/format";

export interface ClientDocument {
  id: string;
  tipo: string;
  estado: string;
  vencimiento: string | null;
  notas: string | null;
}

export function DocumentsCard({ clientId, documents }: { clientId: string; documents: ClientDocument[] }) {
  const [adding, setAdding] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const sorted = [...documents].sort((a, b) => (a.vencimiento ?? "9999").localeCompare(b.vencimiento ?? "9999"));

  return (
    <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
      <h3 className="mb-3 font-heading text-base font-semibold text-(--paper)">Documentación KYC</h3>
      {sorted.length === 0 ? (
        <div className="p-4 text-center text-[13px] text-(--muted)">Sin documentos cargados.</div>
      ) : (
        sorted.map((d) => {
          const status = docStatusInfo(d);
          const color = status.label === "Vigente" ? "var(--teal)" : status.label === "Vencido" ? "var(--brick)" : "var(--brass)";
          return (
            <div key={d.id} className="mb-1.5 flex items-center justify-between rounded-lg px-3.5 py-2.5 text-[12.5px]" style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>
              <span className="text-(--paper)">
                {d.tipo}
                {d.vencimiento && <span className="ml-1.5 font-mono text-[11px] text-(--muted)">({fmtDate(d.vencimiento)})</span>}
              </span>
              <span className="flex items-center gap-2.5">
                <span className="text-[11px] font-semibold uppercase" style={{ color }}>
                  {status.label}
                </span>
                {confirmingId === d.id ? (
                  <button type="button" className="bg-(--brick) px-2 py-1 text-[10px]" onClick={() => deleteDocument(clientId, d.id)}>
                    ¿Confirmar?
                  </button>
                ) : (
                  <button type="button" className="bg-transparent p-0 text-[11px] text-(--muted)" onClick={() => setConfirmingId(d.id)}>
                    ✕
                  </button>
                )}
              </span>
            </div>
          );
        })
      )}
      {adding ? (
        <form
          action={async (fd) => {
            await addDocument(clientId, fd);
            setAdding(false);
          }}
          className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4"
        >
          <input type="text" name="tipo" placeholder="Tipo (KYC, W-8BEN…)" required autoFocus />
          <select name="estado" defaultValue="pendiente">
            <option value="pendiente">Pendiente</option>
            <option value="vigente">Vigente</option>
          </select>
          <input type="date" name="vencimiento" />
          <div className="flex gap-1.5">
            <button type="submit" className="px-2.5 py-1.5 text-[12px]">
              Agregar
            </button>
            <button type="button" className="secondary px-2.5 py-1.5 text-[12px]" onClick={() => setAdding(false)}>
              ✕
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="mt-2" onClick={() => setAdding(true)}>
          + agregar documento
        </button>
      )}
    </div>
  );
}
