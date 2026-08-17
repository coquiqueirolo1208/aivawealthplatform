import Link from "next/link";
import type { RadarData } from "@/lib/finance/radar";

export function ClientLink({ clientId, clientName }: { clientId: string; clientName: string }) {
  return (
    <Link href={`/clientes/${clientId}`} className="font-semibold text-(--brass) underline">
      {clientName}
    </Link>
  );
}

export function TareaRow({ t }: { t: RadarData["tareas"][number] }) {
  return (
    <div
      className="mb-1.5 flex flex-wrap items-center justify-between gap-2.5 border-l-2 py-1.5 pl-3 text-[13px]"
      style={{ borderColor: "var(--brick)" }}
    >
      <span>
        <ClientLink clientId={t.clientId} clientName={t.clientName} /> — {t.title}
      </span>
      <span className="text-[11px]" style={{ color: "var(--brick)" }}>
        venció {t.due}
      </span>
    </div>
  );
}

export function DocumentoRow({ d }: { d: RadarData["documentos"][number] }) {
  const color = d.estado === "Vencido" ? "var(--brick)" : "var(--brass)";
  return (
    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2.5 border-l-2 py-1.5 pl-3 text-[13px]" style={{ borderColor: color }}>
      <span>
        <ClientLink clientId={d.clientId} clientName={d.clientName} /> — {d.tipo}
      </span>
      <span className="text-[11px] font-bold uppercase" style={{ color }}>
        {d.estado}
        {d.vencimiento ? ` (${d.vencimiento})` : ""}
      </span>
    </div>
  );
}

export function AtrasoRow({ a }: { a: RadarData["atrasos"][number] }) {
  return (
    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2.5 py-1.5 text-[13px]">
      <span>
        <ClientLink clientId={a.clientId} clientName={a.clientName} /> —{" "}
        <Link href={`/clientes/${a.clientId}/cuentas/${a.accountId}`} className="underline">
          {a.account}
        </Link>
      </span>
      <span className="text-[11px] text-(--muted)">
        {a.situacion === "sin_datos" ? "sin ningún estado de cuenta cargado" : `último cargado: ${a.ultimoMes} — ${a.mesesAtraso} meses de atraso`}
      </span>
    </div>
  );
}

export function RiesgoRow({ r }: { r: RadarData["riesgo"][number] }) {
  return (
    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2.5 py-1.5 text-[13px]">
      <span>
        <ClientLink clientId={r.clientId} clientName={r.clientName} /> — perfil {r.perfil}
      </span>
      <span className="text-[11px] text-(--paper-dim)">
        RV actual {r.rvActual.toFixed(1)}% vs objetivo {r.rvTarget.toFixed(1)}% ({r.dev >= 0 ? "+" : ""}
        {r.dev.toFixed(1)} p.p.)
      </span>
    </div>
  );
}
