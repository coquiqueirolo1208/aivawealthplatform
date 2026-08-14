"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { saveSnapshotManual, deleteSnapshot } from "@/lib/actions/accounts";
import type { Snapshot } from "@/lib/finance/types";
import { CURRENCIES } from "@/lib/constants";

export function SnapshotForm({
  clientId,
  accountId,
  months,
  selectedMonth,
  existing,
}: {
  clientId: string;
  accountId: string;
  months: string[];
  selectedMonth: string;
  existing: Snapshot | null;
}) {
  const [newMonth, setNewMonth] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  function onSelectMonth(month: string) {
    setConfirmingDelete(false);
    router.push(`${pathname}?month=${month}`);
  }

  return (
    <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
      <h3 className="mb-3 font-heading text-base font-semibold text-(--paper)">Estados de cuenta cargados</h3>
      <div className="mb-3.5 flex flex-wrap gap-1.5">
        {months.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onSelectMonth(m)}
            className="rounded-full px-2.5 py-1 font-mono text-[11px]"
            style={{
              background: m === selectedMonth ? "transparent" : "var(--panel-2)",
              border: `1px solid ${m === selectedMonth ? "var(--brass)" : "var(--line)"}`,
              color: m === selectedMonth ? "var(--brass)" : "var(--paper-dim)",
            }}
          >
            {m}
          </button>
        ))}
        <input
          type="month"
          value={newMonth}
          onChange={(e) => setNewMonth(e.target.value)}
          className="ml-1"
        />
        {newMonth && !months.includes(newMonth) && (
          <button type="button" className="px-2.5 py-1 text-[11px]" onClick={() => onSelectMonth(newMonth)}>
            + cargar {newMonth}
          </button>
        )}
      </div>

      <form action={(fd) => saveSnapshotManual(clientId, accountId, fd)} className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <input type="hidden" name="month" value={selectedMonth} />
        <label className="block">
          <span className="mb-1 block text-[11px] text-(--muted)">Moneda del estado de cuenta</span>
          <select name="moneda" defaultValue={existing?.moneda ?? "USD"} className="w-full">
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <Field label="Valor actual" name="valorActual" defaultValue={existing?.valorActual} />
        <Field label="Valor inicial del mes" name="valorInicial" defaultValue={existing?.valorInicial} />
        <Field label="Flujos netos (mes)" name="flujosNetos" defaultValue={existing?.flujosNetos} />
        <Field label="Flujos netos YTD" name="flujosNetosYTD" defaultValue={existing?.flujosNetosYTD} />
        {existing?.moneda && existing.moneda !== "USD" && (
          <div className="col-span-full text-[11px] text-(--muted)">
            {existing.tipoCambio
              ? `Tipo de cambio usado (fin de mes): ${existing.tipoCambio.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${existing.moneda}/USD`
              : "No se pudo obtener el tipo de cambio de ese mes — los valores no se están convirtiendo a USD en el consolidado."}
          </div>
        )}
        <div className="col-span-full flex gap-2">
          <button type="submit" disabled={!selectedMonth}>
            Guardar {selectedMonth || "…"}
          </button>
          {existing &&
            (confirmingDelete ? (
              <button
                type="button"
                className="bg-(--brick)"
                onClick={() => {
                  deleteSnapshot(clientId, accountId, selectedMonth).then(() => {
                    setConfirmingDelete(false);
                    router.refresh();
                  });
                }}
              >
                ¿Confirmar borrado de {selectedMonth}?
              </button>
            ) : (
              <button type="button" className="secondary" onClick={() => setConfirmingDelete(true)}>
                Borrar este mes
              </button>
            ))}
        </div>
      </form>
    </div>
  );
}

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue?: number | null }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-(--muted)">{label}</span>
      <input
        type="number"
        step="any"
        name={name}
        defaultValue={defaultValue ?? ""}
        key={defaultValue ?? "empty"}
        className="w-full"
      />
    </label>
  );
}
