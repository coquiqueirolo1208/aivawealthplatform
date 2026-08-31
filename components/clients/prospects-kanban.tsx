"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PROSPECT_STAGES, ONBOARDING_FORM_URL } from "@/lib/constants";
import { fmtUSD } from "@/lib/format";
import { addProspect, convertProspect, deleteProspect, updateProspect, updateProspectStage } from "@/lib/actions/prospects";
import { addProspectTask, markTaskDone } from "@/lib/actions/tasks";
import type { Prospect } from "@/lib/queries/prospects";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function ProspectsKanban({ prospects, nowMs }: { prospects: Prospect[]; nowMs: number }) {
  const router = useRouter();
  const [openStage, setOpenStage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const byStage = new Map<string, Prospect[]>();
  PROSPECT_STAGES.forEach(([id]) => byStage.set(id, []));
  prospects.forEach((p) => {
    const list = byStage.get(p.stage) ?? byStage.get("nuevo")!;
    list.push(p);
  });

  return (
    <div className="mt-5 rounded-[10px] border border-(--line) bg-(--panel) p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="m-0 font-heading text-base font-semibold text-(--paper)">Prospectos</h3>
        <button type="button" className="secondary px-2.5 py-1.5 text-[12px]" onClick={() => setAdding((a) => !a)}>
          {adding ? "Cerrar" : "+ Agregar prospecto"}
        </button>
      </div>

      {adding && (
        <form
          action={async (fd) => {
            await addProspect(fd);
            setAdding(false);
          }}
          className="mb-4 grid grid-cols-2 gap-2 rounded-lg p-3.5 md:grid-cols-4"
          style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}
        >
          <input type="text" name="name" placeholder="Nombre *" required autoFocus />
          <input type="text" name="empresa" placeholder="Empresa / ocupación" />
          <input type="text" name="fuente" placeholder="Fuente (referido, evento…)" />
          <input type="text" name="aumEstimado" placeholder="AUM estimado" />
          <input type="text" name="proximaAccion" placeholder="Próxima acción" />
          <input type="date" name="proximaFecha" />
          <textarea name="notas" placeholder="Notas" className="col-span-2" />
          <button type="submit" className="col-span-full">
            Guardar
          </button>
        </form>
      )}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {PROSPECT_STAGES.map(([id, label]) => {
          const items = byStage.get(id) ?? [];
          const totalAum = items.reduce((s, p) => s + (p.aumEstimado ?? 0), 0);
          const nuevos = items.filter((p) => nowMs - new Date(p.createdAt).getTime() <= THIRTY_DAYS_MS).length;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setOpenStage(id)}
              className="row-hover w-[190px] shrink-0 rounded-lg p-3 text-left"
              style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}
            >
              <div className="mb-2 text-[11px] font-semibold tracking-[0.04em] text-(--muted) uppercase">
                {label} ({items.length})
              </div>
              <div className="font-mono text-[13px] text-(--paper)">{fmtUSD(totalAum)}</div>
              <div className="mt-1 text-[10.5px] text-(--muted)">{nuevos} nuevo(s) últimos 30 días</div>
            </button>
          );
        })}
      </div>

      {openStage && (
        <ProspectStageModal
          stageId={openStage}
          stageLabel={PROSPECT_STAGES.find(([id]) => id === openStage)?.[1] ?? openStage}
          prospects={byStage.get(openStage) ?? []}
          onClose={() => setOpenStage(null)}
          onConverted={(clientId) => router.push(`/clientes/${clientId}`)}
          nowMs={nowMs}
        />
      )}
    </div>
  );
}

function ProspectStageModal({
  stageId,
  stageLabel,
  prospects,
  onClose,
  onConverted,
  nowMs,
}: {
  stageId: string;
  stageLabel: string;
  prospects: Prospect[];
  onClose: () => void;
  onConverted: (clientId: string) => void;
  nowMs: number;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingTaskFor, setAddingTaskFor] = useState<string | null>(null);
  const todayIso = new Date(nowMs).toISOString().slice(0, 10);

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-5"
      style={{ background: "rgba(19,31,56,0.65)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[10px] p-5.5 shadow-xl"
        style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="m-0 font-heading text-base font-semibold text-(--paper)">{stageLabel}</h3>
          <button type="button" className="secondary px-2.5 py-1 text-[11px]" onClick={onClose}>
            Cerrar
          </button>
        </div>
        {prospects.length === 0 ? (
          <div className="p-6 text-center text-[13px] text-(--muted)">No hay prospectos en esta etapa.</div>
        ) : (
          prospects.map((p) =>
            editingId === p.id ? (
              <form
                key={p.id}
                action={async (fd) => {
                  await updateProspect(p.id, fd);
                  setEditingId(null);
                }}
                className="mb-3 grid grid-cols-2 gap-2 rounded-lg p-3.5"
                style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}
              >
                <input type="text" name="name" placeholder="Nombre *" defaultValue={p.name} required autoFocus />
                <input type="text" name="empresa" placeholder="Empresa / ocupación" defaultValue={p.empresa ?? ""} />
                <input type="text" name="fuente" placeholder="Fuente (referido, evento…)" defaultValue={p.fuente ?? ""} />
                <input type="text" name="aumEstimado" placeholder="AUM estimado" defaultValue={p.aumEstimado ?? ""} />
                <input type="text" name="proximaAccion" placeholder="Próxima acción" defaultValue={p.proximaAccion ?? ""} />
                <input type="date" name="proximaFecha" defaultValue={p.proximaFecha ?? ""} />
                <textarea name="notas" placeholder="Notas" defaultValue={p.notas ?? ""} className="col-span-2" />
                <div className="col-span-full flex gap-2">
                  <button type="submit" className="flex-1">
                    Guardar
                  </button>
                  <button type="button" className="secondary flex-1" onClick={() => setEditingId(null)}>
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div key={p.id} className="row-hover mb-3 rounded-lg p-3.5 text-[12.5px]" style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-semibold text-(--paper)">{p.name}</span>
                  <span className="font-mono text-(--muted)">{p.aumEstimado != null ? fmtUSD(p.aumEstimado) : "—"}</span>
                </div>
                {p.empresa && <div className="text-(--paper-dim)">{p.empresa}</div>}
                {p.fuente && <div className="text-(--muted)">Fuente: {p.fuente}</div>}
                {(p.proximaAccion || p.proximaFecha) && (
                  <div className="text-(--paper-dim)">
                    Próxima acción: {p.proximaAccion ?? "—"} {p.proximaFecha && `(${p.proximaFecha})`}
                  </div>
                )}
                {p.notas && <div className="mt-1 text-(--muted)">{p.notas}</div>}

                <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--line)" }}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10.5px] font-semibold tracking-[0.04em] text-(--muted) uppercase">Tareas</span>
                    <button
                      type="button"
                      className="text-[11px] text-(--brass) underline"
                      onClick={() => setAddingTaskFor(addingTaskFor === p.id ? null : p.id)}
                    >
                      {addingTaskFor === p.id ? "cerrar" : "+ agregar"}
                    </button>
                  </div>
                  {p.tasks.filter((t) => !t.done).length === 0 ? (
                    <div className="text-[11px] text-(--muted)">Sin tareas pendientes.</div>
                  ) : (
                    p.tasks
                      .filter((t) => !t.done)
                      .map((t) => {
                        const overdue = !!t.due && t.due < todayIso;
                        return (
                          <div key={t.id} className="mb-1 flex items-center justify-between gap-2 text-[11.5px]">
                            <span style={overdue ? { color: "var(--brick)" } : undefined} className={overdue ? undefined : "text-(--paper-dim)"}>
                              {t.title}
                              {t.due && ` (${overdue ? "venció" : "vence"} ${t.due})`}
                            </span>
                            <form action={markTaskDone.bind(null, t.id)}>
                              <button type="submit" className="secondary px-1.5 py-0.5 text-[10px]">
                                Marcar hecha
                              </button>
                            </form>
                          </div>
                        );
                      })
                  )}
                  {addingTaskFor === p.id && (
                    <form
                      action={async (fd) => {
                        await addProspectTask(p.id, fd);
                        setAddingTaskFor(null);
                      }}
                      className="mt-1.5 flex flex-wrap gap-1.5"
                    >
                      <input type="text" name="title" placeholder="Título *" required autoFocus className="flex-1 text-[11px]" />
                      <input type="date" name="due" className="text-[11px]" />
                      <button type="submit" className="px-2 py-1 text-[11px]">
                        Agregar
                      </button>
                    </form>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select
                    defaultValue={p.stage}
                    onChange={(e) => updateProspectStage(p.id, e.target.value)}
                    className="text-[11px]"
                  >
                    {PROSPECT_STAGES.map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                  {stageId === "ganado" && !p.convertedClientId && (
                    <>
                      <a href={ONBOARDING_FORM_URL} target="_blank" rel="noopener" className="text-[11px] text-(--brass) underline">
                        Iniciar alta ↗
                      </a>
                      <button
                        type="button"
                        className="px-2.5 py-1 text-[11px]"
                        onClick={() => convertProspect(p.id, p.name).then((id) => onConverted(id))}
                      >
                        Convertir a cliente
                      </button>
                    </>
                  )}
                  {p.convertedClientId && <span className="text-[11px] text-(--teal)">Ya convertido a cliente</span>}
                  <button type="button" className="secondary px-2.5 py-1 text-[11px]" onClick={() => setEditingId(p.id)}>
                    Editar
                  </button>
                  {confirmingId === p.id ? (
                    <button type="button" className="bg-(--brick) px-2 py-1 text-[11px]" onClick={() => deleteProspect(p.id)}>
                      ¿Confirmar borrado?
                    </button>
                  ) : (
                    <button type="button" className="secondary px-2.5 py-1 text-[11px]" onClick={() => setConfirmingId(p.id)}>
                      Borrar
                    </button>
                  )}
                </div>
              </div>
            ),
          )
        )}
      </div>
    </div>
  );
}
