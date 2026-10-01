"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveExtractedSnapshot, type ExtractedStatement } from "@/lib/actions/bulk-upload";
import { CURRENCIES } from "@/lib/constants";
import { custodianNamesMatch } from "@/lib/finance/custodian";

type Extraction = ExtractedStatement & { custodioDetectado?: string };
type NumericKey = "valorActual" | "valorInicial" | "flujosNetos" | "flujosNetosYTD" | "costosMes" | "rentMTD" | "rentYTD";

// Every figure that drives the displayed returns is shown for review — previously only
// month/currency/value were, so a misread withdrawal or return was saved unseen.
const REVIEW_FIELDS: Array<{ key: NumericKey; label: string }> = [
  { key: "valorActual", label: "Valor actual" },
  { key: "valorInicial", label: "Valor inicial del mes" },
  { key: "flujosNetos", label: "Depósitos/retiros del mes" },
  { key: "flujosNetosYTD", label: "Depósitos/retiros del año" },
  { key: "costosMes", label: "Costos del mes" },
  { key: "rentMTD", label: "Rendimiento del mes (%)" },
  { key: "rentYTD", label: "Rendimiento del año (%)" },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function AccountStatementUpload({
  clientId,
  accountId,
  accountLabel,
  existingMonths,
}: {
  clientId: string;
  accountId: string;
  accountLabel: string;
  /** Months this account already has a statement for — saving one of these replaces it. */
  existingMonths: string[];
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    try {
      const fileBase64 = await fileToBase64(file);
      const res = await fetch("/api/ai/extract-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountLabel, month: null, fileName: file.name, fileBase64, mediaType: file.type }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ? `Error de extracción: ${body.error}` : `Error de extracción (${res.status})`);
      }
      setExtraction(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function save() {
    if (!extraction) return;
    setSaving(true);
    setError(null);
    try {
      const result = await saveExtractedSnapshot(clientId, accountId, extraction);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setExtraction(null);
      setFile(null);
      router.refresh();
    } catch {
      setError("No se pudo guardar el estado de cuenta. Probá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  function setNumber(key: NumericKey, raw: string) {
    if (!extraction) return;
    setExtraction({ ...extraction, [key]: raw === "" ? null : Number(raw) });
  }

  const replaces = !!extraction && existingMonths.includes(extraction.mes);

  return (
    <div className="mb-4 rounded-[10px] border border-dashed border-(--line) bg-(--panel) p-5">
      <h3 className="mb-1 font-heading text-base font-semibold text-(--paper)">Subir estado de cuenta</h3>
      <p className="mb-3 text-[12px] text-(--muted)">
        La IA detecta custodio, mes, moneda y cifras del PDF/imagen. Revisá los datos antes de guardar — si preferís,
        cargalos manualmente abajo en vez de subir un archivo.
      </p>

      {!extraction ? (
        <div className="flex flex-wrap items-center gap-2">
          <input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button type="button" disabled={!file || analyzing} onClick={analyze}>
            {analyzing ? "Analizando…" : "Analizar"}
          </button>
        </div>
      ) : (
        <div>
          {extraction._mock && (
            <div
              className="mb-3 rounded-md px-3 py-2 text-[12px] font-semibold"
              style={{ background: "var(--panel-2)", border: "1px solid var(--brick)", color: "var(--brick)" }}
            >
              ⚠ Modo demo — no hay una clave de IA configurada (ANTHROPIC_API_KEY), así que esto es un dato de ejemplo,
              no una lectura real del PDF. No se puede guardar: cargá los valores a mano abajo.
            </div>
          )}
          {extraction.custodioDetectado && (
            <div className="mb-3 text-[12px] text-(--muted)">
              Custodio detectado: <strong className="text-(--paper)">{extraction.custodioDetectado}</strong>
              {extraction.numeroCuenta && <> · cuenta {extraction.numeroCuenta}</>}
              {!custodianNamesMatch(extraction.custodioDetectado, accountLabel) && (
                <span className="ml-1.5 font-semibold text-(--brick)">
                  ⚠ no coincide con &quot;{accountLabel}&quot; — verificá que sea el archivo correcto
                </span>
              )}
            </div>
          )}
          <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[11px] text-(--muted)">Mes</span>
              <input
                type="month"
                value={extraction.mes}
                onChange={(e) => setExtraction({ ...extraction, mes: e.target.value })}
                className="w-full"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] text-(--muted)">Moneda</span>
              <select
                value={extraction.moneda ?? "USD"}
                onChange={(e) => setExtraction({ ...extraction, moneda: e.target.value })}
                className="w-full"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            {REVIEW_FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="mb-1 block text-[11px] text-(--muted)">{f.label}</span>
                <input
                  type="number"
                  step="any"
                  value={extraction[f.key] ?? ""}
                  onChange={(e) => setNumber(f.key, e.target.value)}
                  className="w-full"
                />
              </label>
            ))}
          </div>
          <div className="mb-3 text-[11px] text-(--muted)">
            {extraction.holdings?.length ?? 0} posiciones detectadas · {extraction.asignacion?.length ?? 0} clases de activo
          </div>
          {replaces && (
            <div className="mb-3 text-[12px] font-semibold text-(--brick)">
              ⚠ Ya hay un estado de cuenta de {extraction.mes} en esta cuenta — al guardar se reemplaza.
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" disabled={saving || !!extraction._mock} onClick={save}>
              {saving ? "Guardando…" : `${replaces ? "Reemplazar" : "Guardar"} ${extraction.mes}`}
            </button>
            <button type="button" className="secondary" onClick={() => setExtraction(null)}>
              Descartar y volver a intentar
            </button>
          </div>
        </div>
      )}
      {error && <div className="mt-2 text-[12px] text-(--brick)">{error}</div>}
    </div>
  );
}
