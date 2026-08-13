"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtUSD } from "@/lib/format";
import { saveExtractedSnapshot, createAccountAndSaveSnapshot, type ExtractedStatement } from "@/lib/actions/bulk-upload";

export interface BulkAccountOption {
  id: string;
  label: string;
  custodian: string | null;
}

interface Row {
  fileName: string;
  status: "pending" | "analyzing" | "ready" | "saving" | "saved" | "error";
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

function matchAccountByCustodian(detected: string | undefined, accounts: BulkAccountOption[]): string | null {
  if (!detected) return null;
  const key = detected.toLowerCase();
  const matches = accounts.filter(
    (a) => a.label.toLowerCase().includes(key) || key.includes(a.label.toLowerCase()) || (a.custodian && (a.custodian.toLowerCase().includes(key) || key.includes(a.custodian.toLowerCase()))),
  );
  return matches.length === 1 ? matches[0].id : null;
}

export function BulkUploadCard({ clientId, accounts }: { clientId: string; accounts: BulkAccountOption[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function analyze() {
    setAnalyzing(true);
    setRows(files.map((f) => ({ fileName: f.name, status: "analyzing", chosenAccountId: "" })));
    const results: Row[] = [];
    for (const file of files) {
      try {
        const fileBase64 = await fileToBase64(file);
        const res = await fetch("/api/ai/extract-statement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountLabel: null, month: null, fileName: file.name, fileBase64, mediaType: file.type }),
        });
        if (!res.ok) throw new Error(`Error de extracción (${res.status})`);
        const extraction = await res.json();
        const matched = matchAccountByCustodian(extraction.custodioDetectado, accounts);
        results.push({
          fileName: file.name,
          status: "ready",
          extraction,
          chosenAccountId: matched ?? "__new__",
        });
      } catch (e) {
        results.push({ fileName: file.name, status: "error", chosenAccountId: "", errorMsg: (e as Error).message });
      }
      setRows([...results, ...files.slice(results.length).map((f) => ({ fileName: f.name, status: "analyzing" as const, chosenAccountId: "" }))]);
    }
    setAnalyzing(false);
  }

  async function saveAll() {
    setSaving(true);
    for (const row of rows) {
      if (row.status !== "ready" || !row.extraction) continue;
      setRows((prev) => prev.map((r) => (r.fileName === row.fileName ? { ...r, status: "saving" } : r)));
      try {
        if (row.chosenAccountId === "__new__") {
          await createAccountAndSaveSnapshot(clientId, row.extraction.custodioDetectado || "Nueva cuenta", row.extraction);
        } else {
          await saveExtractedSnapshot(clientId, row.chosenAccountId, row.extraction);
        }
        setRows((prev) => prev.map((r) => (r.fileName === row.fileName ? { ...r, status: "saved" } : r)));
      } catch (e) {
        setRows((prev) =>
          prev.map((r) => (r.fileName === row.fileName ? { ...r, status: "error", errorMsg: (e as Error).message } : r)),
        );
      }
    }
    setSaving(false);
    router.refresh();
  }

  const anyReady = rows.some((r) => r.status === "ready");

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

      {rows.length > 0 && (
        <table className="mt-4 w-full text-[12.5px]">
          <thead>
            <tr className="text-(--muted)">
              <th className="text-left">Archivo</th>
              <th className="text-left">Custodio / mes</th>
              <th className="text-right">Valor</th>
              <th className="text-left">Cuenta destino</th>
              <th className="text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.fileName} className="border-t border-(--line)">
                <td className="py-1.5 text-(--paper)">{row.fileName}</td>
                <td className="text-(--paper-dim)">
                  {row.extraction ? `${row.extraction.custodioDetectado ?? "—"} · ${row.extraction.mes}` : "—"}
                </td>
                <td className="text-right font-mono text-(--paper-dim)">
                  {row.extraction ? fmtUSD(row.extraction.valorActual) : "—"}
                </td>
                <td>
                  {row.status === "ready" ? (
                    <select
                      value={row.chosenAccountId}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((r) => (r.fileName === row.fileName ? { ...r, chosenAccountId: e.target.value } : r)),
                        )
                      }
                    >
                      <option value="__new__">
                        + Crear cuenta nueva{row.extraction?.custodioDetectado ? `: ${row.extraction.custodioDetectado}` : ""}
                      </option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="text-(--muted)">
                  {row.status === "error" ? <span className="text-(--brick)">{row.errorMsg}</span> : row.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {anyReady && (
        <button type="button" className="mt-3.5" disabled={saving} onClick={saveAll}>
          {saving ? "Guardando…" : "Guardar todo"}
        </button>
      )}
    </div>
  );
}
