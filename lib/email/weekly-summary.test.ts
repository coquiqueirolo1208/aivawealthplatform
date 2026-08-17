import { describe, expect, it } from "vitest";
import { buildWeeklySummaryHtml } from "./weekly-summary";

describe("buildWeeklySummaryHtml", () => {
  const base = {
    advisorName: "Test Advisor",
    weekLabel: "17 de agosto de 2026",
    appUrl: "https://app.example.com",
  };

  it("shows an all-clear message when every radar count is zero", () => {
    const html = buildWeeklySummaryHtml({
      ...base,
      radar: { tareasVencidas: 0, documentosPendientes: 0, atrasos: 0, riesgo: 0 },
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
      radar: { tareasVencidas: 3, documentosPendientes: 0, atrasos: 1, riesgo: 0 },
      upcomingTasks: [{ clientName: "Andrés Silva", title: "Firmar KYC", due: "2026-08-20" }],
      upcomingBirthdays: [{ clientName: "Lucía Gómez", daysUntil: 0 }],
    });
    expect(html).toContain("Tareas vencidas");
    expect(html).toContain(">3<");
    expect(html).not.toContain("Documentación pendiente"); // zero-count rows are filtered out
    expect(html).toContain("Andrés Silva");
    expect(html).toContain("Firmar KYC");
    expect(html).toContain("Lucía Gómez");
    expect(html).toContain("hoy");
  });

  it("escapes HTML in user-provided names and titles", () => {
    const html = buildWeeklySummaryHtml({
      ...base,
      radar: { tareasVencidas: 0, documentosPendientes: 0, atrasos: 0, riesgo: 0 },
      upcomingTasks: [{ clientName: "<script>alert(1)</script>", title: "x", due: "2026-08-20" }],
      upcomingBirthdays: [],
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("includes the app link", () => {
    const html = buildWeeklySummaryHtml({
      ...base,
      radar: { tareasVencidas: 0, documentosPendientes: 0, atrasos: 0, riesgo: 0 },
      upcomingTasks: [],
      upcomingBirthdays: [],
    });
    expect(html).toContain("https://app.example.com/oficina");
  });
});
