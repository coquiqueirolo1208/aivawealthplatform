"use client";

import { useState } from "react";
import { addTask, markTaskDone } from "@/lib/actions/tasks";
import type { ClientTask } from "@/lib/queries/tasks";

export function TasksCard({ clientId, tasks }: { clientId: string; tasks: ClientTask[] }) {
  const [adding, setAdding] = useState(false);
  const pending = tasks.filter((t) => !t.done);
  const doneCount = tasks.length - pending.length;

  return (
    <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
      <h3 className="mb-3 font-heading text-base font-semibold text-(--paper)">
        Tareas
        {doneCount > 0 && (
          <span className="ml-1.5 text-[11px] font-normal text-(--muted)">
            ({doneCount} completada{doneCount === 1 ? "" : "s"})
          </span>
        )}
      </h3>
      {pending.length === 0 ? (
        <div className="p-4 text-center text-[13px] text-(--muted)">Sin tareas pendientes.</div>
      ) : (
        pending.map((t) => (
          <div
            key={t.id}
            className="mb-1.5 flex items-center justify-between rounded-lg px-3.5 py-2.5 text-[12.5px]"
            style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}
          >
            <span className="text-(--paper)">
              {t.title}
              {t.due && <span className="ml-1.5 font-mono text-[11px] text-(--muted)">(vence {t.due})</span>}
            </span>
            <form action={markTaskDone.bind(null, t.id)}>
              <button type="submit" className="secondary px-2 py-1 text-[11px]">
                Marcar hecha
              </button>
            </form>
          </div>
        ))
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
          + agregar tarea
        </button>
      )}
    </div>
  );
}
