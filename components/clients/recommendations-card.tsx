"use client";

import { useState, useTransition } from "react";
import { refreshRecommendations } from "@/lib/actions/recommendations";
import { fmtDate } from "@/lib/format";

export interface RecommendationsData {
  fecha: string | null;
  resumenMercado: string | null;
  cambiar: Array<{ activo: string; cuenta: string; situacion: string; accion: string; destino: string }>;
  mantenerConCondicion: Array<{ activo: string; cuenta: string; razon: string; condicion: string }>;
  estructurales: Array<{ tema: string; accion: string }>;
  fingerprint: string | null;
}

export function RecommendationsCard({
  clientId,
  data,
  isStale,
}: {
  clientId: string;
  data: RecommendationsData | null;
  isStale: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-4 rounded-[10px] border border-(--line) bg-(--panel) p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-base font-semibold text-(--paper)">
          Recomendaciones IA{" "}
          {data?.fecha && <span className="text-[11px] font-normal text-(--muted)">generadas el {fmtDate(data.fecha)}</span>}
        </h3>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const res = await refreshRecommendations(clientId);
              setError(res.error);
            })
          }
        >
          {pending ? "Generando… (puede tardar ~1 min)" : data ? "Actualizar" : "Generar recomendaciones"}
        </button>
      </div>
      {error && <div className="mt-2 text-[12px] font-semibold text-(--brick)">{error}</div>}

      {!data ? (
        <div className="mt-3 p-6 text-center text-[13px] text-(--muted)">
          Todavía no se generaron recomendaciones para este cliente. Se generan solo cuando hacés clic (usa créditos de IA).
        </div>
      ) : (
        <>
          {isStale && (
            <div className="mt-3 rounded-lg px-3.5 py-2 text-[12px]" style={{ background: "var(--panel-2)", border: "1px solid var(--brass)", color: "var(--brass)" }}>
              Desactualizado — subiste estados de cuenta nuevos desde la última vez que se generaron.
            </div>
          )}
          <p className="mt-3 text-[12.5px] text-(--paper-dim)">{data.resumenMercado}</p>

          {data.cambiar.length > 0 && (
            <RecTable
              title="Cambiar"
              color="var(--brick)"
              rows={data.cambiar}
              columns={["activo", "cuenta", "situacion", "accion", "destino"]}
              headers={["Activo", "Cuenta", "Situación", "Acción", "Destino"]}
            />
          )}
          {data.mantenerConCondicion.length > 0 && (
            <RecTable
              title="Mantener con condición"
              color="var(--teal)"
              rows={data.mantenerConCondicion}
              columns={["activo", "cuenta", "razon", "condicion"]}
              headers={["Activo", "Cuenta", "Razón", "Condición"]}
            />
          )}
          {data.estructurales.length > 0 && (
            <RecTable
              title="Cambios estructurales"
              color="var(--brass)"
              rows={data.estructurales}
              columns={["tema", "accion"]}
              headers={["Tema", "Acción"]}
            />
          )}
          <p className="mt-4 text-[11px] text-(--muted)">
            Generado con IA a partir de la cartera — no es asesoramiento financiero formal.
          </p>
        </>
      )}
    </div>
  );
}

function RecTable<T extends Record<string, string>>({
  title,
  color,
  rows,
  columns,
  headers,
}: {
  title: string;
  color: string;
  rows: T[];
  columns: string[];
  headers: string[];
}) {
  return (
    <div className="mt-4">
      <h4 className="mb-1.5 text-[12.5px] font-semibold" style={{ color }}>
        {title}
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-(--muted)">
              {headers.map((h) => (
                <th key={h} className="text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-(--line)">
                {columns.map((c) => (
                  <td key={c} className="py-1.5 text-(--paper-dim)">
                    {row[c]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
