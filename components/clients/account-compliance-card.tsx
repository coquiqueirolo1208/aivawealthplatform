"use client";

import { updateAccountCompliance } from "@/lib/actions/accounts";
import { HelpTooltip } from "@/components/ui/help-tooltip";

export function AccountComplianceCard({
  clientId,
  accountId,
  titularidad,
  todCompletado,
  todFecha,
}: {
  clientId: string;
  accountId: string;
  titularidad: string | null;
  todCompletado: boolean;
  todFecha: string | null;
}) {
  return (
    <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
      <h3 className="mb-1 font-heading text-base font-semibold text-(--paper)">Titularidad y sucesión</h3>
      <p className="mb-3 text-[11px] text-(--muted)">
        Usado para las alertas de riesgo de US state tax y de Transfer on Death pendiente en el Radar.
      </p>
      <form action={(fd) => updateAccountCompliance(clientId, accountId, fd)} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] text-(--muted)">Titularidad de la cuenta</span>
          <select name="titularidad" defaultValue={titularidad ?? ""} className="w-full">
            <option value="">Sin clasificar</option>
            <option value="personal">Persona física</option>
            <option value="juridica">Persona jurídica</option>
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2.5">
          <input type="checkbox" name="todCompletado" defaultChecked={todCompletado} />
          <span className="flex items-center text-[12.5px] text-(--paper)">
            TOD completado
            <HelpTooltip text="Transfer on Death: designación de beneficiario que evita que la cuenta pase por un proceso sucesorio." />
          </span>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-(--muted)">Fecha TOD completado</span>
          <input type="date" name="todFecha" defaultValue={todFecha ?? ""} className="w-full" />
        </label>
        <div className="col-span-full">
          <button type="submit" className="px-3.5 py-1.5 text-[12px]">
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
