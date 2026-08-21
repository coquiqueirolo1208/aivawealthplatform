"use client";

import { useState } from "react";
import { updateWeeklyEmailPreference } from "@/lib/actions/advisor";

export function WeeklyEmailToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  return (
    <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
      <h3 className="mb-1 font-heading text-base font-semibold text-(--paper)">Resumen semanal por email</h3>
      <p className="mb-3 text-[12px] text-(--muted)">
        Todos los lunes a primera hora — alertas del Radar, tareas de la semana y cumpleaños próximos.
      </p>
      <label className="flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={enabled}
          disabled={saving}
          onChange={async (e) => {
            const next = e.target.checked;
            setEnabled(next);
            setSaving(true);
            try {
              await updateWeeklyEmailPreference(next);
            } finally {
              setSaving(false);
            }
          }}
        />
        <span className="text-[13px] text-(--paper)">Recibir el resumen semanal</span>
      </label>
    </div>
  );
}
