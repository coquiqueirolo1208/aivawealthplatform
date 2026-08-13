import type { jsPDF } from "jspdf";

// Hand-rolled table renderer (no plugin), ported in spirit from the original
// app's drawTable: manual column widths, row-height pagination, zebra striping,
// bold header row, +/- percentage cells colored green/red.
export interface DrawTableOptions {
  startY: number;
  head: string[];
  rows: string[][];
  colWidths: number[];
  pageHeight: number;
  marginX?: number;
}

const NAVY: [number, number, number] = [19, 31, 56];
const GREEN: [number, number, number] = [26, 122, 76];
const RED: [number, number, number] = [176, 52, 31];
const ROW_H = 16;

export function drawTable(doc: jsPDF, opts: DrawTableOptions): number {
  const marginX = opts.marginX ?? 40;
  let y = opts.startY;

  function drawHeaderRow() {
    doc.setFillColor(...NAVY);
    doc.rect(marginX, y, opts.colWidths.reduce((a, b) => a + b, 0), ROW_H, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    let x = marginX;
    opts.head.forEach((h, i) => {
      doc.text(h, x + 4, y + 11);
      x += opts.colWidths[i];
    });
    y += ROW_H;
  }

  drawHeaderRow();

  opts.rows.forEach((row, ri) => {
    if (y + ROW_H > opts.pageHeight - 40) {
      doc.addPage();
      y = 40;
      drawHeaderRow();
    }
    if (ri % 2 === 0) {
      doc.setFillColor(245, 246, 248);
      doc.rect(marginX, y, opts.colWidths.reduce((a, b) => a + b, 0), ROW_H, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    let x = marginX;
    row.forEach((cell, i) => {
      if (/^[+-]?\d/.test(cell) && cell.trim().endsWith("%")) {
        doc.setTextColor(...(cell.trim().startsWith("-") ? RED : GREEN));
      } else {
        doc.setTextColor(40, 40, 40);
      }
      doc.text(cell, x + 4, y + 11);
      x += opts.colWidths[i];
    });
    y += ROW_H;
  });

  return y;
}
