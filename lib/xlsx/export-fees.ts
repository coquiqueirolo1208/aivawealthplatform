import ExcelJS from "exceljs";
import { fmtDate } from "@/lib/format";
import type { FeeRow } from "@/lib/queries/fees";

const STATUS_LABEL = { facturado: "Facturado", cobrado: "Cobrado" } as const;

/** Builds a .xlsx of one quarter's fees and triggers a browser download. Client-side only. */
export async function exportFeesToExcel(rows: FeeRow[], quarterLabel: string, filename: string) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(`Honorarios ${quarterLabel}`);
  sheet.columns = [
    { header: "Cliente", key: "name", width: 30 },
    { header: "% anual", key: "pct", width: 10 },
    { header: "Mínimo anual (USD)", key: "min", width: 18 },
    { header: "AUM base (USD)", key: "base", width: 18 },
    { header: "Meses con datos", key: "months", width: 15 },
    { header: "Honorario (USD)", key: "amount", width: 16 },
    { header: "Estado", key: "status", width: 12 },
    { header: "Facturado el", key: "invoiced", width: 14 },
    { header: "Cobrado el", key: "paid", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const k of ["base", "amount", "min"]) sheet.getColumn(k).numFmt = "#,##0";

  rows.forEach((r) => {
    sheet.addRow({
      name: r.name,
      pct: r.record?.feePct ?? r.feePct ?? "",
      min: r.feeMinAnnual ?? "",
      base: Math.round(r.record?.baseAum ?? r.baseAum ?? 0) || "",
      months: r.record ? "" : `${r.monthsUsed}/3`,
      amount: r.record ? r.record.amount : r.estimate != null ? Math.round(r.estimate) : "",
      status: r.record ? STATUS_LABEL[r.record.status] : r.feePct == null ? "Sin configurar" : "Pendiente",
      invoiced: r.record ? fmtDate(r.record.invoicedAt) : "",
      paid: r.record?.paidAt ? fmtDate(r.record.paidAt) : "",
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
