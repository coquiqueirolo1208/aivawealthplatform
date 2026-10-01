"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { fmtDate, fmtUSD } from "@/lib/format";
import { markFeeInvoiced, markFeePaid, undoFeeStatus, updateClientFee } from "@/lib/actions/fees";
import type { FeeRow } from "@/lib/queries/fees";
import { SubmitButton } from "@/components/ui/submit-button";
import { useArmedConfirm } from "@/components/ui/use-armed-confirm";

function FeeSettingsForm({ r, onDone, onCancel }: { r: FeeRow; onDone: (error: string | null) => void; onCancel: () => void }) {
  return (
    <form action={async (fd) => onDone((await updateClientFee(r.clientId, fd)).error)} className="flex flex-wrap items-end gap-2">
      <label className="block">
        <span className="mb-0.5 block text-[10.5px] text-(--muted)">% anual</span>
        <input name="feePct" defaultValue={r.feePct ?? ""} inputMode="decimal" placeholder="1,00" className="w-20" autoFocus />
      </label>
      <label className="block">
        <span className="mb-0.5 block text-[10.5px] text-(--muted)">Mínimo anual USD (opcional)</span>
        <input name="feeMinAnnual" defaultValue={r.feeMinAnnual ?? ""} inputMode="decimal" className="w-28" />
      </label>
      <SubmitButton pendingText="Guardando…">Guardar</SubmitButton>
      <button type="button" className="secondary" onClick={onCancel}>
        Cancelar
      </button>
    </form>
  );
}

const pctLabel = (n: number | null) => (n == null ? "—" : `${n.toLocaleString("es-UY", { maximumFractionDigits: 2 })}%`);

export function FeesTable({ rows, quarter, quarterLabel }: { rows: FeeRow[]; quarter: string; quarterLabel: string }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [pending, startTransition] = useTransition();
  const confirm = useArmedConfirm<string>();

  const configured = rows.filter((r) => r.feePct != null || r.record);
  const unconfigured = rows.filter((r) => r.feePct == null && !r.record);

  const run = (fn: () => Promise<{ error: string | null }>) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (res.error) setError(res.error);
    });

  const settingsForm = (r: FeeRow) => (
    <FeeSettingsForm
      r={r}
      onDone={(err) => {
        setError(err);
        if (!err) setEditing(null);
      }}
      onCancel={() => setEditing(null)}
    />
  );

  return (
    <div className="rounded-[10px] border border-(--line) bg-(--panel) p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-base font-semibold text-(--paper)">Honorarios por cliente — {quarterLabel}</h3>
        <button
          type="button"
          className="secondary"
          disabled={exporting || !rows.length}
          onClick={async () => {
            setExporting(true);
            try {
              const { exportFeesToExcel } = await import("@/lib/xlsx/export-fees");
              await exportFeesToExcel(rows, quarterLabel, `Honorarios_${quarter}.xlsx`);
            } finally {
              setExporting(false);
            }
          }}
        >
          {exporting ? "Exportando…" : "Exportar a Excel"}
        </button>
      </div>
      {error && <div className="mb-2 text-[12px] font-semibold text-(--brick)">{error}</div>}

      {configured.length === 0 ? (
        <div className="p-6 text-center text-[13px] text-(--muted)">
          Todavía no configuraste el honorario de ningún cliente. Hacelo abajo, en &ldquo;Sin honorario configurado&rdquo;.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-(--muted)">
                <th className="text-left">Cliente</th>
                <th className="text-right">% anual</th>
                <th className="text-right">AUM base</th>
                <th className="text-right">Honorario</th>
                <th className="text-left">Estado</th>
                <th className="text-right"></th>
              </tr>
            </thead>
            <tbody>
              {configured.map((r) => {
                const rec = r.record;
                return (
                  <tr key={r.clientId} className="border-t border-(--line) align-top">
                    <td className="py-2">
                      <Link href={`/clientes/${r.clientId}`} className="text-(--paper) hover:underline">
                        {r.name}
                      </Link>
                      {editing === r.clientId && (
                        <div className="mt-2">{settingsForm(r)}</div>
                      )}
                    </td>
                    <td className="py-2 text-right font-mono text-(--paper-dim)">
                      {pctLabel(rec?.feePct ?? r.feePct)}
                      {r.feeMinAnnual ? <div className="text-[10.5px] text-(--muted)">mín. {fmtUSD(r.feeMinAnnual)}/año</div> : null}
                      {editing !== r.clientId && (
                        <button type="button" className="mt-0.5 bg-transparent p-0 text-[10.5px] text-(--brass) underline" onClick={() => setEditing(r.clientId)}>
                          editar
                        </button>
                      )}
                    </td>
                    <td className="py-2 text-right font-mono text-(--paper-dim)">
                      {fmtUSD(rec?.baseAum ?? r.baseAum)}
                      {!rec && r.baseAum != null && r.monthsUsed < 3 && (
                        <div className="text-[10.5px] text-(--brass)">promedio de {r.monthsUsed}/3 meses</div>
                      )}
                      {!rec && r.baseAum == null && <div className="text-[10.5px] text-(--muted)">sin estados en el trimestre</div>}
                    </td>
                    <td className="py-2 text-right font-mono font-semibold text-(--paper)">
                      {rec ? fmtUSD(rec.amount) : fmtUSD(r.estimate)}
                      {!rec && r.minimumApplied && <div className="text-[10.5px] font-normal text-(--muted)">aplica mínimo</div>}
                    </td>
                    <td className="py-2">
                      {!rec ? (
                        <span className="text-(--muted)">Pendiente</span>
                      ) : rec.status === "facturado" ? (
                        <span className="text-(--brass)">Facturado {fmtDate(rec.invoicedAt)}</span>
                      ) : (
                        <span className="text-(--teal)">Cobrado {fmtDate(rec.paidAt)}</span>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {!rec ? (
                        r.estimate != null && (
                          <form
                            action={async (fd) => {
                              const res = await markFeeInvoiced(r.clientId, quarter, r.baseAum, r.feePct, fd);
                              setError(res.error);
                            }}
                            className="flex items-center justify-end gap-1.5"
                          >
                            <input
                              name="amount"
                              defaultValue={Math.round(r.estimate)}
                              inputMode="decimal"
                              className="w-24 text-right"
                              aria-label="Monto a facturar"
                            />
                            <SubmitButton className="px-2.5 py-1 text-[11px]" pendingText="…">
                              Facturar
                            </SubmitButton>
                          </form>
                        )
                      ) : (
                        <div className="flex justify-end gap-1.5">
                          {rec.status === "facturado" && (
                            <button type="button" className="px-2.5 py-1 text-[11px]" disabled={pending} onClick={() => run(() => markFeePaid(rec.id))}>
                              Cobrado
                            </button>
                          )}
                          {confirm.armed === rec.id ? (
                            <button
                              type="button"
                              className="bg-(--brick) px-2.5 py-1 text-[11px]"
                              disabled={pending}
                              onClick={() => {
                                if (!confirm.ready()) return;
                                confirm.disarm();
                                run(() => undoFeeStatus(rec.id));
                              }}
                            >
                              {rec.status === "cobrado" ? "¿Volver a facturado?" : "¿Anular factura?"}
                            </button>
                          ) : (
                            <button type="button" className="secondary px-2.5 py-1 text-[11px]" onClick={() => confirm.arm(rec.id)}>
                              Deshacer
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {unconfigured.length > 0 && (
        <details className="mt-4 border-t border-(--line) pt-3" open={configured.length === 0}>
          <summary className="cursor-pointer text-[12.5px] font-semibold text-(--paper)">
            Sin honorario configurado ({unconfigured.length})
          </summary>
          <div className="mt-2">
            {unconfigured.map((r) => (
              <div key={r.clientId} className="flex flex-wrap items-center justify-between gap-2 border-t border-(--line) py-2 first:border-t-0">
                <Link href={`/clientes/${r.clientId}`} className="text-[12.5px] text-(--paper) hover:underline">
                  {r.name}
                  <span className="ml-2 font-mono text-[11px] text-(--muted)">AUM base {fmtUSD(r.baseAum)}</span>
                </Link>
                {editing === r.clientId ? (
                  settingsForm(r)
                ) : (
                  <button type="button" className="secondary px-2.5 py-1 text-[11px]" onClick={() => setEditing(r.clientId)}>
                    Configurar honorario
                  </button>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
