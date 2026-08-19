import Link from "next/link";
import type { RadarData } from "@/lib/finance/radar";
import { AtrasoRow, DocumentoRow, RiesgoRow, TareaRow, TodRow, UsSitusRow } from "./radar-rows";

const MAX_ROWS = 5;

function VerTodos({ section, count }: { section: string; count: number }) {
  if (count <= MAX_ROWS) return null;
  return (
    <Link href={`/oficina/radar/${section}`} className="mt-2 inline-block text-[11px] font-semibold text-(--brass) underline">
      Ver todos ({count}) →
    </Link>
  );
}

export function RadarPanel({ data }: { data: RadarData }) {
  const total =
    data.atrasos.length +
    data.riesgo.length +
    data.tareas.length +
    data.documentos.length +
    data.usSitusRiesgo.length +
    data.todPendiente.length;

  if (total === 0) {
    return (
      <div className="rounded-[10px] border border-(--line) bg-(--panel) p-10 text-center text-[13.5px] text-(--muted)">
        Todo en orden — no encontramos atrasos, desvíos de riesgo, documentación vencida ni tareas vencidas en
        ningún cliente. 🎉
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {data.tareas.length > 0 && (
        <div className="rounded-[10px] border p-5" style={{ borderColor: "var(--brick)", background: "var(--panel)" }}>
          <h3 className="mb-2 font-heading text-base font-semibold" style={{ color: "var(--brick)" }}>
            Tareas vencidas ({data.tareas.length})
          </h3>
          {data.tareas.slice(0, MAX_ROWS).map((t, i) => (
            <TareaRow key={i} t={t} />
          ))}
          <VerTodos section="tareas" count={data.tareas.length} />
        </div>
      )}

      {data.documentos.length > 0 && (
        <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
          <h3 className="mb-2 font-heading text-base font-semibold text-(--paper)">
            Documentación KYC pendiente / vencida ({data.documentos.length})
          </h3>
          {data.documentos.slice(0, MAX_ROWS).map((d, i) => (
            <DocumentoRow key={i} d={d} />
          ))}
          <VerTodos section="documentos" count={data.documentos.length} />
        </div>
      )}

      {data.atrasos.length > 0 && (
        <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
          <h3 className="mb-2 font-heading text-base font-semibold text-(--paper)">
            Estados de cuenta atrasados ({data.atrasos.length})
          </h3>
          {data.atrasos.slice(0, MAX_ROWS).map((a, i) => (
            <AtrasoRow key={i} a={a} />
          ))}
          <VerTodos section="atrasos" count={data.atrasos.length} />
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
          {data.riesgo.slice(0, MAX_ROWS).map((r, i) => (
            <RiesgoRow key={i} r={r} />
          ))}
          <VerTodos section="riesgo" count={data.riesgo.length} />
        </div>
      )}

      {data.usSitusRiesgo.length > 0 && (
        <div className="rounded-[10px] border p-5" style={{ borderColor: "var(--brick)", background: "var(--panel)" }}>
          <h3 className="mb-1 font-heading text-base font-semibold" style={{ color: "var(--brick)" }}>
            Riesgo de US state tax — exposición &gt;$60k ({data.usSitusRiesgo.length})
          </h3>
          <div className="mb-2 text-[11px] text-(--muted)">
            Clientes con más de $60.000 en acciones/ETFs de EEUU en cuentas no jurídicas — puede disparar un US
            state tax si el titular es persona física.
          </div>
          {data.usSitusRiesgo.slice(0, MAX_ROWS).map((u, i) => (
            <UsSitusRow key={i} u={u} />
          ))}
          <VerTodos section="us-situs" count={data.usSitusRiesgo.length} />
        </div>
      )}

      {data.todPendiente.length > 0 && (
        <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
          <h3 className="mb-1 font-heading text-base font-semibold text-(--paper)">
            Transfer on Death (TOD) pendiente ({data.todPendiente.length})
          </h3>
          <div className="mb-2 text-[11px] text-(--muted)">
            Cuentas personales sin designación de beneficiario TOD — importante para la sucesión del cliente.
          </div>
          {data.todPendiente.slice(0, MAX_ROWS).map((t, i) => (
            <TodRow key={i} t={t} />
          ))}
          <VerTodos section="tod" count={data.todPendiente.length} />
        </div>
      )}
    </div>
  );
}
