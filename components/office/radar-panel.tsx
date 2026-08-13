import Link from "next/link";
import type { RadarData } from "@/lib/finance/radar";
import { fmtUSD } from "@/lib/format";

function ClientLink({ clientId, clientName }: { clientId: string; clientName: string }) {
  return (
    <Link href={`/clientes/${clientId}`} className="font-semibold text-(--brass) underline">
      {clientName}
    </Link>
  );
}

export function RadarPanel({ data }: { data: RadarData }) {
  const total =
    data.concentraciones.length + data.atrasos.length + data.riesgo.length + data.tareas.length + data.documentos.length;

  if (total === 0) {
    return (
      <div className="rounded-[10px] border border-(--line) bg-(--panel) p-10 text-center text-[13.5px] text-(--muted)">
        Todo en orden — no encontramos concentraciones, atrasos, desvíos de riesgo, documentación vencida ni tareas
        vencidas en ningún cliente. 🎉
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {data.tareas.length > 0 && (
        <div className="rounded-[10px] border p-5" style={{ borderColor: "var(--brick)", background: "var(--panel)" }}>
          <h3 className="mb-2 font-heading text-base font-semibold" style={{ color: "var(--brick)" }}>
            ⚠ Tareas vencidas ({data.tareas.length})
          </h3>
          {data.tareas.map((t, i) => (
            <div
              key={i}
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
          ))}
        </div>
      )}

      {data.documentos.length > 0 && (
        <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
          <h3 className="mb-2 font-heading text-base font-semibold text-(--paper)">
            Documentación KYC pendiente / vencida ({data.documentos.length})
          </h3>
          {data.documentos.map((d, i) => {
            const color = d.estado === "Vencido" ? "var(--brick)" : "var(--brass)";
            return (
              <div key={i} className="mb-1.5 flex flex-wrap items-center justify-between gap-2.5 border-l-2 py-1.5 pl-3 text-[13px]" style={{ borderColor: color }}>
                <span>
                  <ClientLink clientId={d.clientId} clientName={d.clientName} /> — {d.tipo}
                </span>
                <span className="text-[11px] font-bold uppercase" style={{ color }}>
                  {d.estado}
                  {d.vencimiento ? ` (${d.vencimiento})` : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {data.atrasos.length > 0 && (
        <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
          <h3 className="mb-2 font-heading text-base font-semibold text-(--paper)">
            Estados de cuenta atrasados ({data.atrasos.length})
          </h3>
          {data.atrasos.map((a, i) => (
            <div key={i} className="mb-1.5 flex flex-wrap items-center justify-between gap-2.5 py-1.5 text-[13px]">
              <span>
                <ClientLink clientId={a.clientId} clientName={a.clientName} /> — {a.account}
              </span>
              <span className="text-[11px] text-(--muted)">
                {a.situacion === "sin_datos" ? "sin ningún estado de cuenta cargado" : `último cargado: ${a.ultimoMes} — ${a.mesesAtraso} meses de atraso`}
              </span>
            </div>
          ))}
        </div>
      )}

      {data.riesgo.length > 0 && (
        <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
          <h3 className="mb-1 font-heading text-base font-semibold text-(--paper)">
            Desvíos de perfil de riesgo ({data.riesgo.length})
          </h3>
          <div className="mb-2 text-[11px] text-(--muted)">
            Comparación aproximada (asignación sin refinar) — para el detalle exacto entrá al consolidado del
            cliente.
          </div>
          {data.riesgo.map((r, i) => (
            <div key={i} className="mb-1.5 flex flex-wrap items-center justify-between gap-2.5 py-1.5 text-[13px]">
              <span>
                <ClientLink clientId={r.clientId} clientName={r.clientName} /> — perfil {r.perfil}
              </span>
              <span className="text-[11px] text-(--paper-dim)">
                RV actual {r.rvActual.toFixed(1)}% vs objetivo {r.rvTarget.toFixed(1)}% ({r.dev >= 0 ? "+" : ""}
                {r.dev.toFixed(1)} p.p.)
              </span>
            </div>
          ))}
        </div>
      )}

      {data.concentraciones.length > 0 && (
        <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
          <h3 className="mb-2 font-heading text-base font-semibold text-(--paper)">
            Concentraciones <span className="text-[11px] font-normal text-(--muted)">&gt;12% de la cartera del cliente</span> (
            {data.concentraciones.length})
          </h3>
          {data.concentraciones.map((c, i) => (
            <div key={i} className="mb-1.5 flex flex-wrap items-center justify-between gap-2.5 py-1.5 text-[13px]">
              <span>
                <ClientLink clientId={c.clientId} clientName={c.clientName} /> — {c.activo}
              </span>
              <span className="text-[11px] text-(--paper-dim)">
                {c.pct.toFixed(1)}% ({fmtUSD(c.valor)})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
