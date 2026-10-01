"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtCurrency, fmtPct } from "@/lib/format";
import { saveExtractedSnapshot, createAccountAndSaveSnapshot, type ExtractedStatement } from "@/lib/actions/bulk-upload";
import { matchAccountByCustodian, type CustodianMatchAccount } from "@/lib/finance/custodian";

export interface BulkAccountOption {
  id: string;
  label: string;
  custodian: string | null;
  accountNumber: string | null;
  /** Months this account already has a statement for — saving one of these replaces it. */
  months: string[];
}

type Status = "analyzing" | "ready" | "saving" | "saved" | "error";

const STATUS_LABEL: Record<Status, string> = {
  analyzing: "analizando…",
  ready: "listo para guardar",
  saving: "guardando…",
  saved: "guardado ✓",
  error: "error",
};

interface Row {
  // Keyed by position, not file name: two files both named "statement.pdf" collided.
  id: number;
  fileName: string;
  status: Status;
  extraction?: ExtractedStatement & { custodioDetectado?: string };
  chosenAccountId: string; // existing account id, or "__new__"
  errorMsg?: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function BulkUploadCard({ clientId, accounts }: { clientId: string; accounts: BulkAccountOption[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  function updateRow(id: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function analyze() {
    setAnalyzing(true);
    setRows(files.map((f, i) => ({ id: i, fileName: f.name, status: "analyzing", chosenAccountId: "" })));
    for (const [i, file] of files.entries()) {
      try {
        const fileBase64 = await fileToBase64(file);
        const res = await fetch("/api/ai/extract-statement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountLabel: null, month: null, fileName: file.name, fileBase64, mediaType: file.type }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ? `Error de extracción: ${body.error}` : `Error de extracción (${res.status})`);
        }
        const extraction = await res.json();
        const matched = matchAccountByCustodian(
          { numeroCuenta: extraction.numeroCuenta, custodioDetectado: extraction.custodioDetectado },
          accounts,
        );
        updateRow(i, { status: "ready", extraction, chosenAccountId: matched ?? "__new__" });
      } catch (e) {
        updateRow(i, { status: "error", errorMsg: (e as Error).message });
      }
    }
    setAnalyzing(false);
  }

  async function saveAll() {
    setSaving(true);
    // Accounts created earlier in this same batch: two months from a custodian the
    // client didn't have yet used to create two separate accounts.
    const created: CustodianMatchAccount[] = [];
    for (const row of rows) {
      if (row.status !== "ready" || !row.extraction) continue;
      const ex = row.extraction;
      updateRow(row.id, { status: "saving" });
      try {
        let targetId = row.chosenAccountId;
        if (targetId === "__new__") {
          targetId = matchAccountByCustodian({ numeroCuenta: ex.numeroCuenta, custodioDetectado: ex.custodioDetectado }, created) ?? "__new__";
        }
        const result =
          targetId === "__new__"
            ? await createAccountAndSaveSnapshot(clientId, ex.custodioDetectado || "Nueva cuenta", ex)
            : await saveExtractedSnapshot(clientId, targetId, ex);
        if (!result.ok) {
          updateRow(row.id, { status: "error", errorMsg: result.error });
          continue;
        }
        if (targetId === "__new__") {
          const name = ex.custodioDetectado || "Nueva cuenta";
          created.push({ id: result.accountId, label: name, custodian: name, accountNumber: ex.numeroCuenta ?? null });
        }
        updateRow(row.id, { status: "saved" });
      } catch {
        updateRow(row.id, { status: "error", errorMsg: "No se pudo guardar. Probá de nuevo." });
      }
    }
    setSaving(false);
    router.refresh();
  }

  const anyReady = rows.some((r) => r.status === "ready");
  const anyMock = rows.some((r) => r.extraction?._mock);

  return (
    <div className="rounded-[10px] border border-dashed border-(--line) bg-(--panel) p-5">
      <h3 className="mb-1 font-heading text-base font-semibold text-(--paper)">Carga masiva de estados de cuenta</h3>
      <p className="mb-3 text-[12px] text-(--muted)">
        Subí varios estados de cuenta a la vez — la IA detecta custodio, mes y cifras, y los asigna a la cuenta
        correspondiente (o creá una cuenta nueva).
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          multiple
          accept="application/pdf,image/*"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
        <button type="button" disabled={!files.length || analyzing} onClick={analyze}>
          {analyzing ? "Analizando…" : "Analizar"}
        </button>
      </div>

      {anyMock && (
        <div
          className="mt-3 rounded-md px-3 py-2 text-[12px] font-semibold"
          style={{ background: "var(--panel-2)", border: "1px solid var(--brick)", color: "var(--brick)" }}
        >
          ⚠ Modo demo — no hay una clave de IA configurada (ANTHROPIC_API_KEY), así que estos son datos de ejemplo,
          no una lectura real de los archivos. No se pueden guardar.
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-(--muted)">
                <th className="text-left">Archivo</th>
                <th className="text-left">Custodio / mes</th>
                <th className="text-right">Valor</th>
                <th className="text-right">Depósitos año</th>
                <th className="text-right">Rend. año</th>
                <th className="text-left">Cuenta destino</th>
                <th className="text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const ex = row.extraction;
                const target = accounts.find((a) => a.id === row.chosenAccountId);
                const replaces = !!ex && !!target && target.months.includes(ex.mes);
                return (
                  <tr key={row.id} className="border-t border-(--line)">
                    <td className="py-1.5 text-(--paper)">{row.fileName}</td>
                    <td className="text-(--paper-dim)">
                      {ex
                        ? `${ex.custodioDetectado ?? "—"} · ${ex.mes}` +
                          (ex.numeroCuenta ? ` · ${ex.numeroCuenta}` : "") +
                          (ex.moneda && ex.moneda !== "USD" ? ` · ${ex.moneda}` : "")
                        : "—"}
                    </td>
                    <td className="text-right font-mono text-(--paper-dim)">{ex ? fmtCurrency(ex.valorActual, ex.moneda) : "—"}</td>
                    <td className="text-right font-mono text-(--paper-dim)">{ex ? fmtCurrency(ex.flujosNetosYTD, ex.moneda) : "—"}</td>
                    <td className="text-right font-mono text-(--paper-dim)">{ex ? fmtPct(ex.rentYTD) : "—"}</td>
                    <td>
                      {row.status === "ready" ? (
                        <>
                          <select value={row.chosenAccountId} onChange={(e) => updateRow(row.id, { chosenAccountId: e.target.value })}>
                            <option value="__new__">+ Crear cuenta nueva{ex?.custodioDetectado ? `: ${ex.custodioDetectado}` : ""}</option>
                            {accounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.label}
                              </option>
                            ))}
                          </select>
                          {replaces && <div className="text-[11px] font-semibold text-(--brick)">⚠ reemplaza {ex!.mes}</div>}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="text-(--muted)">
                      {row.status === "error" ? <span className="text-(--brick)">{row.errorMsg}</span> : STATUS_LABEL[row.status]}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {anyReady && (
        <button type="button" className="mt-3.5" disabled={saving || anyMock} onClick={saveAll}>
          {saving ? "Guardando…" : "Guardar todo"}
        </button>
      )}
    </div>
  );
}
