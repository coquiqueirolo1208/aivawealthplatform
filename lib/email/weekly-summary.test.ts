import { describe, expect, it } from "vitest";
import { buildWeeklySummaryHtml, type WeeklyRadarCounts } from "./weekly-summary";

const ZERO: WeeklyRadarCounts = {
  tareasVencidas: 0,
  documentosPendientes: 0,
  atrasos: 0,
  riesgo: 0,
  usSitus: 0,
  todPendiente: 0,
  sinContacto: 0,
  fondeoPendiente: 0,
};

describe("buildWeeklySummaryHtml", () => {
  const base = {
    advisorName: "Test Advisor",
    weekLabel: "17 de agosto de 2026",
    appUrl: "https://app.example.com",
  };

  it("shows an all-clear message when every radar count is zero", () => {
    const html = buildWeeklySummaryHtml({
      ...base,
      radar: ZERO,
      upcomingTasks: [],
      upcomingBirthdays: [],
    });
    expect(html).toContain("Todo en orden");
    expect(html).toContain("Sin tareas con vencimiento esta semana.");
    expect(html).toContain("Sin cumpleaños esta semana.");
  });

  it("renders non-zero radar counts and lists tasks/birthdays", () => {
    const html = buildWeeklySummaryHtml({
      ...base,
      radar: { ...ZERO, tareasVencidas: 3, atrasos: 1 },
      upcomingTasks: [{ clientName: "Andrés Silva", title: "Firmar KYC", due: "2026-08-20" }],
      upcomingBirthdays: [{ clientName: "Lucía Gómez", daysUntil: 0 }],
    });
    expect(html).toContain("Tareas vencidas");
    expect(html).toContain(">3<");
    expect(html).not.toContain("Documentación pendiente"); // zero-count rows are filtered out
    expect(html).toContain("Andrés Silva");
    expect(html).toContain("Firmar KYC");
    expect(html).toContain("vence 20/08/2026");
    expect(html).toContain("Lucía Gómez");
    expect(html).toContain("hoy");
  });

  it("includes the categories added after the first four (TOD, US-situs, contact, funding)", () => {
    const html = buildWeeklySummaryHtml({
      ...base,
      radar: { ...ZERO, usSitus: 1, todPendiente: 2, sinContacto: 4, fondeoPendiente: 1 },
      upcomingTasks: [],
      upcomingBirthdays: [],
    });
    expect(html).not.toContain("Todo en orden");
    expect(html).toContain("US state tax");
    expect(html).toContain("Transfer on Death pendiente");
    expect(html).toContain("sin contacto reciente");
    expect(html).toContain("Fondeo pendiente");
  });

  it("escapes HTML in user-provided names and titles", () => {
    const html = buildWeeklySummaryHtml({
      ...base,
      radar: ZERO,
      upcomingTasks: [{ clientName: "<script>alert(1)</script>", title: "x", due: "2026-08-20" }],
      upcomingBirthdays: [],
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("includes the app link", () => {
    const html = buildWeeklySummaryHtml({
      ...base,
      radar: ZERO,
      upcomingTasks: [],
      upcomingBirthdays: [],
    });
    expect(html).toContain("https://app.example.com/oficina");
  });
});
