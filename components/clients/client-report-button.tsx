"use client";

import { useState } from "react";
import { getClientReport } from "@/lib/actions/client-report";
import type { ReportSections } from "@/lib/pdf/client-report";

const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const monthLabel = (ym: string) => `${MONTHS_ES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

const SECTION_LABELS: Record<keyof ReportSections, string> = {
  evolucion: "Evolución del patrimonio",
  asignacion: "Asignación de activos",
  cuentas: "Detalle por cuenta",
  posiciones: "Principales posiciones",
  movimientos: "Cambios de cartera del mes",
};

/** Fetches the advisor's logo and converts it to a data URL jsPDF can embed. */
async function fetchLogo(url: string): Promise<{ dataUrl: string; format: "PNG" | "JPEG" } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const format = blob.type.includes("png") ? "PNG" : /jpe?g/.test(blob.type) ? "JPEG" : null;
    if (!format) return null;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return { dataUrl, format };
  } catch {
    return null; // a missing/expired logo shouldn't block the report
  }
}

export function ClientReportButton({ clientId, months }: { clientId: string; months: string[] }) {
  const [open, setOpen] = useState(false);
  const [asOf, setAsOf] = useState(months[0] ?? "");
  const [comment, setComment] = useState("");
  const [sections, setSections] = useState<ReportSections>({
    evolucion: true,
    asignacion: true,
    cuentas: true,
    posiciones: true,
    movimientos: true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await getClientReport(clientId, asOf);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const [{ jsPDF }, { buildClientReportPdf, clientReportFilename }, { todayIso }, logo] = await Promise.all([
        import("jspdf"),
        import("@/lib/pdf/client-report"),
        import("@/lib/dates"),
        res.logoUrl ? fetchLogo(res.logoUrl) : Promise.resolve(null),
      ]);
      const doc = buildClientReportPdf(jsPDF, res.data, {
        advisorName: res.advisorName,
        logo,
        comment,
        sections,
        generatedOn: todayIso(),
      });
      doc.save(clientReportFilename(res.data));
      setOpen(false);
    } catch (e) {
      console.error(e);
      setError("No se pudo generar el PDF. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="secondary" disabled={!months.length} onClick={() => setOpen(true)}>
        Reporte para el cliente (PDF)
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[2200] flex items-center justify-center p-5"
          style={{ background: "rgba(19,31,56,0.65)" }}
          onClick={(e) => e.target === e.currentTarget && !busy && setOpen(false)}
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[10px] p-5" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
            <h3 className="m-0 mb-3 font-heading text-base font-semibold text-(--paper)">Reporte para el cliente</h3>

            <label className="mb-3 block">
              <span className="mb-1 block text-[11px] text-(--muted)">Fecha de corte</span>
              <select value={asOf} onChange={(e) => setAsOf(e.target.value)} className="w-full">
                {months.map((m) => (
                  <option key={m} value={m}>
                    {monthLabel(m)}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] text-(--muted)">
                Usa los estados de cuenta hasta ese mes: sirve para mandar el cierre de un trimestre aunque ya cargaste meses posteriores.
              </span>
            </label>

            <fieldset className="mb-3">
              <span className="mb-1 block text-[11px] text-(--muted)">Secciones</span>
              {(Object.keys(SECTION_LABELS) as Array<keyof ReportSections>).map((k) => (
                <label key={k} className="flex items-center gap-2 py-0.5 text-[12.5px] text-(--paper-dim)">
                  <input type="checkbox" checked={sections[k]} onChange={(e) => setSections((s) => ({ ...s, [k]: e.target.checked }))} />
                  {SECTION_LABELS[k]}
                </label>
              ))}
              <span className="mt-1 block text-[11px] text-(--muted)">Los indicadores principales y las notas se incluyen siempre.</span>
            </fieldset>

            <label className="mb-3 block">
              <span className="mb-1 block text-[11px] text-(--muted)">Comentario del asesor (opcional)</span>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={1200}
                placeholder="Ej.: Durante el trimestre aumentamos la exposición a renta fija de corto plazo…"
                className="w-full"
              />
            </label>

            {error && <div className="mb-2 text-[12px] font-semibold text-(--brick)">{error}</div>}
            <div className="flex justify-end gap-2">
              <button type="button" className="secondary" disabled={busy} onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button type="button" disabled={busy || !asOf} onClick={generate}>
                {busy ? "Generando…" : "Generar PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
