"use client";

import { useState } from "react";
import type { RadarData } from "@/lib/finance/radar";
import type { PendingTask } from "@/lib/queries/tasks";
import { AtrasoRow, ContactoRow, DocumentoRow, PendingTaskRow, RiesgoRow, TareaRow, TodRow, UsSitusRow } from "./radar-rows";

type Props =
  | { kind: "tareas"; items: RadarData["tareas"] }
  | { kind: "documentos"; items: RadarData["documentos"] }
  | { kind: "atrasos"; items: RadarData["atrasos"] }
  | { kind: "riesgo"; items: RadarData["riesgo"] }
  | { kind: "usSitus"; items: RadarData["usSitusRiesgo"] }
  | { kind: "tod"; items: RadarData["todPendiente"] }
  | { kind: "contacto"; items: RadarData["contactoPendiente"] }
  | { kind: "pendientes"; items: PendingTask[] };

/** Every item shape here carries `clientName` — filters that field client-side, no round trip needed for these small (tens of rows) lists. */
export function SearchableSectionList(props: Props) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const searchBox = (
    <input
      type="text"
      placeholder="Buscar por cliente…"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      className="mb-3 w-full max-w-xs"
    />
  );
  const empty = <div className="p-6 text-center text-[13px] text-(--muted)">No hay resultados para esa búsqueda.</div>;

  if (props.kind === "tareas") {
    const filtered = props.items.filter((t) => t.clientName.toLowerCase().includes(q));
    return (
      <div>
        {searchBox}
        {filtered.length === 0 ? empty : filtered.map((t, i) => <TareaRow key={i} t={t} />)}
      </div>
    );
  }
  if (props.kind === "documentos") {
    const filtered = props.items.filter((d) => d.clientName.toLowerCase().includes(q));
    return (
      <div>
        {searchBox}
        {filtered.length === 0 ? empty : filtered.map((d, i) => <DocumentoRow key={i} d={d} />)}
      </div>
    );
  }
  if (props.kind === "atrasos") {
    const filtered = props.items.filter((a) => a.clientName.toLowerCase().includes(q));
    return (
      <div>
        {searchBox}
        {filtered.length === 0 ? empty : filtered.map((a, i) => <AtrasoRow key={i} a={a} />)}
      </div>
    );
  }
  if (props.kind === "riesgo") {
    const filtered = props.items.filter((r) => r.clientName.toLowerCase().includes(q));
    return (
      <div>
        {searchBox}
        {filtered.length === 0 ? empty : filtered.map((r, i) => <RiesgoRow key={i} r={r} />)}
      </div>
    );
  }
  if (props.kind === "usSitus") {
    const filtered = props.items.filter((u) => u.clientName.toLowerCase().includes(q));
    return (
      <div>
        {searchBox}
        {filtered.length === 0 ? empty : filtered.map((u, i) => <UsSitusRow key={i} u={u} />)}
      </div>
    );
  }
  if (props.kind === "tod") {
    const filtered = props.items.filter((t) => t.clientName.toLowerCase().includes(q));
    return (
      <div>
        {searchBox}
        {filtered.length === 0 ? empty : filtered.map((t, i) => <TodRow key={i} t={t} />)}
      </div>
    );
  }
  if (props.kind === "contacto") {
    const filtered = props.items.filter((c) => c.clientName.toLowerCase().includes(q));
    return (
      <div>
        {searchBox}
        {filtered.length === 0 ? empty : filtered.map((c, i) => <ContactoRow key={i} c={c} />)}
      </div>
    );
  }
  const filtered = props.items.filter((t) => t.clientName.toLowerCase().includes(q));
  return (
    <div>
      {searchBox}
      {filtered.length === 0 ? empty : filtered.map((t) => <PendingTaskRow key={t.id} t={t} />)}
    </div>
  );
}
