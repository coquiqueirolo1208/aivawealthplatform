import ExcelJS from "exceljs";
import { PROSPECT_STAGES } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import type { Prospect } from "@/lib/queries/prospects";

const STAGE_LABELS = new Map<string, string>(PROSPECT_STAGES);

/** Builds a .xlsx workbook from a list of prospects and triggers a browser download. Client-side only. */
export async function exportProspectsToExcel(prospects: Prospect[], filename: string) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Prospectos");
  sheet.columns = [
    { header: "Nombre", key: "name", width: 28 },
    { header: "Empresa / ocupación", key: "empresa", width: 28 },
    { header: "Fuente", key: "fuente", width: 22 },
    { header: "AUM estimado (USD)", key: "aum", width: 18 },
    { header: "Etapa", key: "stage", width: 16 },
    { header: "Próxima acción", key: "proximaAccion", width: 30 },
    { header: "Próxima fecha", key: "proximaFecha", width: 16 },
    { header: "Notas", key: "notas", width: 40 },
    { header: "Creado", key: "createdAt", width: 16 },
  ];
  sheet.getRow(1).font = { bold: true };

  prospects.forEach((p) => {
    sheet.addRow({
      name: p.name,
      empresa: p.empresa ?? "",
      fuente: p.fuente ?? "",
      aum: p.aumEstimado ?? "",
      stage: STAGE_LABELS.get(p.stage) ?? p.stage,
      proximaAccion: p.proximaAccion ?? "",
      proximaFecha: p.proximaFecha ? fmtDate(p.proximaFecha) : "",
      notas: p.notas ?? "",
      createdAt: fmtDate(p.createdAt),
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
