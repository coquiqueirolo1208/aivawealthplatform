// Renders a sample report to disk when REPORT_PREVIEW_OUT is set (for eyeballing the
// layout); otherwise just checks the PDF builds and paginates without throwing.
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { jsPDF } from "jspdf";
import type { Snapshot } from "@/lib/finance/types";
import { buildClientReportData } from "@/lib/reports/client-report";
import { buildClientReportPdf } from "./client-report";

function snap(valorActual: number, holdings: Array<[string, number]>, extra: Partial<Snapshot> = {}): Snapshot {
  return {
    valorActual,
    valorInicial: valorActual * 0.99,
    flujosNetos: 0,
    flujosNetosYTD: 25000,
    costosMes: 900,
    asignacion: [
      { tipo: "Renta Variable", valor: valorActual * 0.55 },
      { tipo: "Renta Fija", valor: valorActual * 0.3 },
      { tipo: "Cash", valor: valorActual * 0.15 },
    ],
    holdings: holdings.map(([nombre, valor]) => ({ nombre, valor, retornoPct: null })),
    ...extra,
  };
}

const months = ["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"];
const names = Array.from({ length: 22 }, (_, i) => `Fondo de inversión global de ejemplo número ${i + 1} - clase institucional acumulativa`);

describe("buildClientReportPdf", () => {
  it("builds a multi-page report", () => {
    const accounts = ["Pershing", "UBS Switzerland", "Morgan Stanley"].map((custodian, ai) => ({
      id: String(ai),
      label: `${custodian} - Cuenta principal`,
      custodian,
      snapshots: Object.fromEntries(
        months.map((m, i) => {
          const v = 1_000_000 * (ai + 1) * (1 + i * 0.012 - (i === 6 ? 0.03 : 0));
          return [m, snap(v, names.slice(ai * 7, ai * 7 + 8 + (i % 2)).map((n, k) => [n, v / (k + 3)]))];
        }),
      ),
    }));
    const data = buildClientReportData("Familia Bianchi Rodríguez", accounts, "2026-08", {
      levels: { "2025-12": { msci: 100, agg: 100 }, "2026-07": { msci: 108, agg: 101 }, "2026-08": { msci: 110, agg: 101.5 } },
      weightsByMonth: {},
    });
    const doc = buildClientReportPdf(jsPDF, data, {
      advisorName: "Andrés Queirolo",
      logo: null,
      comment:
        "Durante el trimestre aumentamos la exposición a renta fija de corto plazo y redujimos la concentración en tecnología. " +
        "Seguimos con una visión prudente para el cierre del año.",
      sections: { evolucion: true, asignacion: true, cuentas: true, posiciones: true, movimientos: true },
      generatedOn: "2026-10-01",
    });
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
    if (process.env.REPORT_PREVIEW_OUT) writeFileSync(process.env.REPORT_PREVIEW_OUT, Buffer.from(doc.output("arraybuffer")));
  });
});
