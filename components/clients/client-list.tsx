"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { fmtUSD } from "@/lib/format";
import { CLIENT_PROCESSES_URL } from "@/lib/constants";
import { addClient, deleteClient } from "@/lib/actions/clients";

export interface ClientRow {
  id: string;
  name: string;
  aum: number | null;
  nCustodios: number;
}

export function ClientList({ clients }: { clients: ClientRow[] }) {
  const [search, setSearch] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();

  const filtered = clients.filter((c) => c.name.toUpperCase().includes(search.trim().toUpperCase()));

  return (
    <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
      <div className="flex items-center justify-between gap-2.5">
        <h3 className="m-0 font-heading text-base font-semibold text-(--paper)">Mis Clientes</h3>
        <a href={CLIENT_PROCESSES_URL} target="_blank" rel="noopener" className="secondary inline-block px-3.5 py-1.5 text-[12px]">
          ⚙ Gestionar procesos de clientes ↗
        </a>
      </div>
      <input
        type="text"
        placeholder="Buscar cliente por nombre…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="my-3.5 w-full"
      />
      <div>
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-[13.5px] text-(--muted)">No hay clientes que coincidan.</div>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              className="row-hover mb-2 flex items-center justify-between rounded-lg px-3.5 py-3 text-[13px]"
              style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}
            >
              <Link href={`/clientes/${c.id}`} className="text-(--paper)">
                {c.name}
              </Link>
              <span className="flex items-center gap-3.5">
                <span className="font-mono text-[11.5px] text-(--muted)">
                  {c.aum != null ? fmtUSD(c.aum) : "—"} · {c.nCustodios === 1 ? "1 custodio" : `${c.nCustodios} custodios`}
                </span>
                {confirmingId === c.id ? (
                  <button
                    type="button"
                    className="bg-(--brick) text-[11px]"
                    disabled={pending}
                    onClick={() => startTransition(() => deleteClient(c.id))}
                  >
                    ¿Confirmar borrado?
                  </button>
                ) : (
                  <button
                    type="button"
                    className="bg-transparent text-[11px] text-(--muted)"
                    onClick={() => setConfirmingId(c.id)}
                  >
                    ✕ borrar
                  </button>
                )}
              </span>
            </div>
          ))
        )}
      </div>
      {adding ? (
        <form action={addClient} className="mt-1.5 flex gap-2">
          <input type="text" name="name" placeholder="Nombre del cliente" autoFocus required className="flex-1" />
          <button type="submit">Guardar</button>
          <button type="button" className="secondary" onClick={() => setAdding(false)}>
            Cancelar
          </button>
        </form>
      ) : (
        <button type="button" className="mt-1.5" onClick={() => setAdding(true)}>
          + Agregar cliente
        </button>
      )}
    </div>
  );
}
