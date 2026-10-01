"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { fmtUSD } from "@/lib/format";
import { CLIENT_PROCESSES_URL } from "@/lib/constants";
import { addClient, deleteClient } from "@/lib/actions/clients";
import { SubmitButton } from "@/components/ui/submit-button";
import { useArmedConfirm } from "@/components/ui/use-armed-confirm";

export interface ClientRow {
  id: string;
  name: string;
  aum: number | null;
  /** Number of accounts (the old label said "custodios", but two accounts can share one). */
  nCuentas: number;
  householdLabel: string | null;
  /** Newest statement month across the client's accounts, YYYY-MM. */
  lastStatement: string | null;
  /** Radar alerts for this client, same categories as the nav badge. */
  alerts: number;
}

type SortKey = "nombre" | "aum" | "estado" | "alertas";

const SORTS: Array<[SortKey, string]> = [
  ["nombre", "Nombre"],
  ["aum", "AUM (mayor primero)"],
  ["estado", "Estado de cuenta más viejo primero"],
  ["alertas", "Más alertas primero"],
];

function compare(sort: SortKey, a: ClientRow, b: ClientRow): number {
  if (sort === "aum") return (b.aum ?? -1) - (a.aum ?? -1);
  // Clients with no statement at all are the most out of date.
  if (sort === "estado") return (a.lastStatement ?? "").localeCompare(b.lastStatement ?? "");
  if (sort === "alertas") return b.alerts - a.alerts;
  return a.name.localeCompare(b.name, "es");
}

export function ClientList({ clients }: { clients: ClientRow[] }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("nombre");
  const confirm = useArmedConfirm<string>();
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();

  const filtered = clients
    .filter((c) => c.name.toUpperCase().includes(search.trim().toUpperCase()))
    .sort((a, b) => compare(sort, a, b) || a.name.localeCompare(b.name, "es"));

  const households = new Map<string, { members: ClientRow[]; totalAum: number }>();
  clients.forEach((c) => {
    if (!c.householdLabel) return;
    if (!households.has(c.householdLabel)) households.set(c.householdLabel, { members: [], totalAum: 0 });
    const h = households.get(c.householdLabel)!;
    h.members.push(c);
    h.totalAum += c.aum ?? 0;
  });
  const multiHouseholds = Array.from(households.entries()).filter(([, h]) => h.members.length >= 2);

  return (
    <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
      <div className="flex items-center justify-between gap-2.5">
        <h3 className="m-0 font-heading text-base font-semibold text-(--paper)">Mis Clientes</h3>
        <a href={CLIENT_PROCESSES_URL} target="_blank" rel="noopener" className="secondary inline-block px-3.5 py-1.5 text-[12px]">
          ⚙ Gestionar procesos de clientes ↗
        </a>
      </div>
      <div className="my-3.5 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Buscar cliente por nombre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] flex-1"
        />
        <label className="flex items-center gap-1.5 text-[12px] text-(--muted)">
          Ordenar por
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {SORTS.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {multiHouseholds.length > 0 && (
        <div className="mb-3 flex flex-col gap-1.5">
          {multiHouseholds.map(([label, h]) => (
            <div
              key={label}
              className="rounded-lg px-3.5 py-2 text-[12px] text-(--paper-dim)"
              style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}
            >
              👪 <strong className="text-(--paper)">{label}</strong> — AUM combinado {fmtUSD(h.totalAum)} ({h.members.length}{" "}
              clientes: {h.members.map((m) => m.name).join(", ")})
            </div>
          ))}
        </div>
      )}

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
              <span>
                <Link href={`/clientes/${c.id}`} className="text-(--paper)">
                  {c.name}
                </Link>
                {c.householdLabel && <span className="ml-1.5 text-[10.5px] text-(--muted)">👪 {c.householdLabel}</span>}
                {c.alerts > 0 && (
                  <span
                    className="ml-2 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold"
                    style={{ background: "var(--brick)", color: "#fff" }}
                    title={`${c.alerts} ${c.alerts === 1 ? "alerta" : "alertas"} en el Radar`}
                  >
                    {c.alerts}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-3.5">
                <span className="font-mono text-[11.5px] text-(--muted)">
                  {c.aum != null ? fmtUSD(c.aum) : "—"} · {c.nCuentas === 1 ? "1 cuenta" : `${c.nCuentas} cuentas`} · último{" "}
                  {c.lastStatement ?? "—"}
                </span>
                {confirm.armed === c.id ? (
                  <button
                    type="button"
                    className="bg-(--brick) text-[11px]"
                    disabled={pending}
                    onClick={() => {
                      if (confirm.ready()) startTransition(() => deleteClient(c.id));
                    }}
                  >
                    ¿Confirmar borrado?
                  </button>
                ) : (
                  <button
                    type="button"
                    className="bg-transparent text-[11px] text-(--muted)"
                    onClick={() => confirm.arm(c.id)}
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
          <SubmitButton pendingText="Guardando…">Guardar</SubmitButton>
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
