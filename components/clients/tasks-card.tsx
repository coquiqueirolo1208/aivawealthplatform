"use client";

import { useState } from "react";
import { addTask, deleteTask, markTaskDone, reopenTask, updateTask } from "@/lib/actions/tasks";
import type { ClientTask } from "@/lib/queries/tasks";
import { fmtDate } from "@/lib/format";
import { SubmitButton } from "@/components/ui/submit-button";
import { useArmedConfirm } from "@/components/ui/use-armed-confirm";

export function TasksCard({ clientId, tasks }: { clientId: string; tasks: ClientTask[] }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const confirm = useArmedConfirm<string>();
  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
      <h3 className="mb-3 font-heading text-base font-semibold text-(--paper)">Tareas</h3>
      {pending.length === 0 ? (
        <div className="p-4 text-center text-[13px] text-(--muted)">Sin tareas pendientes.</div>
      ) : (
        pending.map((t) =>
          editingId === t.id ? (
            <form
              key={t.id}
              action={async (fd) => {
                await updateTask(t.id, fd);
                setEditingId(null);
              }}
              className="mb-1.5 grid grid-cols-2 gap-1.5 rounded-lg p-2.5"
              style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}
            >
              <input type="text" name="title" defaultValue={t.title} required autoFocus className="col-span-2 text-[12px]" />
              <input type="date" name="due" defaultValue={t.due ?? ""} className="text-[12px]" />
              <div className="flex gap-1.5">
                <SubmitButton className="px-2 py-1 text-[11px]">Guardar</SubmitButton>
                <button type="button" className="secondary px-2 py-1 text-[11px]" onClick={() => setEditingId(null)}>
                  ✕
                </button>
              </div>
            </form>
          ) : (
            <div
              key={t.id}
              className="mb-1.5 flex items-center justify-between gap-2 rounded-lg px-3.5 py-2.5 text-[12.5px]"
              style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}
            >
              <button
                type="button"
                className="bg-transparent p-0 text-left text-(--paper)"
                title="Editar tarea"
                onClick={() => setEditingId(t.id)}
              >
                {t.title}
                {t.due && <span className="ml-1.5 font-mono text-[11px] text-(--muted)">(vence {fmtDate(t.due)})</span>}
              </button>
              <span className="flex shrink-0 items-center gap-1.5">
                <form action={markTaskDone.bind(null, t.id)}>
                  <SubmitButton className="secondary px-2 py-1 text-[11px]">Marcar hecha</SubmitButton>
                </form>
                {confirm.armed === t.id ? (
                  <button
                    type="button"
                    className="bg-(--brick) px-1.5 py-1 text-[10px]"
                    onClick={() => confirm.ready() && deleteTask(t.id)}
                  >
                    ¿Borrar?
                  </button>
                ) : (
                  <button type="button" className="bg-transparent p-0 text-[11px] text-(--muted)" title="Borrar tarea" onClick={() => confirm.arm(t.id)}>
                    ✕
                  </button>
                )}
              </span>
            </div>
          ),
        )
      )}

      {done.length > 0 && (
        <div className="mt-1">
          <button type="button" className="bg-transparent p-0 text-[11px] text-(--muted) underline" onClick={() => setShowDone((s) => !s)}>
            {showDone ? "Ocultar" : "Ver"} {done.length} completada{done.length === 1 ? "" : "s"}
          </button>
          {showDone &&
            done.map((t) => (
              <div key={t.id} className="mt-1 flex items-center justify-between gap-2 px-1 text-[12px] text-(--muted)">
                <span className="line-through">{t.title}</span>
                <form action={reopenTask.bind(null, t.id)}>
                  <SubmitButton className="secondary px-2 py-0.5 text-[10.5px]">Reabrir</SubmitButton>
                </form>
              </div>
            ))}
        </div>
      )}

      {adding ? (
        <form
          action={async (fd) => {
            await addTask(clientId, fd);
            setAdding(false);
          }}
          className="mt-2 grid grid-cols-2 gap-2"
        >
          <input type="text" name="title" placeholder="Título *" required autoFocus className="col-span-2" />
          <input type="date" name="due" />
          <div className="flex gap-1.5">
            <SubmitButton className="px-2.5 py-1.5 text-[12px]">Agregar</SubmitButton>
            <button type="button" className="secondary px-2.5 py-1.5 text-[12px]" onClick={() => setAdding(false)}>
              ✕
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="mt-2" onClick={() => setAdding(true)}>
          + agregar tarea
        </button>
      )}
    </div>
  );
}
