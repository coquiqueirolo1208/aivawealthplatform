import { fmtPct, fmtUSD } from "@/lib/format";
import { drawTable } from "./draw-table";

const NAVY: [number, number, number] = [19, 31, 56];
const GOLD: [number, number, number] = [237, 231, 218];
const PAGE_W = 612; // US Letter, points
const PAGE_H = 792;

export interface ConsolidadoPdfData {
  clientName: string;
  total: number;
  mtdBlend: number | null;
  ytdBlend: number | null;
  accounts: Array<{ label: string; month: string | null; valor: number | null; mtd: number | null; ytd: number | null }>;
  allocation: Array<{ tipo: string; valor: number }>;
  positions: Array<{ name: string; total: number; mtd: number | null; ytd: number | null }>;
}

export async function exportConsolidadoToPdf(data: ConsolidadoPdfData) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });

  function pageHeader(title: string, subtitle: string) {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, PAGE_W, 58, "F");
    doc.setTextColor(...GOLD);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(title, 40, 32);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(subtitle, 40, 47);
  }

  pageHeader("AIVA Wealth Platform", `${data.clientName} — Reporte consolidado — ${new Date().toLocaleDateString()}`);
  let y = 90;

  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Resumen", 40, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const summaryLines = [
    `Patrimonio consolidado: ${fmtUSD(data.total)}`,
    `Rentabilidad MTD ponderada: ${fmtPct(data.mtdBlend)}`,
    `Rentabilidad YTD ponderada: ${fmtPct(data.ytdBlend)}`,
  ];
  summaryLines.forEach((line) => {
    doc.text(line, 40, y);
    y += 14;
  });
  y += 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Detalle por cuenta", 40, y);
  y += 8;
  y = drawTable(doc, {
    startY: y,
    head: ["Cuenta", "Mes", "Valor", "MTD", "YTD"],
    rows: data.accounts.map((a) => [a.label, a.month ?? "—", fmtUSD(a.valor), fmtPct(a.mtd), fmtPct(a.ytd)]),
    colWidths: [160, 60, 100, 80, 80],
    pageHeight: PAGE_H,
  });
  y += 20;

  if (y > PAGE_H - 150) {
    doc.addPage();
    y = 40;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Asignación de activos", 40, y);
  y += 8;
  const allocTotal = data.allocation.reduce((s, a) => s + a.valor, 0);
  y = drawTable(doc, {
    startY: y,
    head: ["Tipo", "Valor", "% cartera"],
    rows: data.allocation
      .filter((a) => a.valor > 0)
      .map((a) => [a.tipo, fmtUSD(a.valor), allocTotal ? ((a.valor / allocTotal) * 100).toFixed(1) + "%" : "—"]),
    colWidths: [200, 140, 100],
    pageHeight: PAGE_H,
  });
  y += 20;

  if (y > PAGE_H - 150) {
    doc.addPage();
    y = 40;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Posiciones consolidadas", 40, y);
  y += 8;
  drawTable(doc, {
    startY: y,
    head: ["Activo", "Valor", "MTD", "YTD"],
    rows: data.positions.map((p) => [p.name, fmtUSD(p.total), fmtPct(p.mtd), fmtPct(p.ytd)]),
    colWidths: [220, 120, 80, 80],
    pageHeight: PAGE_H,
  });

  const filename = `AIVA_${data.clientName.replace(/[^a-zA-Z0-9]+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
