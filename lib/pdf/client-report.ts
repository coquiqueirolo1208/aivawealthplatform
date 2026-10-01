// Client-facing PDF report (v2). Drawn by hand with jsPDF — no table/chart plugins —
// so it runs both in the browser (download) and in Node (tests/previews).
import type { jsPDF } from "jspdf";
import { fmtDate, fmtPct, fmtUSD } from "@/lib/format";
import type { ClientReportData } from "@/lib/reports/client-report";

type RGB = [number, number, number];
const NAVY: RGB = [19, 31, 56];
const GOLD: RGB = [185, 151, 91];
const CREAM: RGB = [246, 242, 234];
const INK: RGB = [33, 37, 41];
const MUTED: RGB = [110, 117, 128];
const LINE: RGB = [221, 224, 229];
const GREEN: RGB = [26, 122, 76];
const RED: RGB = [176, 52, 31];
const ZEBRA: RGB = [247, 248, 250];
const ALLOC_COLORS: RGB[] = [NAVY, GOLD, [47, 111, 115], [120, 134, 160], [210, 190, 150], RED, [150, 150, 150], [90, 70, 120]];

const PAGE_W = 595.28; // A4, points
const PAGE_H = 841.89;
const MX = 40;
const CONTENT_W = PAGE_W - MX * 2;
const FOOTER_SPACE = 46;

const MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export interface ReportSections {
  evolucion: boolean;
  asignacion: boolean;
  cuentas: boolean;
  posiciones: boolean;
  movimientos: boolean;
}

export interface ClientReportOptions {
  advisorName: string | null;
  /** Data URL + format of the advisor's logo, already fetched. */
  logo: { dataUrl: string; format: "PNG" | "JPEG" } | null;
  comment: string;
  sections: ReportSections;
  /** YYYY-MM-DD the report is generated on. */
  generatedOn: string;
}

function monthShort(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTHS_ES[Number(m) - 1]}-${y.slice(2)}`;
}

function monthLong(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTHS_ES[Number(m) - 1]} ${y}`;
}

/** Last calendar day of a YYYY-MM month, as dd/mm/yyyy. */
export function endOfMonthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return fmtDate(`${ym}-${String(last).padStart(2, "0")}`);
}

function compactUSD(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) return `$${(n / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
  if (a >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

/** Signed USD amount ("+$12,345" / "-$12,345"). */
function fmtSignedUSD(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return (n >= 0 ? "+" : "-") + fmtUSD(Math.abs(n));
}

function pctRgb(n: number | null): RGB {
  if (n == null || !Number.isFinite(n)) return MUTED;
  return n >= 0 ? GREEN : RED;
}

export function buildClientReportPdf(JsPDF: typeof jsPDF, data: ClientReportData, opts: ClientReportOptions): jsPDF {
  const doc = new JsPDF({ unit: "pt", format: "a4" });
  let y = 0;

  const setText = (rgb: RGB, size: number, style: "normal" | "bold" = "normal") => {
    doc.setTextColor(...rgb);
    doc.setFontSize(size);
    doc.setFont("helvetica", style);
  };

  /** Cuts text with "..." so it fits in maxW at the current font. */
  const fit = (text: string, maxW: number): string => {
    if (doc.getTextWidth(text) <= maxW) return text;
    let t = text;
    while (t.length > 1 && doc.getTextWidth(t + "...") > maxW) t = t.slice(0, -1);
    return t.trimEnd() + "...";
  };

  function continuationHeader() {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, PAGE_W, 34, "F");
    setText([255, 255, 255], 9, "bold");
    doc.text(fit(data.clientName, 300), MX, 21);
    setText([220, 210, 190], 9);
    doc.text(`Reporte patrimonial al ${endOfMonthLabel(data.asOfMonth)}`, PAGE_W - MX, 21, { align: "right" });
    y = 58;
  }

  function newPage() {
    doc.addPage();
    continuationHeader();
  }

  /** Starts a new page unless `h` points still fit above the footer. */
  function ensure(h: number) {
    if (y + h > PAGE_H - FOOTER_SPACE) newPage();
  }

  function sectionTitle(title: string, minBody = 60) {
    ensure(26 + minBody);
    setText(NAVY, 12, "bold");
    doc.text(title, MX, y);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(1.2);
    doc.line(MX, y + 5, MX + 28, y + 5);
    y += 20;
  }

  interface Col {
    header: string;
    width: number;
    align?: "left" | "right";
    /** Color the cell green/red by sign. */
    signed?: boolean;
  }

  function table(cols: Col[], rows: Array<Array<string>>, rawSigns?: Array<Array<number | null>>) {
    const ROW_H = 17;
    const header = () => {
      doc.setFillColor(...NAVY);
      doc.rect(MX, y, CONTENT_W, ROW_H, "F");
      setText([255, 255, 255], 8, "bold");
      let x = MX;
      cols.forEach((c) => {
        if (c.align === "right") doc.text(c.header, x + c.width - 5, y + 11.5, { align: "right" });
        else doc.text(c.header, x + 5, y + 11.5);
        x += c.width;
      });
      y += ROW_H;
    };
    ensure(ROW_H * 3);
    header();
    rows.forEach((row, ri) => {
      if (y + ROW_H > PAGE_H - FOOTER_SPACE) {
        newPage();
        header();
      }
      if (ri % 2 === 1) {
        doc.setFillColor(...ZEBRA);
        doc.rect(MX, y, CONTENT_W, ROW_H, "F");
      }
      let x = MX;
      row.forEach((cell, ci) => {
        const c = cols[ci];
        const sign = rawSigns?.[ri]?.[ci];
        setText(c.signed ? pctRgb(sign ?? null) : INK, 8.5, ci === 0 ? "bold" : "normal");
        const text = fit(cell, c.width - 10);
        if (c.align === "right") doc.text(text, x + c.width - 5, y + 11.5, { align: "right" });
        else doc.text(text, x + 5, y + 11.5);
        x += c.width;
      });
      y += ROW_H;
    });
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.5);
    doc.line(MX, y, MX + CONTENT_W, y);
    y += 8;
  }

  // ---- Cover band -------------------------------------------------------
  const bandH = 104;
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, bandH, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, bandH, PAGE_W, 3, "F");
  let textX = MX;
  if (opts.logo) {
    // Fit the advisor's logo inside a box without distorting its shape.
    const props = doc.getImageProperties(opts.logo.dataUrl);
    const scale = Math.min(130 / props.width, 56 / props.height);
    const w = props.width * scale;
    const h = props.height * scale;
    doc.addImage(opts.logo.dataUrl, opts.logo.format, MX, (bandH - h) / 2, w, h, undefined, "FAST");
    textX = MX + w + 18;
  }
  setText([220, 210, 190], 9, "bold");
  doc.text("REPORTE PATRIMONIAL", textX, 38);
  setText([255, 255, 255], 19, "bold");
  doc.text(fit(data.clientName, PAGE_W - textX - 170), textX, 62);
  setText([220, 210, 190], 9);
  doc.text("Valores consolidados en USD", textX, 80);
  setText([255, 255, 255], 9);
  doc.text("Fecha de corte", PAGE_W - MX, 38, { align: "right" });
  setText([255, 255, 255], 15, "bold");
  doc.text(endOfMonthLabel(data.asOfMonth), PAGE_W - MX, 58, { align: "right" });
  if (opts.advisorName) {
    setText([220, 210, 190], 9);
    doc.text(fit(`Asesor: ${opts.advisorName}`, 200), PAGE_W - MX, 80, { align: "right" });
  }
  y = bandH + 26;

  // ---- Key figures -------------------------------------------------------
  function kpiRow(cards: Array<{ label: string; value: string; rgb?: RGB; sub?: string }>, h: number) {
    const gap = 10;
    const w = (CONTENT_W - gap * (cards.length - 1)) / cards.length;
    cards.forEach((c, i) => {
      const x = MX + i * (w + gap);
      doc.setFillColor(...CREAM);
      doc.roundedRect(x, y, w, h, 4, 4, "F");
      setText(MUTED, 7.5, "bold");
      doc.text(c.label.toUpperCase(), x + 10, y + 16);
      setText(c.rgb ?? INK, 15, "bold");
      doc.text(fit(c.value, w - 20), x + 10, y + 37);
      if (c.sub) {
        setText(MUTED, 7.5);
        doc.text(fit(c.sub, w - 20), x + 10, y + h - 9);
      }
    });
    y += h + 10;
  }

  const benchSub = (v: number | null | undefined) => (data.benchmark && v != null ? `Benchmark: ${fmtPct(v)}` : undefined);
  const hasBench = !!data.benchmark && (data.benchmark.mtd != null || data.benchmark.ytd != null);
  kpiRow(
    [
      { label: "Patrimonio total", value: fmtUSD(data.total), sub: `${data.accounts.length} cuenta${data.accounts.length === 1 ? "" : "s"}` },
      { label: `Rentab. ${monthLong(data.asOfMonth)}`, value: fmtPct(data.mtd), rgb: pctRgb(data.mtd), sub: benchSub(data.benchmark?.mtd) },
      { label: `Rentab. ${data.asOfMonth.slice(0, 4)}`, value: fmtPct(data.ytd), rgb: pctRgb(data.ytd), sub: benchSub(data.benchmark?.ytd) },
      { label: "Rentab. 12 meses", value: fmtPct(data.y1), rgb: pctRgb(data.y1) },
    ],
    hasBench ? 60 : 50,
  );
  kpiRow(
    [
      { label: "Resultado del año", value: fmtSignedUSD(data.resultadoYTD), rgb: pctRgb(data.resultadoYTD) },
      { label: "Aportes / retiros netos del año", value: fmtSignedUSD(data.flujosYTD) },
      {
        label: "Costos del año",
        value: data.costosYTD == null ? "—" : fmtUSD(data.costosYTD),
        sub: data.costosYTD != null && !data.costosCompletos ? "Faltan meses: cifra parcial" : undefined,
      },
    ],
    50,
  );

  // ---- Advisor comment -------------------------------------------------------
  const comment = opts.comment.trim();
  if (comment) {
    setText(INK, 9.5);
    const lines: string[] = doc.splitTextToSize(comment, CONTENT_W - 28);
    const h = 30 + lines.length * 13;
    ensure(h + 10);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.8);
    doc.roundedRect(MX, y, CONTENT_W, h, 4, 4, "FD");
    doc.setFillColor(...GOLD);
    doc.rect(MX, y, 3, h, "F");
    setText(NAVY, 9, "bold");
    doc.text("Comentario del asesor", MX + 14, y + 17);
    setText(INK, 9.5);
    doc.text(lines, MX + 14, y + 32);
    y += h + 16;
  } else {
    y += 6;
  }

  // ---- Evolution chart -------------------------------------------------------
  if (opts.sections.evolucion && data.evolution.length >= 2) {
    sectionTitle("Evolución del patrimonio", 170);
    const chartH = 150;
    const left = MX + 46;
    const right = MX + CONTENT_W - 6;
    const top = y + 4;
    const bottom = top + chartH;
    const vals = data.evolution.map((p) => p.value);
    let lo = Math.min(...vals);
    let hi = Math.max(...vals);
    const pad = (hi - lo) * 0.12 || hi * 0.05 || 1;
    lo = Math.max(0, lo - pad);
    hi = hi + pad;
    const xAt = (i: number) => left + (i * (right - left)) / (data.evolution.length - 1);
    const yAt = (v: number) => bottom - ((v - lo) / (hi - lo)) * chartH;

    // Gridlines + y-axis labels
    doc.setLineWidth(0.4);
    for (let g = 0; g <= 4; g++) {
      const v = lo + ((hi - lo) * g) / 4;
      const gy = yAt(v);
      doc.setDrawColor(...LINE);
      doc.line(left, gy, right, gy);
      setText(MUTED, 7);
      doc.text(compactUSD(v), left - 6, gy + 2.5, { align: "right" });
    }
    // Area under the line (polygon down to the baseline), then the line itself
    const pts = data.evolution.map((p, i) => [xAt(i), yAt(p.value)] as const);
    const deltas: number[][] = [];
    for (let i = 1; i < pts.length; i++) deltas.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
    deltas.push([0, bottom - pts[pts.length - 1][1]], [pts[0][0] - pts[pts.length - 1][0], 0]);
    doc.setFillColor(236, 228, 212);
    doc.lines(deltas, pts[0][0], pts[0][1], [1, 1], "F", true);
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(1.6);
    for (let i = 1; i < pts.length; i++) doc.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
    doc.setFillColor(...GOLD);
    doc.circle(pts[pts.length - 1][0], pts[pts.length - 1][1], 2.8, "F");
    // x-axis labels, thinned and counted back from the last month so they never overlap
    const step = Math.ceil(data.evolution.length / 7);
    const last = data.evolution.length - 1;
    setText(MUTED, 7);
    data.evolution.forEach((p, i) => {
      if ((last - i) % step === 0) doc.text(monthShort(p.month), xAt(i), bottom + 12, { align: "center" });
    });
    y = bottom + 30;
  }

  // ---- Allocation -------------------------------------------------------
  if (opts.sections.asignacion && data.allocation.length) {
    const legendRows = Math.ceil(data.allocation.length / 2);
    sectionTitle("Asignación de activos", 30 + legendRows * 16);
    let x = MX;
    data.allocation.forEach((a, i) => {
      const w = (a.pct / 100) * CONTENT_W;
      doc.setFillColor(...ALLOC_COLORS[i % ALLOC_COLORS.length]);
      doc.rect(x, y, w, 14, "F");
      x += w;
    });
    y += 28;
    const colW = CONTENT_W / 2;
    data.allocation.forEach((a, i) => {
      const lx = MX + (i % 2) * colW;
      const ly = y + Math.floor(i / 2) * 16;
      doc.setFillColor(...ALLOC_COLORS[i % ALLOC_COLORS.length]);
      doc.rect(lx, ly - 7, 8, 8, "F");
      setText(INK, 9);
      doc.text(fit(a.tipo, 120), lx + 14, ly);
      setText(INK, 9, "bold");
      doc.text(`${a.pct.toFixed(1)}%`, lx + 160, ly, { align: "right" });
      setText(MUTED, 9);
      doc.text(fmtUSD(a.valor), lx + colW - 16, ly, { align: "right" });
    });
    y += legendRows * 16 + 14;
  }

  // ---- Accounts -------------------------------------------------------
  if (opts.sections.cuentas) {
    sectionTitle("Detalle por cuenta");
    table(
      [
        { header: "Cuenta", width: 120 },
        { header: "Custodio", width: 85 },
        { header: "Al", width: 45 },
        { header: "Valor", width: 80, align: "right" },
        { header: "% total", width: 41, align: "right" },
        { header: "Mes", width: 48, align: "right", signed: true },
        { header: "Año", width: 48, align: "right", signed: true },
        { header: "12 m", width: 48, align: "right", signed: true },
      ],
      data.accounts.map((a) => [
        a.label,
        a.custodian ?? "—",
        monthShort(a.month),
        fmtUSD(a.valor),
        a.pct == null ? "—" : `${a.pct.toFixed(1)}%`,
        fmtPct(a.mtd),
        fmtPct(a.ytd),
        fmtPct(a.y1),
      ]),
      data.accounts.map((a) => [null, null, null, null, null, a.mtd, a.ytd, a.y1]),
    );
    if (data.accounts.some((a) => a.month !== data.asOfMonth)) {
      setText(MUTED, 7.5);
      doc.text("Las cuentas sin estado al mes de corte se muestran con su último estado disponible (columna \"Al\").", MX, y + 2);
      y += 12;
    }
    y += 10;
  }

  // ---- Positions -------------------------------------------------------
  if (opts.sections.posiciones && data.positions.length) {
    sectionTitle("Principales posiciones");
    table(
      [
        { header: "Activo", width: 265 },
        { header: "Valor", width: 90, align: "right" },
        { header: "% cartera", width: 60, align: "right" },
        { header: "Mes", width: 50, align: "right", signed: true },
        { header: "Año", width: 50, align: "right", signed: true },
      ],
      data.positions.map((p) => [p.name, fmtUSD(p.valor), p.pct == null ? "—" : `${p.pct.toFixed(1)}%`, fmtPct(p.mtd), fmtPct(p.ytd)]),
      data.positions.map((p) => [null, null, null, p.mtd, p.ytd]),
    );
    setText(MUTED, 7.5);
    const more = data.positionsCount - data.positions.length;
    doc.text(
      (more > 0 ? `Se muestran las ${data.positions.length} principales de ${data.positionsCount} posiciones. ` : "") +
        "La variación por posición compara su valor de mercado y no descuenta compras o ventas parciales.",
      MX,
      y + 2,
    );
    y += 22;
  }

  // ---- Movements -------------------------------------------------------
  if (opts.sections.movimientos && (data.compras.length || data.ventas.length)) {
    sectionTitle(`Cambios de cartera en ${monthLong(data.asOfMonth)}`);
    const block = (title: string, rows: ClientReportData["compras"]) => {
      if (!rows.length) return;
      setText(INK, 9, "bold");
      ensure(60);
      doc.text(title, MX, y);
      y += 8;
      table(
        [
          { header: "Activo", width: 265 },
          { header: "Cuenta", width: 150 },
          { header: "Valor", width: 100, align: "right" },
        ],
        rows.map((r) => [r.nombre, r.account, fmtUSD(r.valor)]),
      );
      y += 6;
    };
    block("Posiciones nuevas", data.compras);
    block("Posiciones cerradas", data.ventas);
  }

  // ---- Notes -------------------------------------------------------
  const notes = [
    "Valores en dólares estadounidenses (USD). Las cuentas en otras monedas se convierten al tipo de cambio de cada mes.",
    "Las rentabilidades descuentan aportes y retiros del período y se ponderan por el valor de cada cuenta. " +
      "El resultado del año es la variación de valor neta de aportes y retiros desde el 31/12 anterior.",
    hasBench ? "Benchmark: combinación de MSCI World y Bloomberg Global Aggregate según el perfil acordado." : "",
    "La información surge de los estados de cuenta emitidos por cada custodio; ante cualquier diferencia prevalecen dichos estados. " +
      "Este reporte es informativo y no constituye una recomendación de inversión. Rentabilidades pasadas no garantizan resultados futuros.",
  ].filter(Boolean);
  setText(MUTED, 7.5);
  const noteLines: string[] = notes.flatMap((n) => doc.splitTextToSize(n, CONTENT_W));
  ensure(20 + noteLines.length * 10);
  setText(NAVY, 8.5, "bold");
  doc.text("Notas", MX, y + 4);
  setText(MUTED, 7.5);
  doc.text(noteLines, MX, y + 18);

  // ---- Footer on every page -------------------------------------------------------
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.5);
    doc.line(MX, PAGE_H - 30, PAGE_W - MX, PAGE_H - 30);
    setText(MUTED, 7.5);
    const left = [opts.advisorName ? `Preparado por ${opts.advisorName}` : null, `Emitido el ${fmtDate(opts.generatedOn)}`]
      .filter(Boolean)
      .join("  ·  ");
    doc.text(left, MX, PAGE_H - 18);
    doc.text(`Página ${i} de ${pages}`, PAGE_W - MX, PAGE_H - 18, { align: "right" });
  }
  return doc;
}

export function clientReportFilename(data: ClientReportData): string {
  const name = data.clientName.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
  return `Reporte_${name}_${data.asOfMonth}.pdf`;
}
