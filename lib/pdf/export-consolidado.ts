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
  y1Blend: number | null;
  accounts: Array<{ label: string; month: string | null; valor: number | null; mtd: number | null; ytd: number | null; y1: number | null }>;
  allocation: Array<{ tipo: string; valor: number }>;
  positions: Array<{ name: string; total: number; mtd: number | null; ytd: number | null }>;
  /** Signed Supabase Storage URL for the exporting advisor's own logo, if they uploaded one. */
  logoUrl?: string | null;
}

/** Fetches the advisor's logo and converts it to a data URL jsPDF's addImage can embed. */
async function fetchLogoForPdf(url: string): Promise<{ dataUrl: string; format: "PNG" | "JPEG" } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const format = blob.type.includes("png") ? "PNG" : blob.type.includes("jpeg") || blob.type.includes("jpg") ? "JPEG" : null;
    if (!format) return null;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return { dataUrl, format };
  } catch {
    return null; // missing/expired logo shouldn't block the export
  }
}

export async function exportConsolidadoToPdf(data: ConsolidadoPdfData) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const logo = data.logoUrl ? await fetchLogoForPdf(data.logoUrl) : null;

  const headerH = logo ? 84 : 58;

  function pageHeader(title: string, subtitle: string) {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, PAGE_W, headerH, "F");

    let textX = 40;
    if (logo) {
      // Fit within a bounding box rather than forcing a fixed size, so the advisor's
      // actual logo shape (wide wordmark, square mark, etc.) isn't distorted.
      const props = doc.getImageProperties(logo.dataUrl);
      const maxW = 140;
      const maxH = headerH - 24;
      const scale = Math.min(maxW / props.width, maxH / props.height);
      const w = props.width * scale;
      const h = props.height * scale;
      doc.addImage(logo.dataUrl, logo.format, 30, (headerH - h) / 2, w, h, undefined, "FAST");
      textX = 30 + w + 20;
    }

    doc.setTextColor(...GOLD);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(title, textX, logo ? 42 : 32);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(subtitle, textX, logo ? 60 : 47);
  }

  pageHeader("AIVA Wealth Platform", `${data.clientName} — Reporte consolidado — ${new Date().toLocaleDateString()}`);
  let y = headerH + 32;

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
    `Rentabilidad 1 año ponderada: ${fmtPct(data.y1Blend)}`,
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
    head: ["Cuenta", "Mes", "Valor", "MTD", "YTD", "1A"],
    rows: data.accounts.map((a) => [a.label, a.month ?? "—", fmtUSD(a.valor), fmtPct(a.mtd), fmtPct(a.ytd), fmtPct(a.y1)]),
    colWidths: [140, 55, 90, 70, 70, 70],
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

  const footerY = PAGE_H - 24;
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text("Powered by AIVA Wealth", 40, footerY);
  }

  const filename = `AIVA_${data.clientName.replace(/[^a-zA-Z0-9]+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
